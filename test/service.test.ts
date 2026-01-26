import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildLaunchdPlist,
  buildSystemdUnit,
  escapeSystemdArg,
  escapeXml,
  getEnvPath,
  getLaunchdDomainLabel,
  getLaunchdPath,
  getSystemdUserPath,
} from "../src/service.js";

describe("service", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    process.env.PATH = originalPath;
  });

  it("escapes systemd args and xml", () => {
    expect(escapeSystemdArg("/path/with space"))
      .toBe('"/path/with space"');
    expect(escapeSystemdArg("simple"))
      .toBe("simple");
    expect(escapeXml("a&b<c>\""))
      .toBe("a&amp;b&lt;c&gt;&quot;");
  });

  it("builds systemd unit with expected fields", () => {
    const unit = buildSystemdUnit(
      ["/usr/bin/node", "/app/dist/index.js", "run", "--config", "/app/config.yaml"],
      "/app",
      "/var/log/subproxy",
    );
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("ExecStart=/usr/bin/node /app/dist/index.js run --config /app/config.yaml");
    expect(unit).toContain("WorkingDirectory=/app");
    expect(unit).toContain("Environment=NODE_ENV=production");
    expect(unit).toContain("StandardOutput=append:/var/log/subproxy/service.log");
  });

  it("builds launchd plist with expected fields", () => {
    const plist = buildLaunchdPlist(
      ["/usr/bin/node", "/app/dist/index.js", "run"],
      "/app",
      "/var/log/subproxy",
    );
    expect(plist).toContain("<key>Label</key>");
    expect(plist).toContain("com.subproxy.cli");
    expect(plist).toContain("<key>ProgramArguments</key>");
    expect(plist).toContain("/usr/bin/node");
    expect(plist).toContain("<key>WorkingDirectory</key>");
    expect(plist).toContain("/var/log/subproxy/service.log");
  });

  it("returns platform-specific paths", () => {
    expect(getSystemdUserPath()).toContain(
      path.join(".config", "systemd", "user", "subproxy-cli.service"),
    );
    expect(getLaunchdPath()).toContain(
      path.join("Library", "LaunchAgents", "com.subproxy.cli.plist"),
    );
    expect(getLaunchdDomainLabel()).toContain("com.subproxy.cli");
  });

  it("builds PATH with fallback", () => {
    process.env.PATH = "/custom/bin";
    const envPath = getEnvPath();
    expect(envPath).toContain("/custom/bin");
    expect(envPath).toContain("/usr/bin");
  });
});
