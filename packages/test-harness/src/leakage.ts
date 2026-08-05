/**
 * The leakage assertion.
 *
 * Premise: the host shell owns the page, and a candidate library is only
 * entitled to style its own subtree. Anything that reaches outside it —
 * a global `button {}` rule, a `* { box-sizing: border-box }` reset, a body
 * font override, a normalize.css bundled into the library — changes how the
 * host's own elements render. That is a real cost to UNDRR and is the kind of
 * thing that does not show up in a component screenshot.
 *
 * Method: snapshot the canaries' computed styles with the candidate subtree
 * unmounted, mount it, snapshot again, and diff.
 *
 * The demo page cooperates by honouring `?candidate=off`, which renders the
 * host with an empty candidate subtree. Comparing across a reload rather than
 * a React unmount matters, because stylesheets a library injects at import time
 * are not removed on unmount and would otherwise be present in both snapshots.
 */

import type { Page } from "@playwright/test";

import {
  ALL_CANARIES_SELECTOR,
  WATCHED_PROPERTIES,
  diffSnapshots,
} from "./canaries.js";
import type { CanaryDifference, CanarySnapshot } from "./canaries.js";

export interface LeakageResult {
  /** True when the candidate changed nothing about the host canaries. */
  readonly assertionPassed: boolean;
  readonly differences: readonly CanaryDifference[];
  /** Canaries found in the baseline, to catch a page that rendered none. */
  readonly canariesChecked: number;
}

/** Reads the watched computed styles for every canary currently in the DOM. */
async function snapshot(page: Page): Promise<CanarySnapshot> {
  return page.evaluate(
    ({ selector, properties }) => {
      const result: Record<string, Record<string, string>> = {};
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const id = element.getAttribute("data-canary");
        if (!id) continue;
        const computed = window.getComputedStyle(element);
        const values: Record<string, string> = {};
        for (const property of properties) {
          values[property] = computed.getPropertyValue(property).trim();
        }
        result[id] = values;
      }
      return result;
    },
    { selector: ALL_CANARIES_SELECTOR, properties: [...WATCHED_PROPERTIES] },
  );
}

/** Waits for fonts to settle, so font-dependent metrics do not race. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

export interface AssertNoLeakageOptions {
  /** Demo URL. Must support the `candidate` query parameter. */
  readonly url: string;
}

/**
 * Loads the page twice — without and with the candidate subtree — and reports
 * every computed-style difference in the host canaries.
 *
 * Returns the result rather than throwing, because Brief 1 requires a failure
 * to be *documented* in evidence.json, not to abort the run.
 */
export async function checkLeakage(
  page: Page,
  options: AssertNoLeakageOptions,
): Promise<LeakageResult> {
  const url = new URL(options.url, "http://localhost");

  url.searchParams.set("candidate", "off");
  await page.goto(url.toString());
  await settle(page);
  const before = await snapshot(page);

  url.searchParams.set("candidate", "on");
  await page.goto(url.toString());
  await settle(page);
  const after = await snapshot(page);

  const differences = diffSnapshots(before, after);

  return {
    assertionPassed: differences.length === 0,
    differences,
    canariesChecked: Object.keys(before).length,
  };
}
