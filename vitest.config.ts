import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/server/**/*.ts"],
      exclude: ["lib/server/models/**/*.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
