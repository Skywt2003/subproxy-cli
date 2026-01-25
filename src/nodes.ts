import type { NodeCandidate } from "./types.js";

export function filterNodes(
  nodes: NodeCandidate[],
  excludeKeywords: string[],
): NodeCandidate[] {
  if (excludeKeywords.length === 0) {
    return nodes;
  }
  const keywords = excludeKeywords.map((keyword) => keyword.toLowerCase());
  return nodes.filter((node) => {
    const name = (node.name || node.originalName || "").toLowerCase();
    return !keywords.some((keyword) => keyword && name.includes(keyword));
  });
}

export function renameNodes(nodes: NodeCandidate[]): NodeCandidate[] {
  return nodes.map((node, index) => {
    const nextTag = `node-${String(index + 1).padStart(3, "0")}`;
    return {
      ...node,
      tag: nextTag,
      name: nextTag,
    };
  });
}
