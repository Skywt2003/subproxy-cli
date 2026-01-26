import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeJsonIfChanged } from "../src/storage.js";

describe("storage", () => {
  it("writes only when content changes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "subproxy-cli-"));
    const filePath = path.join(dir, "config.json");

    const first = await writeJsonIfChanged(filePath, { a: 1 });
    const second = await writeJsonIfChanged(filePath, { a: 1 });
    const third = await writeJsonIfChanged(filePath, { a: 2 });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(third).toBe(true);

    const hashPath = `${filePath}.sha256`;
    const hash = await fs.readFile(hashPath, "utf8");
    expect(hash.trim().length).toBeGreaterThan(0);
  });
});
