/**
 * Screenshot capture at a predictable path.
 *
 * Path shape is fixed so the comparison index can find any demo's screenshot by
 * construction rather than by directory listing:
 *
 *   apps/<host>-<candidate>/screenshots/<viewport>/<name>.png
 *   apps/<host>-<candidate>/screenshots/<viewport>/rtl/<name>.png
 *
 * Animations are disabled and the fixed fixture date is used throughout, so a
 * rerun that changes nothing produces byte-identical files and the diff stays
 * quiet.
 */

import type { Page, TestInfo } from "@playwright/test";

export const VIEWPORTS = Object.freeze([
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const);

export type ViewportName = (typeof VIEWPORTS)[number]["name"];

export interface CaptureOptions {
  /** Set when capturing the Arabic RTL pass, which lands in an rtl/ subfolder. */
  readonly rtl?: boolean;
  /** Capture the whole scrollable page rather than just the viewport. */
  readonly fullPage?: boolean;
}

/** Resolves the viewport name from the Playwright project currently running. */
export function viewportNameFor(testInfo: TestInfo): ViewportName {
  const projectName = testInfo.project.name;
  const match = VIEWPORTS.find((v) => projectName.includes(v.name));
  if (!match) {
    throw new Error(
      `Playwright project "${projectName}" does not match a known viewport. ` +
        `Expected one of: ${VIEWPORTS.map((v) => v.name).join(", ")}.`,
    );
  }
  return match.name;
}

/**
 * Writes a screenshot for the current viewport.
 *
 * `name` should be the kitchen-sink section, e.g. "06-data-table", so files
 * sort into page order.
 */
export async function captureScreens(
  page: Page,
  name: string,
  testInfo: TestInfo,
  options: CaptureOptions = {},
): Promise<string> {
  const viewport = viewportNameFor(testInfo);
  const segments = ["screenshots", viewport];
  if (options.rtl) segments.push("rtl");
  segments.push(`${name}.png`);

  const path = segments.join("/");

  await page.screenshot({
    path,
    fullPage: options.fullPage ?? true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });

  return path;
}
