import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

type Platform = "linux" | "darwin";

const SERVICE_NAME = "subproxy-cli";
const LAUNCHD_LABEL = "com.subproxy.cli";

export async function installService(configPath?: string): Promise<void> {
  const platform = getPlatform();
  const args = getExecArgs(configPath);
  const workingDir = getWorkingDir(configPath);
  const logDir = getLogDir();
  await fs.mkdir(logDir, { recursive: true });

  if (platform === "linux") {
    const unitPath = getSystemdUserPath();
    await fs.mkdir(path.dirname(unitPath), { recursive: true });
    const content = buildSystemdUnit(args, workingDir, logDir);
    await fs.writeFile(unitPath, content, "utf8");
    await runCommand("systemctl", ["--user", "daemon-reload"]);
    console.log(`Installed systemd user service at ${unitPath}`);
    return;
  }

  const plistPath = getLaunchdPath();
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  const content = buildLaunchdPlist(args, workingDir, logDir);
  await fs.writeFile(plistPath, content, "utf8");
  console.log(`Installed launchd agent at ${plistPath}`);
}

export async function uninstallService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    const unitPath = getSystemdUserPath();
    await safeRemove(unitPath);
    await runCommand("systemctl", ["--user", "daemon-reload"]);
    console.log("Removed systemd user service.");
    return;
  }

  const plistPath = getLaunchdPath();
  await tryCommand("launchctl", ["bootout", getLaunchdDomain(), plistPath]);
  await safeRemove(plistPath);
  console.log("Removed launchd agent.");
}

export async function startService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "start", SERVICE_NAME]);
    return;
  }
  const plistPath = getLaunchdPath();
  await tryCommand("launchctl", ["bootout", getLaunchdDomain(), plistPath]);
  try {
    await runCommand("launchctl", ["bootstrap", getLaunchdDomain(), plistPath]);
  } catch {
    // Continue to kickstart for agents already loaded or after bootstrap failure.
  }
  await runCommand("launchctl", ["kickstart", "-k", getLaunchdDomainLabel()]);
}

export async function stopService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "stop", SERVICE_NAME]);
    return;
  }
  await runCommand("launchctl", ["bootout", getLaunchdDomain(), getLaunchdPath()]);
}

export async function enableService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "enable", SERVICE_NAME]);
    return;
  }
  await runCommand("launchctl", ["enable", getLaunchdDomainLabel()]);
}

export async function disableService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "disable", SERVICE_NAME]);
    return;
  }
  await runCommand("launchctl", ["disable", getLaunchdDomainLabel()]);
}

export async function statusService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "status", SERVICE_NAME]);
    return;
  }
  await runCommand("launchctl", ["print", getLaunchdDomainLabel()]);
}

function getExecArgs(configPath?: string): string[] {
  const nodePath = process.execPath;
  const scriptPath = getEntryScriptPath();
  const args = [nodePath, scriptPath, "run"];
  if (configPath) {
    args.push("--config", path.resolve(configPath));
  }
  return args;
}

function getWorkingDir(configPath?: string): string {
  if (configPath) {
    return path.dirname(path.resolve(configPath));
  }
  return process.cwd();
}

export function buildSystemdUnit(
  args: string[],
  workingDir: string,
  logDir: string,
): string {
  const execStart = args.map(escapeSystemdArg).join(" ");
  const envPath = getEnvPath();
  return `[Unit]\n` +
    `Description=${SERVICE_NAME}\n` +
    `After=network-online.target\n\n` +
    `[Service]\n` +
    `Type=simple\n` +
    `WorkingDirectory=${workingDir}\n` +
    `ExecStart=${execStart}\n` +
    `Restart=on-failure\n` +
    `RestartSec=5\n` +
    `Environment=NODE_ENV=production\n` +
    `Environment=PATH=${escapeSystemdArg(envPath)}\n` +
    `StandardOutput=append:${path.join(logDir, "service.log")}\n` +
    `StandardError=append:${path.join(logDir, "service.error.log")}\n\n` +
    `[Install]\n` +
    `WantedBy=default.target\n`;
}

export function buildLaunchdPlist(
  args: string[],
  workingDir: string,
  logDir: string,
): string {
  const programArgs = args
    .map((arg) => `    <string>${escapeXml(arg)}</string>`)
    .join("\n");
  const envPath = escapeXml(getEnvPath());
  const outLog = escapeXml(path.join(logDir, "service.log"));
  const errLog = escapeXml(path.join(logDir, "service.error.log"));
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
    `<plist version="1.0">\n` +
    `<dict>\n` +
    `  <key>Label</key>\n` +
    `  <string>${LAUNCHD_LABEL}</string>\n` +
    `  <key>ProgramArguments</key>\n` +
    `  <array>\n${programArgs}\n  </array>\n` +
    `  <key>RunAtLoad</key>\n` +
    `  <true/>\n` +
    `  <key>KeepAlive</key>\n` +
    `  <true/>\n` +
    `  <key>WorkingDirectory</key>\n` +
    `  <string>${escapeXml(workingDir)}</string>\n` +
    `  <key>EnvironmentVariables</key>\n` +
    `  <dict>\n` +
    `    <key>PATH</key>\n` +
    `    <string>${envPath}</string>\n` +
    `    <key>NODE_ENV</key>\n` +
    `    <string>production</string>\n` +
    `  </dict>\n` +
    `  <key>StandardOutPath</key>\n` +
    `  <string>${outLog}</string>\n` +
    `  <key>StandardErrorPath</key>\n` +
    `  <string>${errLog}</string>\n` +
    `</dict>\n` +
    `</plist>\n`;
}

export function escapeSystemdArg(value: string): string {
  if (/[^A-Za-z0-9_./:-]/.test(value)) {
    return `"${value.replace(/"/g, "\\\"")}"`;
  }
  return value;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getEntryScriptPath(): string {
  const url = new URL("./index.js", import.meta.url);
  return fileURLToPath(url);
}

function getPlatform(): Platform {
  if (process.platform === "linux") {
    return "linux";
  }
  if (process.platform === "darwin") {
    return "darwin";
  }
  throw new Error(`Unsupported platform: ${process.platform}`);
}

export function getSystemdUserPath(): string {
  return path.join(os.homedir(), ".config", "systemd", "user", `${SERVICE_NAME}.service`);
}

export function getLaunchdPath(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
}

export function getLogDir(): string {
  return path.join(os.homedir(), ".subproxy-cli");
}

export function getEnvPath(): string {
  const fallback = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  return process.env.PATH ? `${process.env.PATH}:${fallback}` : fallback;
}

export function getLaunchdDomain(): string {
  return `gui/${process.getuid?.() ?? 0}`;
}

export function getLaunchdDomainLabel(): string {
  return `${getLaunchdDomain()}/${LAUNCHD_LABEL}`;
}

async function safeRemove(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    return;
  }
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function tryCommand(command: string, args: string[]): Promise<void> {
  try {
    await runCommand(command, args);
  } catch {
    return;
  }
}
