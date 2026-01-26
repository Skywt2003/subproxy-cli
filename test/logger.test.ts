import { describe, expect, it, vi } from "vitest";
import { Logger } from "../src/logger.js";

describe("logger", () => {
  it("respects log level threshold", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = new Logger("warn");

    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0]?.[0]).toContain("[WARN]");
    expect(spy.mock.calls[1]?.[0]).toContain("[ERROR]");

    spy.mockRestore();
  });
});
