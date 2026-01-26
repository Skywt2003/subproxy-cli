import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeConfig, parseDuration } from "../src/config.js";

describe("config", () => {
  it("normalizes defaults and trims inputs", () => {
    const baseDir = "/tmp/project";
    const config = normalizeConfig(
      {
        subscriptions: [" https://example.com/sub ", ""],
        excludeKeywords: [" HK ", ""],
        test: { url: " https://example.com/test " },
        interval: { update: " 2h ", test: " 10m " },
        inbound: { listen: " 0.0.0.0 ", socksPort: 1081, httpPort: 8081 },
        singBox: { bin: " sing-box ", workDir: "" },
        ruleSet: { updateInterval: " 2d " },
      },
      baseDir,
    );

    expect(config.subscriptions).toEqual([" https://example.com/sub "]);
    expect(config.excludeKeywords).toEqual([" HK "]);
    expect(config.test.url).toBe("https://example.com/test");
    expect(config.interval.update).toBe("2h");
    expect(config.interval.test).toBe("10m");
    expect(config.inbound.listen).toBe("0.0.0.0");
    expect(config.inbound.socksPort).toBe(1081);
    expect(config.inbound.httpPort).toBe(8081);
    expect(config.singBox.bin).toBe("sing-box");
    expect(config.singBox.workDir).toBe(path.resolve(baseDir, ".subproxy-cli"));
    expect(config.ruleSet.updateInterval).toBe("2d");
  });

  it("parses duration with fallback", () => {
    expect(parseDuration("10s", 123)).toBe(10_000);
    expect(parseDuration("5m", 123)).toBe(300_000);
    expect(parseDuration("2h", 123)).toBe(7_200_000);
    expect(parseDuration("1d", 123)).toBe(86_400_000);
    expect(parseDuration("invalid", 123)).toBe(123);
  });
});
