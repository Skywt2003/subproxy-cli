import path from "node:path";
import { loadConfig, parseDuration } from "./config.js";
import { Logger } from "./logger.js";
import { filterNodes, renameNodes } from "./nodes.js";
import { fetchSubscriptions } from "./subscription.js";
import { buildSingBoxConfig, startSingBox } from "./singbox.js";
import { ensureDir, writeJsonIfChanged } from "./storage.js";
import type { NodeCandidate, NormalizedConfig } from "./types.js";

export async function generateOnce(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const logger = new Logger(config.singBox.logLevel);
  await ensureDir(config.singBox.workDir);
  const nodes = await buildNodes(config, logger);
  const singBoxConfig = buildSingBoxConfig(nodes, config);
  await writeJsonIfChanged(config.singBox.configPath, singBoxConfig);
  logger.info(`Generated ${path.relative(process.cwd(), config.singBox.configPath)}`);
}

export async function runDaemon(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const logger = new Logger(config.singBox.logLevel);
  await ensureDir(config.singBox.workDir);

  const updateIntervalMs = parseDuration(config.interval.update, 6 * 60 * 60 * 1000);

  const update = async () => {
    const nodes = await buildNodes(config, logger);
    const singBoxConfig = buildSingBoxConfig(nodes, config);
    const changed = await writeJsonIfChanged(config.singBox.configPath, singBoxConfig);
    if (changed) {
      logger.info("Configuration updated, restarting sing-box.");
      startSingBox(config.singBox.configPath, config.singBox.bin);
    }
  };

  await update();
  startSingBox(config.singBox.configPath, config.singBox.bin);
  setInterval(update, updateIntervalMs);
  logger.info("Proxy CLI running.");
}

export async function listNodes(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const logger = new Logger(config.singBox.logLevel);
  const nodes = await buildNodes(config, logger);
  nodes.forEach((node) => {
    console.log(`${node.tag} (${node.source})`);
  });
}

async function buildNodes(
  config: NormalizedConfig,
  logger: Logger,
): Promise<NodeCandidate[]> {
  const subscriptionNodes = await fetchSubscriptions(
    config.subscriptions,
    config.test.timeoutMs,
  );
  const customNodes = toCustomNodes(config.nodes);

  let nodes = [...subscriptionNodes, ...customNodes];
  nodes = filterNodes(nodes, config.excludeKeywords);
  nodes = renameNodes(nodes);

  if (nodes.length === 0) {
    logger.warn("No nodes after filtering.");
  } else {
    logger.info(`Loaded ${nodes.length} nodes.`);
  }
  return nodes;
}

function toCustomNodes(nodes: Array<Record<string, unknown>>): NodeCandidate[] {
  const result: NodeCandidate[] = [];
  nodes.forEach((node, index) => {
    const type = typeof node.type === "string" ? node.type : "";
    if (!type) {
      return;
    }
    const name =
      typeof node.tag === "string"
        ? node.tag
        : typeof node.name === "string"
          ? node.name
          : `custom-${index + 1}`;
    result.push({
      tag: name,
      name,
      originalName: name,
      outbound: node,
      source: "custom",
    });
  });
  return result;
}
