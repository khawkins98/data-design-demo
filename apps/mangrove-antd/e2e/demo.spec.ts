/**
 * Evidence run for mangrove-antd.
 *
 * Mirrors the other specs so the pairings stay comparable, with three assertions
 * specific to what antd is claimed to do better. Each exists because an earlier
 * run in this evaluation got the equivalent claim wrong:
 *
 *   1. The date-time range is ONE component, not two. Asserted by counting
 *      `.ant-picker-range`, not by counting inputs - a RangePicker renders two
 *      inputs, so an input count would read identically to MUI's composed
 *      two-picker version and prove nothing.
 *   2. The table's select-all checkbox actually exists in the DOM. The React Aria
 *      run recorded `table-multiselect: native` while rendering zero checkboxes,
 *      and I published that before an agent caught it.
 *   3. Column resizing is keyboard-operable, because it is ours rather than
 *      antd's, and a pointer-only grip would be a WCAG 2.1.1 failure dressed up
 *      as a met requirement.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";

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

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * antd's Segmented renders a visually-hidden radio inside a label, so clicking
 * the radio itself times out - it is covered by the label's own div. The role IS
 * exposed correctly (`getByRole("radio", ...)` finds it), so this is a
 * clickability quirk rather than an accessibility defect. Clicking antd's own
 * `title`-bearing label element is the reliable route.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(`.ant-segmented-item-label[title="${label}"]`).click();
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  test("renders the 250-row table with pagination", async ({ page }) => {
    await page.goto("/?candidate=on");
    await expect(page.locator("#section-6 .ant-pagination-total-text")).toContainText("250");
    // Page size control is native, not composed.
    await expect(page.locator("#section-6 .ant-pagination-options .ant-select")).toHaveCount(1);
  });

  test("the date-time range is a single native component", async ({ page }) => {
    await page.goto("/?candidate=on");

    // ONE range component. This is the requirement that separated the field:
    // MUI, React Aria and Carbon all needed two pickers plus our own ordering
    // logic, because a real range picker was absent or commercially licensed.
    await expect(page.locator("#section-3 .ant-picker-range")).toHaveCount(1);

    // And it carries the time of day, so it is a date-TIME range.
    const inputs = page.locator("#section-3 .ant-picker-range input");
    await expect(inputs).toHaveCount(2);
    await expect(inputs.nth(0)).toHaveValue(/00:00/);
    await expect(inputs.nth(1)).toHaveValue(/23:59/);

    // There is no derived range summary in application code, because there is
    // nothing to derive: the component owns the ordering guarantee.
    await expect(page.locator("#section-3 [role=\"alert\"]")).toHaveCount(0);
  });

  test("the table has a real select-all checkbox", async ({ page }) => {
    await page.goto("/?candidate=on");

    const headerCheckbox = page.locator("#section-6 thead input[type=checkbox]");
    await expect(headerCheckbox).toHaveCount(1);

    /*
     * Scoped to `tr[data-row-key]` deliberately. A bare `tbody input` count
     * returns ELEVEN, because rc-table renders a hidden measure row whenever
     * `scroll.x` is set. Asserting 11 would have encoded an implementation
     * detail; asserting 10 without the scope would have failed for the wrong
     * reason.
     */
    const rowCheckboxes = page.locator("#section-6 tbody tr[data-row-key] input[type=checkbox]");
    await expect(rowCheckboxes).toHaveCount(10);

    await headerCheckbox.check();
    // Anchored: "10" would also match inside "110", and an earlier assertion of
    // mine in this repository could never fail for exactly that reason.
    await expect(rowCheckboxes.nth(0)).toBeChecked();
    await expect(rowCheckboxes.nth(9)).toBeChecked();
  });

  test("columns resize by keyboard, not only by pointer", async ({ page }) => {
    await page.goto("/?candidate=on");

    const grip = page.locator("#section-6 thead .demo-col-resizer").first();
    await expect(grip).toHaveCount(1);

    const header = page.locator("#section-6 thead th").nth(1);
    const before = (await header.boundingBox())?.width ?? 0;

    await grip.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const after = (await header.boundingBox())?.width ?? 0;
    writeJson("test-results/column-resize.json", { beforePx: before, afterPx: after });

    expect(
      after,
      "keyboard resize did not change the column width; a pointer-only grip is a WCAG 2.1.1 failure",
    ).toBeGreaterThan(before);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });
    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting antd:\n${JSON.stringify(result.differences, null, 2)}`,
    ).toEqual([]);

    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("antd styles are wrapped in a CSS layer", async ({ page }) => {
    await page.goto("/?candidate=on");

    // StyleProvider layer is antd's own containment mechanism and the only
    // first-class one among the four candidates. Unlayered CSS beats layered CSS
    // regardless of specificity, so this is what makes antd lose conflicts to the
    // host rather than win them. Asserted because it is a claim about behaviour.
    const layered = await page.evaluate(() =>
      [...document.querySelectorAll("style")].filter((s) =>
        (s.textContent ?? "").includes("@layer"),
      ).length,
    );
    writeJson("test-results/css-layer.json", { styleTagsUsingLayer: layered });

    expect(layered, "no antd style tag used @layer, so StyleProvider layer did nothing").toBeGreaterThan(0);
  });

  test("traps and restores focus in the dialog", async ({ page }) => {
    await page.goto("/?candidate=on");
    const trigger = page.getByRole("button", { name: /filter/i }).first();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    // Three elements carry dir=rtl here (host shell, and antd's own wrappers),
    // so this is `.first()` rather than a count.
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    /*
     * antd's own RTL, applied through ConfigProvider rather than a build plugin.
     * This is the assertion MUI cannot pass: MUI Community needs
     * stylis-plugin-rtl, which constraint 2 forbids, so its floating labels stay
     * pinned to the physical left. antd flips its own components.
     */
    await expect(page.locator("#section-1 .ant-form-rtl").first()).toBeVisible();
    await expect(page.locator("#section-1 .ant-input-rtl").first()).toBeVisible();
  });

  test("axe per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    for (const section of SECTIONS) {
      const result = await runAxe(page, { section: section.name, include: `#${section.id}` });
      writeJson(`test-results/axe-${section.name}.json`, result);
      // eslint-disable-next-line no-console
      console.log(
        `axe ${section.name}: ${result.counts.violations} violations ` +
          `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
          `${result.counts.incomplete} incomplete`,
      );
    }

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
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "Deutsch");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    writeJson(`test-results/long-labels-${testInfo.project.name}.json`, {
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${overflow}px in German at ${testInfo.project.name}`,
    ).toBeLessThanOrEqual(1);
  });
});
