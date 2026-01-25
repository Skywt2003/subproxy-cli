import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { NodeCandidate, NormalizedConfig } from "./types.js";

let singBoxProcess: ChildProcess | null = null;

export function buildSingBoxConfig(
  nodes: NodeCandidate[],
  config: NormalizedConfig,
): Record<string, unknown> {
  if (nodes.length === 0) {
    throw new Error("No nodes available after filtering.");
  }

  const proxyTags = nodes.map((node) => node.tag);
  const outbounds = [
    ...nodes.map((node) => ({ ...node.outbound, tag: node.tag })),
    {
      type: "urltest",
      tag: "proxy",
      outbounds: proxyTags,
      url: config.test.url,
      interval: config.interval.test,
    },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" },
  ];

  return {
    log: {
      level: config.singBox.logLevel,
    },
    experimental: {
      cache_file: {
        enabled: true,
        path: path.join(config.singBox.workDir, "cache.db"),
      },
    },
    inbounds: [
      {
        type: "socks",
        tag: "socks-in",
        listen: config.inbound.listen,
        listen_port: config.inbound.socksPort,
      },
      {
        type: "http",
        tag: "http-in",
        listen: config.inbound.listen,
        listen_port: config.inbound.httpPort,
      },
    ],
    outbounds,
    route: {
      rule_set: [
        {
          type: "remote",
          tag: "cn-ip",
          format: "binary",
          url: config.ruleSet.geoipCnUrl,
          download_detour: "proxy",
          update_interval: config.ruleSet.updateInterval,
        },
        {
          type: "remote",
          tag: "cn-domain",
          format: "binary",
          url: config.ruleSet.geositeCnUrl,
          download_detour: "proxy",
          update_interval: config.ruleSet.updateInterval,
        },
      ],
      rules: [
        {
          rule_set: ["cn-ip", "cn-domain"],
          outbound: "direct",
        },
      ],
      final: "proxy",
    },
  };
}

export function startSingBox(configPath: string, binPath: string): void {
  stopSingBox();
  singBoxProcess = spawn(binPath, ["run", "-c", configPath], {
    stdio: "inherit",
  });
}

export function stopSingBox(): void {
  if (!singBoxProcess) {
    return;
  }
  singBoxProcess.kill("SIGTERM");
  singBoxProcess = null;
}
