import { Command } from "commander";
import { generateOnce, listNodes, runDaemon } from "./run.js";

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("proxy-cli")
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

  program.parse(argv);
}
