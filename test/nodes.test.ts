import { describe, expect, it } from "vitest";
import { filterNodes, renameNodes } from "../src/nodes.js";
import type { NodeCandidate } from "../src/types.js";

describe("nodes", () => {
  it("filters nodes by exclude keywords", () => {
    const nodes: NodeCandidate[] = [
      {
        tag: "a",
        name: "Hong Kong-1",
        outbound: {},
        source: "subscription",
      },
      {
        tag: "b",
        name: "Japan",
        outbound: {},
        source: "subscription",
      },
    ];

    const filtered = filterNodes(nodes, ["hk", "hong kong"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Japan");
  });

  it("renames nodes with padded tags", () => {
    const nodes: NodeCandidate[] = [
      { tag: "a", name: "A", outbound: {}, source: "custom" },
      { tag: "b", name: "B", outbound: {}, source: "custom" },
    ];
    const renamed = renameNodes(nodes);
    expect(renamed[0]?.tag).toBe("node-001");
    expect(renamed[0]?.name).toBe("node-001");
    expect(renamed[1]?.tag).toBe("node-002");
  });
});
