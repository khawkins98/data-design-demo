import { defineConfig } from "vitest/config";

export default defineConfig({
  // Root-level tests are not inside a package tsconfig, so esbuild would fall
  // back to the classic JSX transform and fail on the missing React import.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      // Cross-package tests live here because a test importing both host shells
      // cannot sit inside a package either host depends on.
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
    // Playwright specs live under apps/*/e2e and are run by `pnpm test:e2e`.
    exclude: ["**/node_modules/**", "**/dist/**", "apps/**/e2e/**"],
  },
});
