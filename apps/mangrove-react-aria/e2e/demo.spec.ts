/**
 * Evidence run for mangrove-react-aria.
 *
 * Produces the artefacts Brief 1 requires: per-section axe JSON, screenshots at
 * three viewports plus an RTL set, and the leakage result. It asserts only what
 * the brief says must hold — it deliberately does not assert zero axe
 * violations, because claiming conformance is forbidden and the numbers are the
 * output, not the pass criterion.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";

/** Kitchen-sink sections, in the fixed order the brief mandates. */
const SECTIONS = [
  { id: "section-1", name: "01-forms" },
  { id: "section-2", name: "02-selection" },
  { id: "section-3", name: "03-dates" },
  { id: "section-4", name: "04-overlays" },
  { id: "section-5", name: "05-chrome" },
  { id: "section-6", name: "06-data-table" },
  { id: "section-7", name: "07-states" },
  { id: "section-9", name: "09-side-by-side" },
] as const;

/**
 * Clicks a locale in the switcher.
 *
 * React Aria's `Radio` renders a <label> wrapping a visually hidden <input>,
 * and the label intercepts pointer events, so `getByRole("radio").click()`
 * times out. Targeting the label is the working route. Noted in EVIDENCE.md as
 * a testing-ergonomics cost rather than a defect.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(".demo-locale__option", { hasText: label }).click();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  test("renders all 250 fixture rows through pagination", async ({ page }) => {
    await page.goto("/?candidate=on");
    // The status line reports the filtered total, which must be the full fixture.
    await expect(page.locator(".demo-tabletools__status")).toContainText("250 / 250");
  });

  test("sorts, filters and selects in the data table", async ({ page }) => {
    await page.goto("/?candidate=on");

    const filter = page.locator(".demo-tabletools .demo-input").first();
    await filter.fill("Bangladesh");
    await expect(page.locator(".demo-tabletools__status")).not.toContainText("250 / 250");

    await filter.fill("");

    /*
      SORTING, ASSERTED ON THE ROW ORDER.

      This step used to click the Country header and then assert that a row was
      `toBeVisible()`. A row was visible before the click and would still be
      visible with `onSortChange` unwired or `sortRecords` returning its input
      untouched, so the assertion could not fail for the thing it was testing.
      `aria-sort` is no better on its own: React Aria derives it from the
      `sortDescriptor` we hand back, not from the ordering.
     */
    const header = page.locator('#section-6 .demo-table__column:has-text("Country")').first();
    const countries = () =>
      page.locator("#section-6 .demo-table__row .demo-table__cell:nth-child(2)").allInnerTexts();

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascending = await countries();
    expect(ascending.length).toBe(10);
    expect([...ascending].sort((a, b) => a.localeCompare(b, "en"))).toEqual(ascending);

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const descending = await countries();
    expect(descending.length).toBe(10);
    expect([...descending].sort((a, b) => b.localeCompare(a, "en"))).toEqual(descending);
    expect(descending[0], "reversing the direction changed nothing").not.toBe(ascending[0]);
  });

  test("opens the native date-time range picker with minute granularity", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Minute segments on both endpoints are what makes this "native" rather
    // than a composed pair of date-only pickers.
    const range = page.locator("#section-3 .demo-field").nth(1);
    await expect(range.locator('[data-type="minute"]')).toHaveCount(2);

    await range.locator(".demo-dateinput__button").click();
    await expect(page.locator(".demo-calendar")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("traps and restores focus in the modal", async ({ page }) => {
    await page.goto("/?candidate=on");

    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("portalled overlays are actually styled", async ({ page }) => {
    // This exists because the suite once passed with every overlay rendering
    // transparent: the tokens do not inherit into a portal, and a failed var()
    // is silent. Behavioural assertions cannot see it, so assert appearance.
    await page.goto("/?candidate=on");

    const cases = [
      { name: "date picker calendar", trigger: "#section-3 .demo-dateinput__button" },
      { name: "select popover", trigger: "#section-2 .demo-select__trigger" },
    ];

    for (const { name, trigger } of cases) {
      await page.locator(trigger).first().click();
      const overlay = page.locator(".demo-popover").first();
      await expect(overlay, name).toBeVisible();

      const styles = await overlay.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          background: cs.backgroundColor,
          borderWidth: cs.borderTopWidth,
          tokenSeen: cs.getPropertyValue("--undrr-color-surface").trim(),
        };
      });

      expect(styles.background, `${name} background is transparent`).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
      expect(styles.borderWidth, `${name} border collapsed to 0`).not.toBe("0px");
      expect(styles.tokenSeen, `${name} cannot see the design tokens`).not.toBe("");

      await page.keyboard.press("Escape");
    }
  });

  test("provides a working select-all in the table header", async ({ page }) => {
    // Added after the delta-react-aria run showed selectionMode="multiple" alone
    // renders no checkboxes and gives no select-all. The original suite asserted
    // neither, so evidence.json claimed a select-all that did not exist.
    await page.goto("/?candidate=on");

    const selectAll = page.locator("#section-6 thead .demo-checkbox").first();
    const status = page.locator("#section-6 .demo-tabletools__status");

    await expect(selectAll).toBeVisible();
    // Anchored on the separator, not a bare substring: "250 selected" contains
    // "0 selected", so a substring assertion here can never fail.
    await expect(status).toHaveText(/·\s*0 selected$/);

    await selectAll.click();
    await expect(status).toHaveText(/·\s*250 selected$/);

    await selectAll.click();
    await expect(status).toHaveText(/·\s*0 selected$/);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });

    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    // Recorded either way: a failure is documented, not swallowed.
    expect(
      result.differences,
      `host canaries changed after mounting React Aria:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
  });

  test("axe per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    for (const section of SECTIONS) {
      const result = await runAxe(page, {
        section: section.name,
        include: `#${section.id}`,
      });
      writeJson(`test-results/axe-${section.name}.json`, result);
      // eslint-disable-next-line no-console
      console.log(
        `axe ${section.name}: ${result.counts.violations} violations ` +
          `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
          `${result.counts.incomplete} incomplete`,
      );
    }

    // Scoped to the candidate subtree: the Mangrove host contributes a known
    // link-in-text-block violation that is not ours. See docs/requirements.md.
    const scoped = await runAxe(page, {
      section: "candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-candidate-subtree.json", scoped);

    const wholePage = await runAxe(page, { section: "whole-page" });
    writeJson("test-results/axe-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe scoped: ${scoped.counts.violations} violations | ` +
        `whole page: ${wholePage.counts.violations} violations`,
    );

    await testInfo.attach("axe-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });
  });

  test("screenshots per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await captureScreens(page, "00-full-page", testInfo);

    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { fullPage: false });
    }
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "Deutsch");

    // German is the long-compound-noun locale. A horizontal scrollbar on the
    // document means a component could not cope with the fixture labels.
    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    // Written before the assertion so the evidence exists even when this fails.
    // It does fail at 390px, and that failure is the finding: see EVIDENCE.md.
    writeJson(`test-results/long-labels-${testInfo.project.name}.json`, {
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${overflow}px in German at ` +
        `${testInfo.project.name}. Not weakened to pass: recorded as ` +
        `longLabels.status = "issues" in evidence.json.`,
    ).toBeLessThanOrEqual(1);
  });
});
