/**
 * Evidence run for the mangrove-mui EMBEDDED ISLAND view (`island.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/mangrove-mui/e2e/demo.spec.ts`, so the three views of this pairing are
 * directly comparable. What differs is what is being measured.
 *
 * The leakage assertion is the important one here and it is measuring more than
 * the kitchen sink's does. In the kitchen sink the candidate sits after a canary
 * block inside an otherwise plain content column. In this view it sits inside the
 * real published UNDRR page frame: a four-colour decoration bar, the masthead and
 * logo, `mg-mega-topbar` navigation with `role="menubar"`, and host prose
 * immediately above and below the candidate region. The same 14 canaries are
 * diffed, but they are now diffed with real neighbouring content either side of
 * the candidate rather than above it only — so a candidate whose last component
 * collapses a following margin, or whose reset reaches a sibling `p`, has
 * somewhere to show up that the kitchen sink does not provide.
 *
 * The frame's own chrome carries a SEPARATE contract (`data-frame-canary`,
 * `MANGROVE_FRAME_CANARY_IDS`) and is asserted for presence here. See
 * packages/test-harness/src/frame-canaries.ts for why it is separate from
 * `CANARY_IDS` rather than an extension of it.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import { MANGROVE_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The island's entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/island.html";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** MUI's ToggleButton renders a real button, so role targeting works here. */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** Opens a MUI Select and picks an option from its portalled listbox. */
