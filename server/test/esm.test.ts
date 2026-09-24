// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : extname(path) === ".ts" ? [path] : [];
  });
}

describe("server ESM compatibility", () => {
  it("uses explicit .js extensions for relative imports", () => {
    const files = ["api", "server", "scripts"].flatMap(filesUnder);
    const invalid = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)]
        .filter((match) => !match[1].endsWith(".js"))
        .map((match) => `${file}: ${match[1]}`);
    });
    expect(invalid).toEqual([]);
  });
});
