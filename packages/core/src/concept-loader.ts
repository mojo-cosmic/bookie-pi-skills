import { isAlias, isMap, isNode, isScalar, isSeq, parseDocument } from "yaml";
import type { Node, ParsedNode } from "yaml";

export const DEFAULT_MAX_CONCEPT_BYTES = 1_048_576;
export const DEFAULT_MAX_YAML_DEPTH = 64;

export type ConceptDiagnosticCode =
  | "CONCEPT-SIZE"
  | "CONCEPT-UTF8"
  | "FRONTMATTER-OPEN"
  | "FRONTMATTER-CLOSE"
  | "YAML-SYNTAX"
  | "YAML-UNSUPPORTED"
  | "YAML-ROOT";

export type DiagnosticSeverity = "error" | "warning";

export interface SourcePosition {
  readonly byteOffset: number;
  readonly line: number;
  readonly column: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface ConceptDiagnostic {
  readonly code: ConceptDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly file: string;
  readonly message: string;
  readonly remediation: string;
  readonly range?: SourceRange;
}

export interface LoadedConcept {
  readonly file: string;
  readonly rawText: string;
  readonly frontmatterText: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly bodyText: string;
}

export interface LoadConceptOptions {
  readonly file: string;
  readonly maxBytes?: number;
  readonly maxDepth?: number;
}

export type LoadConceptResult =
  | {
      readonly ok: true;
      readonly concept: LoadedConcept;
      readonly diagnostics: readonly ConceptDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ConceptDiagnostic[];
    };

interface FrontmatterEnvelope {
  readonly contentStart: number;
  readonly contentEnd: number;
  readonly bodyStart: number;
}

interface UnsupportedNode {
  readonly node: Node;
}

interface LoadedConceptState {
  readonly document: ReturnType<typeof parseDocument>;
  readonly envelope: FrontmatterEnvelope;
  readonly sourceBytes: Uint8Array;
}

const loadedConceptStates = new WeakMap<LoadedConcept, LoadedConceptState>();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const encoder = new TextEncoder();
const allowedExplicitTags = new Set([
  "tag:yaml.org,2002:bool",
  "tag:yaml.org,2002:float",
  "tag:yaml.org,2002:int",
  "tag:yaml.org,2002:map",
  "tag:yaml.org,2002:null",
  "tag:yaml.org,2002:seq",
  "tag:yaml.org,2002:str",
]);

const messages: Record<ConceptDiagnosticCode, string> = {
  "CONCEPT-SIZE": "Concept exceeds the configured byte limit.",
  "CONCEPT-UTF8": "Concept is not valid UTF-8.",
  "FRONTMATTER-OPEN":
    "Concept must begin with an exact YAML frontmatter delimiter.",
  "FRONTMATTER-CLOSE":
    "Concept YAML frontmatter has no exact closing delimiter.",
  "YAML-SYNTAX": "YAML frontmatter is malformed.",
  "YAML-UNSUPPORTED":
    "YAML frontmatter uses an unsupported feature or exceeds a structural limit.",
  "YAML-ROOT": "YAML frontmatter root must be a mapping.",
};

const remediations: Record<ConceptDiagnosticCode, string> = {
  "CONCEPT-SIZE": "Reduce the concept size below the configured limit.",
  "CONCEPT-UTF8": "Save the complete Markdown concept as valid UTF-8.",
  "FRONTMATTER-OPEN": "Place an unindented --- line at byte zero.",
  "FRONTMATTER-CLOSE": "Add an unindented --- line after the YAML mapping.",
  "YAML-SYNTAX":
    "Correct the YAML 1.2 syntax, duplicate key, or non-string key.",
  "YAML-UNSUPPORTED":
    "Use YAML 1.2 core values without aliases, custom tags, unsafe integers, or excessive nesting.",
  "YAML-ROOT": "Replace the frontmatter value with a string-keyed mapping.",
};

function diagnostic(
  code: ConceptDiagnosticCode,
  file: string,
  range?: SourceRange,
): ConceptDiagnostic {
  return {
    code,
    severity: "error",
    file,
    message: messages[code],
    remediation: remediations[code],
    ...(range === undefined ? {} : { range }),
  };
}

function fail(
  code: ConceptDiagnosticCode,
  file: string,
  range?: SourceRange,
): LoadConceptResult {
  return { ok: false, diagnostics: [diagnostic(code, file, range)] };
}

function validateLimit(
  name: string,
  value: number | undefined,
  maximum: number,
): number {
  if (value === undefined) return maximum;
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new TypeError(
      `${name} must be a positive integer no greater than ${maximum}`,
    );
  }
  return value;
}

