import { describe, expect, it } from "vitest";
import { buildSingBoxConfig } from "../src/singbox.js";
import type { NodeCandidate, NormalizedConfig } from "../src/types.js";

const baseConfig: NormalizedConfig = {
  subscriptions: [],
  nodes: [],
  excludeKeywords: [],
  test: { url: "https://example.com/test", timeoutMs: 8000 },
  interval: { update: "6h", test: "30m" },
  inbound: { listen: "127.0.0.1", socksPort: 1080, httpPort: 8080 },
  singBox: {
    bin: "sing-box",
    workDir: "/tmp/.subproxy-cli",
    configPath: "/tmp/.subproxy-cli/sing-box.json",
    logLevel: "info",
  },
  ruleSet: {
    geoipCnUrl: "https://example.com/geoip.srs",
    geositeCnUrl: "https://example.com/geosite.srs",
    updateInterval: "1d",
  },
};

describe("singbox", () => {
  it("throws when nodes are empty", () => {
    expect(() => buildSingBoxConfig([], baseConfig)).toThrow(
      "No nodes available after filtering.",
    );
  });

  it("builds config with urltest and rules", () => {
    const nodes: NodeCandidate[] = [
      {
        tag: "node-001",
        name: "node-001",
        outbound: { type: "vmess", server: "example.com" },
        source: "custom",
      },
    ];
    const config = buildSingBoxConfig(nodes, baseConfig);
    expect(config.log).toMatchObject({ level: "info" });
    expect(config.inbounds).toHaveLength(2);
    const route = (config as { route: { rules: Array<Record<string, unknown>> } }).route;
    const rules = route.rules;
    expect(rules[0]).toMatchObject({
      ip_is_private: true,
      domain_suffix: [".local"],
      outbound: "direct",
    });
    const outbounds = config.outbounds as Array<Record<string, unknown>>;
    const tags = outbounds.map((outbound) => outbound.tag);
    expect(tags).toContain("proxy");
    expect(tags).toContain("direct");
    expect(tags).toContain("block");
    expect(config.route).toMatchObject({ final: "proxy" });
  });
});
