import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const loadedRoots = new Set<string>();

/**
 * Loads local server environment files from the project working directory.
 * Existing OS/runtime variables are never overwritten. `.env.local` wins over
 * `.env` because it is loaded first and dotenv uses `override: false`.
 */
export function loadServerEnvironment(projectRoot = process.cwd()): string[] {
  const root = resolve(projectRoot);
  if (loadedRoots.has(root)) return [];
  loadedRoots.add(root);

  const loadedFiles: string[] = [];
  for (const filename of [".env.local", ".env"]) {
    const path = resolve(root, filename);
    if (!existsSync(path)) continue;
    const result = dotenv.config({ path, override: false, quiet: true });
    if (!result.error) loadedFiles.push(path);
  }
  return loadedFiles;
}