function hasOpeningDelimiter(bytes: Uint8Array): boolean {
  return (
    (bytes[0] === 0x2d &&
      bytes[1] === 0x2d &&
      bytes[2] === 0x2d &&
      bytes[3] === 0x0a) ||
    (bytes[0] === 0x2d &&
      bytes[1] === 0x2d &&
      bytes[2] === 0x2d &&
      bytes[3] === 0x0d &&
      bytes[4] === 0x0a)
  );
}

function findEnvelope(source: string): FrontmatterEnvelope | undefined {
  const contentStart = source.startsWith("---\r\n") ? 5 : 4;
  let lineStart = contentStart;

  while (lineStart <= source.length) {
    const newline = source.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? source.length : newline;
    const contentEnd =
      lineEnd > lineStart && source.charCodeAt(lineEnd - 1) === 0x0d
        ? lineEnd - 1
        : lineEnd;

    if (source.slice(lineStart, contentEnd) === "---") {
      return {
        contentStart,
        contentEnd: lineStart,
        bodyStart: newline === -1 ? source.length : newline + 1,
      };
    }

    if (newline === -1) return undefined;
    lineStart = newline + 1;
  }

  return undefined;
}

function positionAt(source: string, offset: number): SourcePosition {
  const boundedOffset = Math.max(0, Math.min(offset, source.length));
  const prefix = source.slice(0, boundedOffset);
  const lastNewline = prefix.lastIndexOf("\n");
  const line = prefix.split("\n").length;
  const linePrefix = prefix.slice(lastNewline + 1);

  return {
    byteOffset: encoder.encode(prefix).byteLength,
    line,
    column: [...linePrefix].length + 1,
  };
}

function sourceRange(
  source: string,
  yamlStart: number,
  relativeStart: number,
  relativeEnd: number,
  relativeLimit = source.length - yamlStart,
): SourceRange {
  const boundedStart = Math.max(0, Math.min(relativeStart, relativeLimit));
  const boundedEnd = Math.max(
    boundedStart,
    Math.min(relativeEnd, relativeLimit),
  );
  return {
    start: positionAt(source, yamlStart + boundedStart),
    end: positionAt(source, yamlStart + boundedEnd),
  };
}

function nodeRange(
  source: string,
  yamlStart: number,
  yamlLength: number,
  node: Node | null,
): SourceRange | undefined {
  const range = node?.range;
  return range === undefined || range === null
    ? undefined
    : sourceRange(source, yamlStart, range[0], range[2], yamlLength);
}

function findUnsupportedNode(
  root: ParsedNode,
  maxDepth: number,
): UnsupportedNode | undefined {
  const stack: Array<{ node: Node; depth: number }> = [
    { node: root, depth: 1 },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const { node, depth } = current;

    if (depth > maxDepth || isAlias(node)) return { node };
    if (
      node.tag !== undefined &&
      node.tag !== null &&
      !allowedExplicitTags.has(node.tag)
    ) {
      return { node };
    }
    if (isScalar(node)) {
      if (
        typeof node.value === "bigint" &&
        (node.value > BigInt(Number.MAX_SAFE_INTEGER) ||
          node.value < BigInt(Number.MIN_SAFE_INTEGER))
      ) {
        return { node };
      }
      if (
        typeof node.value === "number" &&
        (!Number.isFinite(node.value) ||
          (Number.isInteger(node.value) && !Number.isSafeInteger(node.value)))
      ) {
        return { node };
      }
    }

    if (isMap(node)) {
      for (const pair of node.items) {
        if (isNode(pair.key)) stack.push({ node: pair.key, depth });
        if (isNode(pair.value)) {
          stack.push({
            node: pair.value,
            depth: isMap(pair.value) || isSeq(pair.value) ? depth + 1 : depth,
          });
        }
      }
    } else if (isSeq(node)) {
      for (const item of node.items) {
        if (isNode(item)) {
          stack.push({
            node: item,
            depth: isMap(item) || isSeq(item) ? depth + 1 : depth,
          });
        }
      }
    }
  }

  return undefined;
}

function normalizeBigInts(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = normalizeBigInts(value[index]);
    }
    return value;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(value, key, {
        value: normalizeBigInts(child),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }
  return value;
}

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  Object.freeze(value);
}