async function chooseOption(page: Page, field: string, option: string): Promise<void> {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  // The listbox is portalled and animates out; wait for it to go before
  // interacting with anything underneath it.
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Exactly one candidate region, and the filter table lives inside it.
    await expect(page.locator("[data-candidate-root]")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] .MuiDataGrid-root")).toHaveCount(1);

    // The known-issues box is host chrome and must sit OUTSIDE the candidate
    // subtree, where no candidate stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return root?.querySelectorAll("[class*='known-issues']").length ?? -1;
    });
    expect(insideCandidate, "the known-issues box is inside the candidate subtree").toBe(0);
  });

  test("the candidate subtree is empty with candidate=off", async ({ page }) => {
    // The premise the leakage assertion rests on: the baseline load must contain
    // the host frame and nothing of the candidate's.
    await page.goto(`${URL}?candidate=off`);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        children: root?.children.length ?? -1,
        innerHtmlLength: root?.innerHTML.length ?? -1,
        canaries: document.querySelectorAll("[data-canary]").length,
      };
    });

    writeJson("test-results/island-candidate-off.json", state);

    expect(state.children, "candidate=off left content in the candidate subtree").toBe(0);
    expect(state.innerHtmlLength).toBe(0);
    expect(state.canaries).toBe(CANARY_IDS.length);
  });

  test("renders every host canary and every frame canary", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    for (const id of CANARY_IDS) {
      await expect(page.locator(`[data-canary="${id}"]`), id).toHaveCount(1);
    }
    for (const id of MANGROVE_FRAME_CANARY_IDS) {
      await expect(page.locator(`[data-frame-canary="${id}"]`), id).toHaveCount(1);
    }

    // Nothing beyond the two contracts, so a frame that starts rendering extra
    // chrome does not do it unnoticed.
    await expect(page.locator("[data-frame-canary]")).toHaveCount(
      MANGROVE_FRAME_CANARY_IDS.length,
    );
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });
    writeJson("test-results/island-leakage.json", result);

    // Same 14 canaries as the kitchen sink. If this number ever drops, the frame
    // stopped rendering part of the contract and the assertion silently covers
    // less than the kitchen sink's does.
    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting MUI inside the island frame:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("island-leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("filters the table from the controls above it", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const footer = page.locator(".MuiTablePagination-displayedRows");
    await expect(footer).toContainText("250");

    await chooseOption(page, "Hazard type", "Drought");

    // The count line above the grid and the grid footer must agree, because they
    // are driven by the same filtered array.
    await expect(page.locator("[data-candidate-root]")).toContainText("34 / 250");
    await expect(footer).toContainText("34");
    await expect(page.locator(".MuiDataGrid-row")).toHaveCount(10);
  });

  test("paginates the filtered result", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const footer = page.locator(".MuiTablePagination-displayedRows");
    await expect(footer).toContainText("1–10");

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(footer).toContainText("11–20");
    await expect(page.locator(".MuiDataGrid-row")).toHaveCount(10);

    await page.getByRole("button", { name: "Go to previous page" }).click();
    await expect(footer).toContainText("1–10");
  });

  test("resets to page one when a filter changes", async ({ page }) => {
    // Pagination state and filter state are separate in DataGrid, so a filter
    // change on page 3 would otherwise strand the reader on an empty page.
    await page.goto(`${URL}?candidate=on`);

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(page.locator(".MuiTablePagination-displayedRows")).toContainText("11–20");

    await chooseOption(page, "Hazard type", "Drought");
    await expect(page.locator(".MuiTablePagination-displayedRows")).toContainText("1–10");
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
    // The frame root is what carries it, i.e. the host chrome flips with the
    // candidate rather than the candidate flipping alone inside an LTR page.
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);
  });

  /**
   * The known MUI RTL defect, measured in THIS layout rather than assumed from
   * the kitchen sink's measurement.
   *
   * Mechanism is identical: `MuiInputLabel-outlined` is positioned with a
   * physical `left: 0` plus `transform: translate(14px, -9px)`, which theme
   * direction does not flip, and the documented fix (stylis-plugin-rtl) is a
   * third-party package Brief 1 constraint 2 forbids.
   *
   * The magnitude differs, and that is the point of recording it here. The
   * kitchen sink's worst case is a full-width field, where the label lands 843px
   * from the field it names. The island's filter controls sit in ~280px grid
   * columns, so the displacement is bounded by the column width: the label still
   * sits at the wrong END of its own field, but it no longer crosses the page and
   * cannot reach the host prose either side of the region. Less spectacular, and
   * still wrong on every labelled control in the view.
   */
  test("RTL leaves MUI's floating labels at the wrong end of the field", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    const measurement = await page.evaluate(() => {
      const rows: Array<Record<string, number | string | null>> = [];
      for (const label of document.querySelectorAll(
        "[data-candidate-root] .MuiInputLabel-root",
      )) {
        const control = label.closest(".MuiFormControl-root");
        const field = control?.querySelector(".MuiInputBase-root");
        if (!field) continue;
        const l = label.getBoundingClientRect();
        const f = field.getBoundingClientRect();
        rows.push({
          label: (label.textContent ?? "").slice(0, 24),
          // In RTL the field's inline start is its RIGHT edge. MUI reserves 14px
          // there for the notch, so a correct label sits within ~16px of it.
          inlineStartOffsetPx: Math.round(f.right - l.right),
          fieldWidthPx: Math.round(f.width),
          labelCssLeft: getComputedStyle(label).left,
        });
      }
      return rows;
    });

    const offsets = measurement.map((row) => Number(row["inlineStartOffsetPx"]));

    writeJson("test-results/island-rtl-label-offset.json", {
      labelsMeasured: measurement.length,
      maxOffsetPx: Math.max(...offsets),
      minOffsetPx: Math.min(...offsets),
      fields: measurement,
      note:
        "Bounded by the filter grid's column width rather than the content column " +
        "width, so smaller than the kitchen sink's 843px worst case. Same defect.",
    });

    expect(measurement.length, "no labelled controls found to measure").toBeGreaterThan(0);

    // ASSERTS THE DEFECT, deliberately, so the day MUI fixes it this test fails
    // and the evidence gets revisited rather than quietly going stale.
    expect(
      Math.max(...offsets),
      "MUI's RTL floating-label defect appears to be fixed; re-measure and update " +
        "the known-issues registry (mui-rtl-unfixable)",
    ).toBeGreaterThan(16);
  });

  test("axe on the candidate region and the whole page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const scoped = await runAxe(page, {
      section: "island-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-candidate-subtree.json", scoped);

    // Whole page includes the island frame's own chrome: the Mangrove host's known
    // `link-in-text-block` serious violation on its canary paragraph, and the
    // `role="menubar"` navigation the frame renders deliberately as an adversary
    // for this run. Both are host baseline, not ours: see docs/requirements.md and
    // the note at the top of IslandFrame.tsx.
    const wholePage = await runAxe(page, { section: "island-whole-page" });
    writeJson("test-results/axe-island-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe island scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete | ` +
        `whole page: ${wholePage.counts.violations} violations ` +
        `(rules: ${wholePage.violations.map((v) => v.id).join(", ") || "none"})`,
    );

    await testInfo.attach("axe-island-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });

    // The candidate region is ours to answer for, so it is asserted rather than
    // only recorded.
    expect(
      scoped.counts.critical,
      `critical axe violations in the candidate region: ${scoped.violations
        .map((v) => v.id)
        .join(", ")}`,
    ).toBe(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "island-00-full-page", testInfo);

    // The seam between host prose and the candidate region is what this view
    // exists to show, so it gets its own viewport-sized shot.
    await page.locator("[data-candidate-root]").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, { fullPage: false });

    await chooseOption(page, "Hazard type", "Drought");
    await captureScreens(page, "island-02-filtered", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "island-00-full-page", testInfo, { rtl: true });
    await page.locator("[data-candidate-root]").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, {
      rtl: true,
      fullPage: false,
    });
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    writeJson(`test-results/island-long-labels-${testInfo.project.name}.json`, {
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
