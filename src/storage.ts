import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, "utf8");
}

export async function writeJsonIfChanged(
  filePath: string,
  data: unknown,
): Promise<boolean> {
  const content = JSON.stringify(data, null, 2);
  const nextHash = sha256(content);
  const prevHash = await readHash(`${filePath}.sha256`);
  if (prevHash === nextHash) {
    return false;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  await fs.writeFile(`${filePath}.sha256`, nextHash, "utf8");
  return true;
}

async function readHash(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content.trim();
  } catch {
    return null;
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
