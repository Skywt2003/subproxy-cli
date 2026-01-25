import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { ConfigInput, NormalizedConfig } from "./types.js";

const DEFAULT_TEST_URL = "https://www.google.com/generate_204";
const DEFAULT_UPDATE_INTERVAL = "6h";
const DEFAULT_TEST_INTERVAL = "30m";
const DEFAULT_TIMEOUT_MS = 8000;

const DEFAULT_GEOIP_CN_URL =
  "https://raw.githubusercontent.com/Dreista/sing-box-rule-set-cn/rule-set/apnic-cn-ipv4.srs";
const DEFAULT_GEOSITE_CN_URL =
  "https://raw.githubusercontent.com/Dreista/sing-box-rule-set-cn/rule-set/accelerated-domains.china.conf.srs";
const DEFAULT_RULESET_UPDATE = "1d";

export const DEFAULT_CONFIG_PATH = "config.yaml";
export const DEFAULT_DATA_DIR = ".subproxy-cli";

export async function loadConfig(configPath?: string): Promise<NormalizedConfig> {
  const resolvedPath = path.resolve(configPath ?? DEFAULT_CONFIG_PATH);
  const raw = await fs.readFile(resolvedPath, "utf8");
  const input = parse(raw) as ConfigInput;
  return normalizeConfig(input, path.dirname(resolvedPath));
}

export function normalizeConfig(
  input: ConfigInput,
  baseDir: string,
): NormalizedConfig {
  const subscriptions = Array.isArray(input.subscriptions)
    ? input.subscriptions.filter(isNonEmptyString)
    : [];
  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  const excludeKeywords = Array.isArray(input.excludeKeywords)
    ? input.excludeKeywords.filter(isNonEmptyString)
    : [];

  const testUrl = input.test?.url?.trim() || DEFAULT_TEST_URL;
  const timeoutMs =
    typeof input.test?.timeoutMs === "number" && input.test.timeoutMs > 0
      ? input.test.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  const updateInterval =
    input.interval?.update?.trim() || DEFAULT_UPDATE_INTERVAL;
  const testInterval = input.interval?.test?.trim() || DEFAULT_TEST_INTERVAL;

  const listen = input.inbound?.listen?.trim() || "127.0.0.1";
  const socksPort = input.inbound?.socksPort ?? 1080;
  const httpPort = input.inbound?.httpPort ?? 8080;

  const singBoxBin = input.singBox?.bin?.trim() || "sing-box";
  const workDir =
    input.singBox?.workDir?.trim() || path.resolve(baseDir, DEFAULT_DATA_DIR);
  const configPath =
    input.singBox?.configPath?.trim() || path.join(workDir, "sing-box.json");
  const logLevel = input.singBox?.logLevel ?? "info";

  const geoipCnUrl = input.ruleSet?.geoipCnUrl?.trim() || DEFAULT_GEOIP_CN_URL;
  const geositeCnUrl =
    input.ruleSet?.geositeCnUrl?.trim() || DEFAULT_GEOSITE_CN_URL;
  const ruleSetUpdateInterval =
    input.ruleSet?.updateInterval?.trim() || DEFAULT_RULESET_UPDATE;

  return {
    subscriptions,
    nodes,
    excludeKeywords,
    test: {
      url: testUrl,
      timeoutMs,
    },
    interval: {
      update: updateInterval,
      test: testInterval,
    },
    inbound: {
      listen,
      socksPort,
      httpPort,
    },
    singBox: {
      bin: singBoxBin,
      workDir,
      configPath,
      logLevel,
    },
    ruleSet: {
      geoipCnUrl,
      geositeCnUrl,
      updateInterval: ruleSetUpdateInterval,
    },
  };
}

export function parseDuration(value: string, fallbackMs: number): number {
  const trimmed = value.trim();
  const match = /^([0-9]+)\s*([smhd])$/i.exec(trimmed);
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "s"
      ? 1000
      : unit === "m"
        ? 60_000
        : unit === "h"
          ? 3_600_000
          : 86_400_000;
  return amount * multiplier;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