export function loadConcept(
  input: Uint8Array,
  options: LoadConceptOptions,
): LoadConceptResult {
  const maxBytes = validateLimit(
    "maxBytes",
    options.maxBytes,
    DEFAULT_MAX_CONCEPT_BYTES,
  );
  const maxDepth = validateLimit(
    "maxDepth",
    options.maxDepth,
    DEFAULT_MAX_YAML_DEPTH,
  );

  if (input.byteLength > maxBytes) {
    return fail("CONCEPT-SIZE", options.file);
  }

  const sourceBytes = Uint8Array.from(input);
  let source: string;
  try {
    source = decoder.decode(sourceBytes);
  } catch {
    return fail("CONCEPT-UTF8", options.file);
  }

  if (!hasOpeningDelimiter(sourceBytes)) {
    return fail(
      "FRONTMATTER-OPEN",
      options.file,
      sourceRange(source, 0, 0, Math.min(source.length, 3)),
    );
  }

  const envelope = findEnvelope(source);
  if (envelope === undefined) {
    const end = positionAt(source, source.length);
    return fail("FRONTMATTER-CLOSE", options.file, { start: end, end });
  }

  const frontmatterText = source.slice(
    envelope.contentStart,
    envelope.contentEnd,
  );
  const versionDirective =
    /^%YAML[\t ]+([^\t #\r\n]+)[\t ]*(?:#[^\r\n]*)?(?:\r?\n|$)/m.exec(
      frontmatterText,
    );
  if (versionDirective !== null && versionDirective[1] !== "1.2") {
    return fail(
      "YAML-UNSUPPORTED",
      options.file,
      sourceRange(
        source,
        envelope.contentStart,
        versionDirective.index,
        versionDirective.index + versionDirective[0].trimEnd().length,
        frontmatterText.length,
      ),
    );
  }

  let document;
  try {
    document = parseDocument(frontmatterText, {
      intAsBigInt: true,
      keepSourceTokens: true,
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "core",
      strict: true,
      stringKeys: true,
      uniqueKeys: true,
      version: "1.2",
    });
  } catch {
    return fail("YAML-UNSUPPORTED", options.file);
  }

  const parseError = document.errors[0];
  if (parseError !== undefined) {
    return fail(
      parseError.code === "RESOURCE_EXHAUSTION"
        ? "YAML-UNSUPPORTED"
        : "YAML-SYNTAX",
      options.file,
      sourceRange(
        source,
        envelope.contentStart,
        parseError.pos[0],
        parseError.pos[1],
        frontmatterText.length,
      ),
    );
  }

  if (
    document.directives.yaml.version !== "1.2" ||
    document.warnings.length > 0
  ) {
    const warning = document.warnings[0];
    const range =
      warning === undefined
        ? sourceRange(
            source,
            envelope.contentStart,
            0,
            0,
            frontmatterText.length,
          )
        : sourceRange(
            source,
            envelope.contentStart,
            warning.pos[0],
            warning.pos[1],
            frontmatterText.length,
          );
    return fail("YAML-UNSUPPORTED", options.file, range);
  }

  if (!isMap(document.contents)) {
    return fail(
      "YAML-ROOT",
      options.file,
      nodeRange(
        source,
        envelope.contentStart,
        frontmatterText.length,
        document.contents,
      ),
    );
  }

  const unsupported = findUnsupportedNode(document.contents, maxDepth);
  if (unsupported !== undefined) {
    return fail(
      "YAML-UNSUPPORTED",
      options.file,
      nodeRange(
        source,
        envelope.contentStart,
        frontmatterText.length,
        unsupported.node,
      ),
    );
  }

  let frontmatter: unknown;
  try {
    frontmatter = normalizeBigInts(document.toJS({ maxAliasCount: 0 }));
  } catch {
    return fail("YAML-UNSUPPORTED", options.file);
  }
  if (
    frontmatter === null ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  ) {
    return fail(
      "YAML-ROOT",
      options.file,
      nodeRange(
        source,
        envelope.contentStart,
        frontmatterText.length,
        document.contents,
      ),
    );
  }
  deepFreeze(frontmatter);

  const concept: LoadedConcept = Object.freeze({
    file: options.file,
    rawText: source,
    frontmatterText,
    frontmatter: frontmatter as Readonly<Record<string, unknown>>,
    bodyText: source.slice(envelope.bodyStart),
  });
  loadedConceptStates.set(concept, {
    document,
    envelope,
    sourceBytes,
  });

  return { ok: true, concept, diagnostics: [] };
}

export function serializeConcept(concept: LoadedConcept): Uint8Array {
  const state = loadedConceptStates.get(concept);
  if (state === undefined) {
    throw new TypeError(
      "serializeConcept requires a concept returned by loadConcept",
    );
  }
  return Uint8Array.from(state.sourceBytes);
}
