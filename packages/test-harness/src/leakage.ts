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
 *
 * ## KNOWN LIMITATION: statically imported stylesheets are invisible
 *
 * This check diffs two loads of the same document. A stylesheet that arrives
 * through a static `import "…/styles.css"` is therefore present in BOTH loads,
 * so whatever it does to the host canaries appears identically in both
 * snapshots and cancels out. The assertion passes vacuously.
 *
 * That is fine for a library that injects styles at render time — MUI's emotion
 * styles, for instance, genuinely are absent when no component has mounted. It
 * is NOT fine for a library shipping a plain stylesheet: Mantine, Carbon.
 *
 * A demo must therefore load its candidate's CSS conditionally, inside the
 * `candidate=on` branch, so the baseline really is the host alone. See
 * `apps/mangrove-mantine/src/main.tsx` for the pattern, and
 * `docs/requirements.md` for the rule.
 *
 * Found by the mangrove-mantine run. Where a demo's own CSS is entirely scoped
 * under its subtree class it cannot reach a canary anyway, and a `clean` result
 * is still correct — but it is correct by construction rather than by
 * measurement, and the difference matters when reading these numbers.
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
/**
 * Sets the `candidate` parameter while keeping the URL relative.
 *
 * Deliberately does not use `new URL()`: that requires an absolute base, and
 * the resulting absolute URL overrides Playwright's `baseURL`. An earlier
 * version did exactly that, navigated to port 80, snapshotted an error page
 * with zero canaries, and reported "no leakage" — passing vacuously.
 */
export function withCandidate(url: string, value: "on" | "off"): string {
  const [path = "", query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("candidate", value);
  return `${path}?${params.toString()}`;
}

/**
 * Diffs the host canaries across `?candidate=off` and `?candidate=on`.
 *
 * WHAT THIS CANNOT MEASURE, AND WHY IT HAS FOOLED TWO RUNS.
 *
 * `withCandidate` preserves every other query parameter, which is correct for
 * keeping the URL relative but means a SECOND toggle cannot be probed with this
 * function. Pass `?globalcss=on` or `?carbonCss=scoped` and the flag lands in
 * BOTH snapshots, so whatever it switches on is present in the baseline too and
 * cancels itself out. The result is a confident `differences: []` that measured
 * nothing - the most dangerous possible output, because it is indistinguishable
 * from a genuine clean result.
 *
 * Two Carbon runs hit this: the kitchen sink, and later the full-application
 * layout, which reported a clean 0 until the probe was replaced by two manual
 * snapshots (baseline at `?candidate=off`, probe at `?candidate=on&yourFlag=on`).
 *
 * If a demo needs to compare two stylesheet arrangements rather than two
 * candidate states, snapshot manually with `WATCHED_PROPERTIES` and
 * `diffSnapshots` and do not route it through here.
 */
export async function checkLeakage(
  page: Page,
  options: AssertNoLeakageOptions,
): Promise<LeakageResult> {
  await page.goto(withCandidate(options.url, "off"));
  await settle(page);
  const before = await snapshot(page);

  if (Object.keys(before).length === 0) {
    // Not a leakage result: the page never rendered the host shell, so there is
    // nothing to compare and a "passed" verdict would be meaningless. Fail loudly
    // rather than let a demo record a clean leakage result it did not earn.
    throw new Error(
      `Leakage baseline found no [data-canary] elements at "${withCandidate(
        options.url,
        "off",
      )}". The host shell did not render. Check that the URL is relative to the ` +
        `Playwright baseURL and that the page honours ?candidate=off.`,
    );
  }

  await page.goto(withCandidate(options.url, "on"));
  await settle(page);
  const after = await snapshot(page);

  const differences = diffSnapshots(before, after);

  return {
    assertionPassed: differences.length === 0,
    differences,
    canariesChecked: Object.keys(before).length,
  };
}
