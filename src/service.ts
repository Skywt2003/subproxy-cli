import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

type Platform = "linux" | "darwin";

const SERVICE_NAME = "subproxy-cli";
const LAUNCHD_LABEL = "com.subproxy.cli";

export async function installService(configPath?: string): Promise<void> {
  const platform = getPlatform();
  const args = getExecArgs(configPath);
  const workingDir = getWorkingDir(configPath);

  if (platform === "linux") {
    const unitPath = getSystemdUserPath();
    await fs.mkdir(path.dirname(unitPath), { recursive: true });
    const content = buildSystemdUnit(args, workingDir);
    await fs.writeFile(unitPath, content, "utf8");
    await runCommand("systemctl", ["--user", "daemon-reload"]);
    console.log(`Installed systemd user service at ${unitPath}`);
    return;
  }

  const plistPath = getLaunchdPath();
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  const content = buildLaunchdPlist(args, workingDir);
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
  await runCommand("launchctl", ["bootstrap", getLaunchdDomain(), plistPath]);
}

export async function stopService(): Promise<void> {
  const platform = getPlatform();
  if (platform === "linux") {
    await runCommand("systemctl", ["--user", "stop", SERVICE_NAME]);
    return;
  }
  await runCommand("launchctl", ["bootout", getLaunchdDomainLabel()]);
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
  const scriptPath = path.resolve(process.argv[1]);
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

function buildSystemdUnit(args: string[], workingDir: string): string {
  const execStart = args.map(escapeSystemdArg).join(" ");
  return `[Unit]\n` +
    `Description=${SERVICE_NAME}\n` +
    `After=network-online.target\n\n` +
    `[Service]\n` +
    `Type=simple\n` +
    `WorkingDirectory=${workingDir}\n` +
    `ExecStart=${execStart}\n` +
    `Restart=on-failure\n` +
    `RestartSec=5\n` +
    `Environment=NODE_ENV=production\n\n` +
    `[Install]\n` +
    `WantedBy=default.target\n`;
}

function buildLaunchdPlist(args: string[], workingDir: string): string {
  const programArgs = args
    .map((arg) => `    <string>${escapeXml(arg)}</string>`)
    .join("\n");
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
    `</dict>\n` +
    `</plist>\n`;
}

function escapeSystemdArg(value: string): string {
  if (/[^A-Za-z0-9_./:-]/.test(value)) {
    return `"${value.replace(/"/g, "\\\"")}"`;
  }
  return value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function getSystemdUserPath(): string {
  return path.join(os.homedir(), ".config", "systemd", "user", `${SERVICE_NAME}.service`);
}

function getLaunchdPath(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
}

function getLaunchdDomain(): string {
  return `gui/${process.getuid?.() ?? 0}`;
}

function getLaunchdDomainLabel(): string {
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
