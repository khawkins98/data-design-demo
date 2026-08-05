import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "scripts/**/*.test.mjs"],
    // Playwright specs live under apps/*/e2e and are run by `pnpm test:e2e`.
    exclude: ["**/node_modules/**", "**/dist/**", "apps/**/e2e/**"],
  },
});
