/**
 * Shared test harness for the UNDRR data design system evaluation.
 *
 * Import only. Brief 1 forbids modifying this package: if the harness cannot
 * express something a candidate needs, that is a finding to report.
 */

export {
  ALL_CANARIES_SELECTOR,
  CANARY_IDS,
  WATCHED_PROPERTIES,
  canarySelector,
  diffSnapshots,
} from "./canaries.js";
export type {
  CanaryDifference,
  CanaryId,
  CanarySnapshot,
  WatchedProperty,
} from "./canaries.js";

export { AXE_TAGS, runAxe } from "./axe.js";
export type { AxeImpact, AxeResult, AxeViolation, RunAxeOptions } from "./axe.js";

export { checkLeakage } from "./leakage.js";
export type { AssertNoLeakageOptions, LeakageResult } from "./leakage.js";

export { VIEWPORTS, captureScreens, viewportNameFor } from "./screenshots.js";
export type { CaptureOptions, ViewportName } from "./screenshots.js";

export { createPlaywrightConfig } from "./playwright.config.js";
export type { HarnessConfigOptions } from "./playwright.config.js";
