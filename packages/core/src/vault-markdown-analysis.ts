import { fromMarkdown } from "mdast-util-from-markdown";

interface MarkdownNode {
  readonly type: string;
  readonly url?: string;
  readonly identifier?: string;
  readonly children?: readonly MarkdownNode[];
}

export interface MarkdownAnalysis {
  readonly destinations: readonly string[];
  readonly maximumContainerDepth: number;
}

const containerTypes = new Set(["blockquote", "list", "listItem"]);

export function analyzeMarkdown(body: string): MarkdownAnalysis {
  const tree = fromMarkdown(body) as MarkdownNode;
  const definitions = new Map<string, string>();
  const references: string[] = [];
  const destinations: string[] = [];
  const stack: Array<{
    readonly node: MarkdownNode;
    readonly containerDepth: number;
  }> = [{ node: tree, containerDepth: 0 }];
  let maximumContainerDepth = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const { node } = current;
    const containerDepth =
      current.containerDepth + (containerTypes.has(node.type) ? 1 : 0);
    maximumContainerDepth = Math.max(maximumContainerDepth, containerDepth);
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
      if (child !== undefined) stack.push({ node: child, containerDepth });
    }
  }

  for (const identifier of references) {
    const destination = definitions.get(identifier);
    if (destination !== undefined) destinations.push(destination);
  }
  return { destinations, maximumContainerDepth };
}
