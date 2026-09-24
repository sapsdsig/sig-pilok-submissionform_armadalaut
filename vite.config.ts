import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { localApiPlugin } from "./server/devApiPlugin.js";

export default defineConfig({
  plugins: [localApiPlugin(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
