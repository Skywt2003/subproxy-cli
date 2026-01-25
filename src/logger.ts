import type { LogLevel } from "./types.js";

const levels: LogLevel[] = ["debug", "info", "warn", "error"];

export class Logger {
  private threshold: LogLevel;

  constructor(level: LogLevel) {
    this.threshold = level;
  }

  debug(message: string): void {
    this.log("debug", message);
  }

  info(message: string): void {
    this.log("info", message);
  }

  warn(message: string): void {
    this.log("warn", message);
  }

  error(message: string): void {
    this.log("error", message);
  }

  private log(level: LogLevel, message: string): void {
    if (levels.indexOf(level) < levels.indexOf(this.threshold)) {
      return;
    }
    const prefix = level.toUpperCase();
    console.log(`[${prefix}] ${message}`);
  }
}
