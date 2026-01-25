import { Buffer } from "node:buffer";
import type { NodeCandidate } from "./types.js";

export async function fetchSubscriptions(
  urls: string[],
  timeoutMs: number,
): Promise<NodeCandidate[]> {
  const results: NodeCandidate[] = [];
  for (const url of urls) {
    const content = await fetchText(url, timeoutMs);
    const nodes = parseSubscriptionContent(content, url);
    results.push(...nodes);
  }
  return results;
}

export function parseSubscriptionContent(
  content: string,
  sourceUrl: string,
): NodeCandidate[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const json = JSON.parse(trimmed) as unknown;
    return parseJsonSubscription(json, sourceUrl);
  }

  const decoded = decodeIfBase64(trimmed);
  const lines = decoded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nodes: NodeCandidate[] = [];
  for (const line of lines) {
    const node = parseShareLink(line, sourceUrl);
    if (node) {
      nodes.push(node);
    }
  }
  return nodes;
}

function parseJsonSubscription(
  json: unknown,
  sourceUrl: string,
): NodeCandidate[] {
  if (Array.isArray(json)) {
    return json
      .filter((item) => item && typeof item === "object")
      .map((item, index) => toNodeCandidate(item as Record<string, unknown>, {
        name: `json-${index + 1}`,
        sourceUrl,
      }));
  }
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    const outbounds = Array.isArray(obj.outbounds) ? obj.outbounds : [];
    return outbounds
      .filter((item) => item && typeof item === "object")
      .map((item, index) =>
        toNodeCandidate(item as Record<string, unknown>, {
          name: `outbound-${index + 1}`,
          sourceUrl,
        }),
      );
  }
  return [];
}

function parseShareLink(
  link: string,
  sourceUrl: string,
): NodeCandidate | null {
  if (link.startsWith("ss://")) {
    return parseShadowsocks(link, sourceUrl);
  }
  if (link.startsWith("trojan://")) {
    return parseTrojan(link, sourceUrl);
  }
  if (link.startsWith("vless://")) {
    return parseVless(link, sourceUrl);
  }
  if (link.startsWith("vmess://")) {
    return parseVmess(link, sourceUrl);
  }
  return null;
}

function parseShadowsocks(
  link: string,
  sourceUrl: string,
): NodeCandidate | null {
  const withoutScheme = link.slice("ss://".length);
  const [mainPart, namePart] = splitHash(withoutScheme);
  const [basePart] = mainPart.split("?");
  const atIndex = basePart.indexOf("@");
  let userInfo = "";
  let hostPort = "";

  if (atIndex === -1) {
    const decoded = decodeBase64(basePart);
    if (!decoded) {
      return null;
    }
    const decodedAt = decoded.indexOf("@");
    if (decodedAt === -1) {
      return null;
    }
    userInfo = decoded.slice(0, decodedAt);
    hostPort = decoded.slice(decodedAt + 1);
  } else {
    userInfo = basePart.slice(0, atIndex);
    hostPort = basePart.slice(atIndex + 1);
    if (isProbablyBase64(userInfo)) {
      const decoded = decodeBase64(userInfo);
      if (decoded) {
        userInfo = decoded;
      }
    }
  }

  const [method, password] = userInfo.split(":");
  if (!method || !password) {
    return null;
  }
  const [server, portText] = hostPort.split(":");
  const port = Number(portText);
  if (!server || Number.isNaN(port)) {
    return null;
  }

  const outbound: Record<string, unknown> = {
    type: "shadowsocks",
    server,
    server_port: port,
    method,
    password,
  };

  return toNodeCandidate(outbound, {
    name: decodeURIComponent(namePart || "shadowsocks"),
    sourceUrl,
  });
}

