import { isAlias, isMap, isNode, isScalar, isSeq, parseDocument } from "yaml";
import type { Node, ParsedNode } from "yaml";

export type ReadonlyYamlScalar = string | number | boolean | null;
export type ReadonlyYamlValue =
  ReadonlyYamlScalar | readonly ReadonlyYamlValue[] | ReadonlyYamlMapping;
export interface ReadonlyYamlMapping {
  readonly [key: string]: ReadonlyYamlValue | undefined;
}

export type StrictYamlFailureCode = "root" | "syntax" | "unsupported";

export type StrictYamlMappingResult =
  | {
      readonly ok: true;
      readonly value: ReadonlyYamlMapping;
      readonly document: object;
    }
  | {
      readonly ok: false;
      readonly code: StrictYamlFailureCode;
      readonly range?: readonly [start: number, end: number];
    };

interface UnsupportedNode {
  readonly node: Node;
}

const allowedExplicitTags = new Set([
  "tag:yaml.org,2002:bool",
  "tag:yaml.org,2002:float",
  "tag:yaml.org,2002:int",
  "tag:yaml.org,2002:map",
  "tag:yaml.org,2002:null",
  "tag:yaml.org,2002:seq",
  "tag:yaml.org,2002:str",
]);

function decimalFraction(
  source: string,
): { readonly numerator: bigint; readonly denominator: bigint } | undefined {
  const normalized = source.replaceAll("_", "");
  if (normalized.length > 512) return undefined;
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/iu.exec(
    normalized,
  );
  if (match === null) return undefined;
  const fraction = match[3] ?? match[4] ?? "";
  const digits = `${match[2] ?? ""}${fraction}`.replace(/^0+(?=\d)/u, "");
  const exponent = Number(match[5] ?? "0");
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400) {
    return undefined;
  }
  let numerator = BigInt(digits === "" ? "0" : digits);
  if (match[1] === "-") numerator = -numerator;
  const scale = fraction.length - exponent;
  return scale >= 0
    ? { numerator, denominator: BigInt(10) ** BigInt(scale) }
    : {
        numerator: numerator * BigInt(10) ** BigInt(-scale),
        denominator: BigInt(1),
      };
}

function preservesDecimalValue(source: string, value: number): boolean {
  const sourceFraction = decimalFraction(source);
  const valueFraction = decimalFraction(value.toString());
  if (sourceFraction === undefined || valueFraction === undefined) return false;
  return (
    sourceFraction.numerator * valueFraction.denominator ===
    valueFraction.numerator * sourceFraction.denominator
  );
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
      if (typeof node.value === "number") {
        if (
          !Number.isFinite(node.value) ||
          (Number.isInteger(node.value) && !Number.isSafeInteger(node.value)) ||
          typeof node.source !== "string" ||
          !preservesDecimalValue(node.source, node.value)
        ) {
          return { node };
        }
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

function nodeRange(node: Node | null): readonly [number, number] | undefined {
  const range = node?.range;
  return range === undefined || range === null
    ? undefined
    : [range[0], range[2]];
}

export function parseStrictYamlMapping(
  source: string,
  maxDepth: number,
): StrictYamlMappingResult {
  const versionDirective =
    /^%YAML[\t ]+([^\t #\r\n]+)[\t ]*(?:#[^\r\n]*)?(?:\r?\n|$)/m.exec(source);
  if (versionDirective !== null && versionDirective[1] !== "1.2") {
    return {
      ok: false,
      code: "unsupported",
      range: [
        versionDirective.index,
        versionDirective.index + versionDirective[0].trimEnd().length,
      ],
    };
  }

  let document;
  try {
    document = parseDocument(source, {
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
    return { ok: false, code: "unsupported" };
  }

  const parseError = document.errors[0];
  if (parseError !== undefined) {
    return {
      ok: false,
      code:
        parseError.code === "RESOURCE_EXHAUSTION" ? "unsupported" : "syntax",
      range: [parseError.pos[0], parseError.pos[1]],
    };
  }

  if (
    document.directives.yaml.version !== "1.2" ||
    document.warnings.length > 0
  ) {
    const warning = document.warnings[0];
    return {
      ok: false,
      code: "unsupported",
      range: warning === undefined ? [0, 0] : [warning.pos[0], warning.pos[1]],
    };
  }

  if (!isMap(document.contents)) {
    const range = nodeRange(document.contents);
    return {
      ok: false,
      code: "root",
      ...(range === undefined ? {} : { range }),
    };
  }

  const unsupported = findUnsupportedNode(document.contents, maxDepth);
  if (unsupported !== undefined) {
    const range = nodeRange(unsupported.node);
    return {
      ok: false,
      code: "unsupported",
      ...(range === undefined ? {} : { range }),
    };
  }

  let value: unknown;
  try {
    value = normalizeBigInts(document.toJS({ maxAliasCount: 0 }));
  } catch {
    return { ok: false, code: "unsupported" };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    const range = nodeRange(document.contents);
    return {
      ok: false,
      code: "root",
      ...(range === undefined ? {} : { range }),
    };
  }
  deepFreeze(value);

  return {
    ok: true,
    value: value as ReadonlyYamlMapping,
    document,
  };
}
