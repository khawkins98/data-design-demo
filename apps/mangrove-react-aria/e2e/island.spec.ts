/**
 * Evidence run for the embedded-island view (`island.html`).
 *
 * Same harness, same helpers and same three viewport projects as
 * `demo.spec.ts` — the kitchen sink and the island must be measured the same way
 * or their numbers cannot be compared.
 *
 * WHY THIS VIEW IS THE ONE TO READ FOR LEAKAGE. The kitchen sink hands React Aria
 * the whole content column, so the only host markup near it is the canary block
 * itself. Here the candidate is one region inside a reproduction of the real
 * published UNDRR page frame, with Mangrove's own masthead, `role="menubar"`
 * navigation and prose on both sides. The leakage assertion therefore runs against
 * real neighbouring content rather than a block that happens to sit above.
 *
 * Like `demo.spec.ts` this does NOT assert zero axe violations: Brief 1 forbids
 * claiming conformance, so the counts are the output, not the pass criterion.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import {
  MANGROVE_FRAME_CANARY_IDS,
  frameCanarySelector,
} from "@undrr-eval/test-harness/frame-canaries";

/** The island entry. Relative, so Playwright's baseURL applies. */
const URL = "/island.html";

/**
 * Clicks a locale in the switcher.
 *
 * React Aria's `Radio` renders a <label> wrapping a visually hidden <input>, and
 * the label intercepts pointer events, so `getByRole("radio").click()` times out.
 * Targeting the label is the working route. Same trap the kitchen-sink spec
 * documents; recorded once in EVIDENCE.md, met again here.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(".demo-locale__option", { hasText: label }).click();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator('[data-view="island"]')).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] table")).toHaveCount(1);
    await expect(page.locator(".demo-filters")).toHaveCount(1);
    await expect(page.locator(".demo-pagination")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] tbody tr")).toHaveCount(10);
  });

  test("renders all 14 host canaries and the island frame's 4 chrome canaries", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    // The host contract. If the frame renders fewer than the kitchen sink does,
    // the leakage assertion silently covers less than it appears to.
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);

    // The frame contract, a separate list on purpose: a Mangrove page header is
    // not a Delta application toolbar, so the two frames cannot share one.
    expect(MANGROVE_FRAME_CANARY_IDS.length).toBe(4);
    for (const id of MANGROVE_FRAME_CANARY_IDS) {
      await expect(page.locator(frameCanarySelector(id)), id).toHaveCount(1);
    }
  });

  test("known-issues box is host chrome in both candidate states", async ({ page }) => {
    // It reaches the page through the frame's `notices` prop, so it must render
    // OUTSIDE the candidate root in both states: outside, so no candidate
    // stylesheet can restyle it, and in both states, so it is in the leakage
    // baseline too and cannot itself register as a difference.
    for (const state of ["on", "off"] as const) {
      await page.goto(`${URL}?candidate=${state}`);
      await expect(page.locator(".undrr-known-issues"), state).toHaveCount(1);
      await expect(
        page.locator("[data-candidate-root] .undrr-known-issues"),
        `${state}: box must not be inside the candidate subtree`,
      ).toHaveCount(0);
    }
  });

  test("view switcher is host chrome, and the candidate cannot restyle it", async ({
    page,
  }) => {
    // Reaches the page through the frame's `notices` slot, so it must sit outside
    // the candidate root in both states — same contract as the known-issues box.
    const readStrip = async () =>
      page.locator('nav[aria-label="Demo views"]').evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          insideCandidateRoot: el.closest("[data-candidate-root]") !== null,
          background: cs.backgroundColor,
          borderInlineStartWidth: cs.borderInlineStartWidth,
          color: cs.color,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          padding: cs.padding,
        };
      });

    await page.goto(`${URL}?candidate=off`);
    const withoutCandidate = await readStrip();

    await page.goto(`${URL}?candidate=on`);
    const withCandidate = await readStrip();

    expect(withoutCandidate.insideCandidateRoot).toBe(false);
    expect(withCandidate.insideCandidateRoot).toBe(false);

    // The leakage assertion only watches `[data-canary]` elements, so it would not
    // notice the candidate restyling this strip. Diffing it across the two loads is
    // the same method applied to the chrome the switcher adds.
    expect(
      withCandidate,
      "the candidate's stylesheet changed the host view switcher",
    ).toEqual(withoutCandidate);

    // Links, not dead ends: this pairing ships island + inventory, and the island
    // is the current view so it is not a link.
    await expect(page.locator('nav[aria-label="Demo views"] a')).not.toHaveCount(0);
    await expect(page.locator('nav[aria-label="Demo views"] [aria-current="page"]')).toHaveCount(
      1,
    );
    // The full-application view is Delta-only and must not be offered here.
    await expect(page.locator('nav[aria-label="Demo views"] a[href="./app.html"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('nav[aria-label="Demo views"] a[href="./index.html"]'),
    ).toHaveCount(1);
  });

  test("view switcher mirrors under RTL", async ({ page }) => {
    // It uses logical properties (`ms-`/`ps-`/`border-s`), which SHOULD mirror on
    // their own — but the frame sets `dir` on a wrapper rather than on <html>, and
    // this run already found that a portal escaping that wrapper loses direction.
    // Verified rather than assumed.
    await page.goto(`${URL}?candidate=on`);

    const separator = page.locator('nav[aria-label="Demo views"] li').last();
    const ltr = await separator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { left: cs.borderLeftWidth, right: cs.borderRightWidth };
    });
    expect(ltr.left, "LTR: inline-start border should be on the left").not.toBe("0px");
    expect(ltr.right).toBe("0px");

    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    const rtl = await separator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        direction: cs.direction,
        left: cs.borderLeftWidth,
        right: cs.borderRightWidth,
      };
    });
    expect(rtl.direction).toBe("rtl");
    expect(rtl.right, "RTL: inline-start border should have moved to the right").not.toBe("0px");
    expect(rtl.left).toBe("0px");
  });

  test("candidate=off leaves the candidate region empty", async ({ page }) => {
    // The precondition the leakage assertion depends on. Asserted separately so
    // a regression here is diagnosed as "baseline broken" rather than showing up
    // as a mysterious leakage pass.
    await page.goto(`${URL}?candidate=off`);
    await expect(page.locator("[data-candidate-root] *")).toHaveCount(0);
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);
  });

  test("filters the table through the facet controls", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const count = page.locator(".demo-filters__count");
    await expect(count).toHaveText("250 / 250");

    // Text filter.
    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(count).not.toHaveText("250 / 250");

    // Clearing restores the full set. `Clear filters` is disabled until a facet
    // is actually narrowing, which is application logic React Aria does not
    // supply — asserted so the disabled state is measured, not assumed.
    const clear = page.getByRole("button", { name: "Clear filters" });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(count).toHaveText("250 / 250");
    await expect(clear).toBeDisabled();

    // Hazard facet, through React Aria's Select and its portalled listbox.
    await page.locator(".demo-select__trigger").first().click();
    await page.getByRole("option", { name: "Drought", exact: true }).click();
    await expect(count).not.toHaveText("250 / 250");
    await expect(page.locator("[data-candidate-root] tbody tr").first()).toBeVisible();
  });

  test("paginates, and resets to the first page when a facet changes", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const status = page.locator(".demo-pagination__status");
    await expect(status).toHaveText("1–10 / 250");

    const previous = page.getByRole("button", { name: "Previous" });
    await expect(previous).toBeDisabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(status).toHaveText("11–20 / 250");
    await expect(previous).toBeEnabled();

    // Page reset on filter change. React Aria models no pagination at all, so
    // this is entirely application code and is exactly the kind of thing that
    // breaks silently — a user left on page 3 of a 1-page result set.
    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(status).toContainText("1–");
    await expect(previous).toBeDisabled();
  });

  test("sorts on a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const header = page.getByRole("columnheader", { name: "Country" });
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", /ascending|descending/);
    await expect(page.locator("[data-candidate-root] tbody tr")).toHaveCount(10);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });

    writeJson("test-results/leakage-island.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    // Recorded either way: a failure is documented, not swallowed.
    expect(
      result.differences,
      `host canaries changed after mounting React Aria in the island frame:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("leakage-island.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // `dir` goes to the frame, because the frame's own markup is not React
    // Aria's to flip; I18nProvider mirrors the components themselves.
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    // The table must mirror rather than merely sit inside an RTL container.
    const inlineStart = await page
      .locator("[data-candidate-root] th")
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(inlineStart).toBe("rtl");

    // The facet listbox is PORTALLED to document.body, outside the frame's `dir`
    // element, so CSS direction does not inherit into it. It renders LTR in Arabic
    // unless direction is re-applied by hand — see views/records-state.ts
    // (useOverlayDir). Asserted here because the wrapper being RTL proves nothing
    // about a portal.
    await page.locator(".demo-select__trigger").first().click();
    const popover = page.locator(".demo-popover").first();
    await expect(popover).toBeVisible();
    expect(
      await popover.evaluate((el) => ({
        direction: getComputedStyle(el).direction,
        outsideFrame: el.closest("[data-candidate-root]") === null,
      })),
    ).toEqual({ direction: "rtl", outsideFrame: true });
  });

  test("axe on the candidate region and the whole framed page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    // Scoped first, so the recorded numbers describe the candidate rather than
    // the host frame.
    const scoped = await runAxe(page, {
      section: "island-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-candidate-subtree.json", scoped);

    // Whole page includes the frame's `role="menubar"` navigation, which is a
    // deliberate ARIA adversary: a candidate rendering its own menu beside it
    // either agrees with Mangrove on semantics or does not.
    const wholePage = await runAxe(page, { section: "island-whole-page" });
    writeJson("test-results/axe-island-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe island scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete | whole page: ` +
        `${wholePage.counts.violations} violations ` +
        `(${wholePage.counts.critical} critical, ${wholePage.counts.serious} serious), ` +
        `${wholePage.counts.incomplete} incomplete`,
    );

    await testInfo.attach("axe-island-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });
  });

  test("screenshots per viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "island-00-full-page", testInfo);

    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-filters", testInfo, { fullPage: false });

    // The seam is the point of this view: the boundary where Mangrove prose meets
    // the candidate's first and last components.
    await page.locator(frameCanarySelector("frame-prose-after")).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-02-boundary", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "island-00-full-page", testInfo, { rtl: true });
    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-filters", testInfo, { rtl: true, fullPage: false });
    await page.locator(frameCanarySelector("frame-prose-after")).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-02-boundary", testInfo, { rtl: true, fullPage: false });
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    // Written before the assertion so the evidence exists even when this fails.
    writeJson(`test-results/long-labels-island-${testInfo.project.name}.json`, {
      view: "island",
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${overflow}px in German at ` +
        `${testInfo.project.name}. Not weakened to pass: recorded in evidence.json.`,
    ).toBeLessThanOrEqual(1);
  });
});