function parseTrojan(link: string, sourceUrl: string): NodeCandidate | null {
  const url = new URL(link);
  const server = url.hostname;
  const port = Number(url.port || 443);
  if (!server || Number.isNaN(port)) {
    return null;
  }
  const password = decodeURIComponent(url.username);
  const name = decodeURIComponent(url.hash.replace(/^#/, "")) || "trojan";
  const sni = url.searchParams.get("sni") || url.searchParams.get("peer");

  const outbound: Record<string, unknown> = {
    type: "trojan",
    server,
    server_port: port,
    password,
    tls: {
      enabled: true,
      server_name: sni || server,
    },
  };

  return toNodeCandidate(outbound, { name, sourceUrl });
}

function parseVless(link: string, sourceUrl: string): NodeCandidate | null {
  const url = new URL(link);
  const server = url.hostname;
  const port = Number(url.port || 443);
  const uuid = decodeURIComponent(url.username);
  if (!server || Number.isNaN(port) || !uuid) {
    return null;
  }
  const name = decodeURIComponent(url.hash.replace(/^#/, "")) || "vless";

  const security = url.searchParams.get("security") || "";
  const network = url.searchParams.get("type") || "";
  const host = url.searchParams.get("host") || "";
  const path = url.searchParams.get("path") || "";
  const sni = url.searchParams.get("sni") || url.searchParams.get("host");

  const outbound: Record<string, unknown> = {
    type: "vless",
    server,
    server_port: port,
    uuid,
  };

  if (security === "tls") {
    outbound.tls = {
      enabled: true,
      server_name: sni || server,
    };
  }

  if (network === "ws") {
    outbound.transport = {
      type: "ws",
      path: path || "/",
      headers: host ? { Host: host } : undefined,
    };
  }

  return toNodeCandidate(outbound, { name, sourceUrl });
}

function parseVmess(link: string, sourceUrl: string): NodeCandidate | null {
  const payload = link.slice("vmess://".length);
  const decoded = decodeBase64(payload);
  if (!decoded) {
    return null;
  }
  const json = JSON.parse(decoded) as Record<string, unknown>;
  const server = typeof json.add === "string" ? json.add : "";
  const port = Number(json.port ?? 0);
  const uuid = typeof json.id === "string" ? json.id : "";
  if (!server || Number.isNaN(port) || !uuid) {
    return null;
  }
  const name = typeof json.ps === "string" ? json.ps : "vmess";
  const tlsEnabled = json.tls === "tls";
  const net = typeof json.net === "string" ? json.net : "";
  const host = typeof json.host === "string" ? json.host : "";
  const path = typeof json.path === "string" ? json.path : "";
  const sni = typeof json.sni === "string" ? json.sni : "";
  const alterId = Number(json.aid ?? 0);

  const outbound: Record<string, unknown> = {
    type: "vmess",
    server,
    server_port: port,
    uuid,
    alter_id: Number.isNaN(alterId) ? 0 : alterId,
    security: typeof json.scy === "string" ? json.scy : "auto",
  };

  if (tlsEnabled) {
    outbound.tls = {
      enabled: true,
      server_name: sni || server,
    };
  }

  if (net === "ws") {
    outbound.transport = {
      type: "ws",
      path: path || "/",
      headers: host ? { Host: host } : undefined,
    };
  }

  return toNodeCandidate(outbound, { name, sourceUrl });
}

function toNodeCandidate(
  outbound: Record<string, unknown>,
  options: { name: string; sourceUrl: string },
): NodeCandidate {
  return {
    tag: options.name,
    name: options.name,
    originalName: options.name,
    outbound,
    source: "subscription",
  };
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Subscription request failed: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function splitHash(value: string): [string, string] {
  const index = value.indexOf("#");
  if (index === -1) {
    return [value, ""];
  }
  return [value.slice(0, index), value.slice(index + 1)];
}

function decodeIfBase64(value: string): string {
  if (!isProbablyBase64(value)) {
    return value;
  }
  const decoded = decodeBase64(value);
  return decoded ?? value;
}

function decodeBase64(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const buffer = Buffer.from(normalized, "base64");
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

function isProbablyBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) {
    return false;
  }
  return /^[A-Za-z0-9+/=_-]+$/.test(value);
}
