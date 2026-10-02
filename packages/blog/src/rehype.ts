export type TocItem = { id: string; text: string; depth: 2 | 3 };

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  data?: { meta?: unknown };
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return node.children?.map(textOf).join("") ?? "";
}

function walk(node: HastNode, visit: (node: HastNode, parent?: HastNode) => void, parent?: HastNode) {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, visit, node);
}

/**
 * Runs after rehype-slug. Collects h2/h3 for the table of contents and exposes the
 * code fence meta string (```ts title="file.ts") as `data-meta`, which the `pre`
 * component reads. MDX drops hast `data` otherwise.
 */
export function rehypeVibeblog(options: { toc: TocItem[] }) {
  return (tree: unknown): void => {
    walk(tree as HastNode, (node, parent) => {
      if (node.type !== "element") return;

      const id = node.properties?.id;
      // remark-gfm adds a visually hidden "Footnotes" h2 (class sr-only). Keep it out of the TOC.
      const className = node.properties?.className;
      const hidden = Array.isArray(className) && className.includes("sr-only");
      if ((node.tagName === "h2" || node.tagName === "h3") && typeof id === "string" && !hidden) {
        const text = textOf(node).trim();
        if (text) options.toc.push({ id, text, depth: node.tagName === "h2" ? 2 : 3 });
      }

      if (node.tagName === "code" && parent?.tagName === "pre" && typeof node.data?.meta === "string") {
        node.properties = { ...node.properties, dataMeta: node.data.meta };
      }
    });
  };
}
