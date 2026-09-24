// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadServerEnvironment } from "../environment.js";

const KEYS = [
  "PILOK_ENV_LOCAL_PRIORITY_TEST",
  "PILOK_ENV_FALLBACK_TEST",
  "PILOK_ENV_OS_PRIORITY_TEST",
] as const;

afterEach(() => {
  KEYS.forEach((key) => delete process.env[key]);
});

describe("server environment loader", () => {
  it("loads .env.local before .env and preserves OS variables", () => {
    const root = mkdtempSync(join(tmpdir(), "pilok-env-"));
    try {
      writeFileSync(
        join(root, ".env.local"),
        "PILOK_ENV_LOCAL_PRIORITY_TEST=from-local\nPILOK_ENV_OS_PRIORITY_TEST=from-local\n",
      );
      writeFileSync(
        join(root, ".env"),
        "PILOK_ENV_LOCAL_PRIORITY_TEST=from-env\nPILOK_ENV_FALLBACK_TEST=from-env\nPILOK_ENV_OS_PRIORITY_TEST=from-env\n",
      );
      process.env.PILOK_ENV_OS_PRIORITY_TEST = "from-os";

      loadServerEnvironment(root);

      expect(process.env.PILOK_ENV_LOCAL_PRIORITY_TEST).toBe("from-local");
      expect(process.env.PILOK_ENV_FALLBACK_TEST).toBe("from-env");
      expect(process.env.PILOK_ENV_OS_PRIORITY_TEST).toBe("from-os");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
