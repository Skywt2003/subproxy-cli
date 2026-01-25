import { Command } from "commander";
import { generateOnce, listNodes, runDaemon } from "./run.js";
import {
  disableService,
  enableService,
  installService,
  startService,
  statusService,
  stopService,
  uninstallService,
} from "./service.js";

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("subproxy-cli")
    .description("CLI proxy manager built on sing-box")
    .option("-c, --config <path>", "path to config.yaml");

  program
    .command("gen")
    .description("Generate sing-box config once")
    .action(async () => {
      const options = program.opts<{ config?: string }>();
      await generateOnce(options.config);
    });

  program
    .command("run")
    .description("Run in background with periodic updates")
    .action(async () => {
      const options = program.opts<{ config?: string }>();
      await runDaemon(options.config);
    });

  program
    .command("list")
    .description("List available nodes")
    .action(async () => {
      const options = program.opts<{ config?: string }>();
      await listNodes(options.config);
    });

  const service = program
    .command("service")
    .description("Manage user-level service (systemd/launchd)");

  service
    .command("install")
    .description("Install user service definition")
    .action(async () => {
      const options = program.opts<{ config?: string }>();
      await installService(options.config);
    });

  service
    .command("uninstall")
    .description("Remove user service definition")
    .action(async () => {
      await uninstallService();
    });

  service
    .command("start")
    .description("Start user service")
    .action(async () => {
      await startService();
    });

  service
    .command("stop")
    .description("Stop user service")
    .action(async () => {
      await stopService();
    });

  service
    .command("enable")
    .description("Enable user service on login")
    .action(async () => {
      await enableService();
    });

  service
    .command("disable")
    .description("Disable user service on login")
    .action(async () => {
      await disableService();
    });

  service
    .command("status")
    .description("Show user service status")
    .action(async () => {
      await statusService();
    });

  program.parse(argv);
}
