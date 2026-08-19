import { dirname, relative, resolve, sep } from "node:path";

import { fromMarkdown } from "mdast-util-from-markdown";

import { createDiagnostic, DiagnosticCollector } from "./vault-diagnostics.js";
import type { VaultEntries } from "./vault-model.js";

interface MarkdownNode {
  readonly type: string;
  readonly url?: string;
  readonly identifier?: string;
  readonly children?: readonly MarkdownNode[];
}

function isInside(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..")
  );
}

function collectMarkdownDestinations(body: string): readonly string[] {
  const tree = fromMarkdown(body) as MarkdownNode;
  const definitions = new Map<string, string>();
  const references: string[] = [];
  const destinations: string[] = [];
  const stack: MarkdownNode[] = [tree];

  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (
      (node.type === "link" || node.type === "image") &&
      typeof node.url === "string"
    ) {
      destinations.push(node.url);
    } else if (
      node.type === "definition" &&
      typeof node.identifier === "string" &&
      typeof node.url === "string" &&
      !definitions.has(node.identifier)
    ) {
      definitions.set(node.identifier, node.url);
    } else if (
      (node.type === "linkReference" || node.type === "imageReference") &&
      typeof node.identifier === "string"
    ) {
      references.push(node.identifier);
    }
    const children = node.children ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }

  for (const identifier of references) {
    const destination = definitions.get(identifier);
    if (destination !== undefined) destinations.push(destination);
  }
  return destinations;
}

function localLinkTarget(
  destination: string,
  sourceHostPath: string,
  root: string,
): string | undefined | null {
  if (
    destination === "" ||
    destination.startsWith("#") ||
    destination.startsWith("?") ||
    destination.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(destination)
  ) {
    return undefined;
  }

  const encodedPath = destination.split(/[?#]/u, 1)[0] ?? "";
  if (encodedPath === "") return undefined;
  if (/%(?:2f|5c)/iu.test(encodedPath)) return null;
  let path: string;
  try {
    path = decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
  if (path.includes("\0") || path.includes("\\")) return null;

  const target = path.startsWith("/")
    ? resolve(root, `.${path}`)
    : resolve(dirname(sourceHostPath), path);
  if (!isInside(root, target)) return null;
  return relative(root, target).split(sep).join("/").replace(/\/$/u, "");
}

export function validateMarkdownLinks(
  body: string,
  sourceHostPath: string,
  displayFile: string,
  root: string,
  entries: VaultEntries,
  collector: DiagnosticCollector,
): void {
  let destinations: readonly string[];
  try {
    destinations = collectMarkdownDestinations(body);
  } catch {
    collector.add(createDiagnostic("MARKDOWN-LINK", displayFile));
    return;
  }

  for (const destination of destinations) {
    const target = localLinkTarget(destination, sourceHostPath, root);
    if (target === undefined) continue;
    if (
      target === null ||
      (!entries.regularFiles.has(target) && !entries.directories.has(target))
    ) {
      collector.add(createDiagnostic("MARKDOWN-LINK", displayFile));
    }
  }
}
