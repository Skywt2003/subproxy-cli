export type LogLevel = "debug" | "info" | "warn" | "error";

export type ConfigInput = {
  subscriptions?: string[];
  nodes?: Array<Record<string, unknown>>;
  excludeKeywords?: string[];
  test?: {
    url?: string;
    timeoutMs?: number;
  };
  interval?: {
    update?: string;
    test?: string;
  };
  inbound?: {
    listen?: string;
    socksPort?: number;
    httpPort?: number;
  };
  singBox?: {
    bin?: string;
    workDir?: string;
    configPath?: string;
    logLevel?: LogLevel;
  };
  ruleSet?: {
    geoipCnUrl?: string;
    geositeCnUrl?: string;
    updateInterval?: string;
  };
};

export type NormalizedConfig = {
  subscriptions: string[];
  nodes: Array<Record<string, unknown>>;
  excludeKeywords: string[];
  test: {
    url: string;
    timeoutMs: number;
  };
  interval: {
    update: string;
    test: string;
  };
  inbound: {
    listen: string;
    socksPort: number;
    httpPort: number;
  };
  singBox: {
    bin: string;
    workDir: string;
    configPath: string;
    logLevel: LogLevel;
  };
  ruleSet: {
    geoipCnUrl: string;
    geositeCnUrl: string;
    updateInterval: string;
  };
};

export type NodeSource = "subscription" | "custom";

export type NodeCandidate = {
  tag: string;
  name: string;
  outbound: Record<string, unknown>;
  source: NodeSource;
  originalName?: string;
};
