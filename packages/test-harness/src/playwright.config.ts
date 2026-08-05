/**
 * Shared Playwright configuration.
 *
 * Each demo app re-exports this with its own dev server command, so all eight
 * runs use identical viewports, retries and determinism settings. A demo that
 * quietly widened its viewport or enabled animations would produce screenshots
 * that cannot be compared with its siblings.
 */

import { defineConfig, devices } from "@playwright/test";

import { VIEWPORTS } from "./screenshots.js";

export interface HarnessConfigOptions {
  /** Command that serves the built demo, e.g. "pnpm preview --port 4173". */
  readonly webServerCommand: string;
  /** Port the command listens on. */
  readonly port: number;
}

export function createPlaywrightConfig(options: HarnessConfigOptions) {
  return defineConfig({
    testDir: "./e2e",
    outputDir: "./test-results/playwright",
    // Screenshots are evidence, so a flaky rerun must not silently replace a
    // real failure with a pass.
    retries: 0,
    fullyParallel: false,
    workers: 1,
    reporter: [
      ["list"],
      ["json", { outputFile: "./test-results/playwright-results.json" }],
    ],
    use: {
      baseURL: `http://localhost:${options.port}`,
      // The fixture "today" is 2026-06-15T09:30:00Z; formatting must not depend
      // on the runner's locale or timezone.
      timezoneId: "UTC",
      locale: "en-GB",
      trace: "retain-on-failure",
    },
    projects: VIEWPORTS.map((viewport) => ({
      name: viewport.name,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: viewport.width, height: viewport.height },
      },
    })),
    webServer: {
      command: options.webServerCommand,
      port: options.port,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
  });
}
