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
import { arSD, deDE, frFR } from "@mui/x-data-grid/locales";

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

  /**
   * The status column, asserted on its content rather than its existence.
   *
   * The pill is the ONLY rendering of `verificationStatus` in the grid and it was
   * covered by a single visibility check, which 250 identical pills would have
   * satisfied. In this view the pill also comes out of a `renderCell` inside a
   * VIRTUALISED grid, so only the mounted rows can be read — one more reason to
   * assert what they say rather than that one of them exists.
   */
  test("status pills read the row's own status, and the variant tracks it", async ({ page }) => {
    const VARIANT: Record<string, string> = {
      verified: "MuiChip-colorSuccess",
      pending: "MuiChip-colorWarning",
      disputed: "MuiChip-colorError",
      withdrawn: "MuiChip-colorDefault",
    };

    await page.goto(`${URL}?candidate=on`);

    const readPills = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".MuiDataGrid-row .MuiChip-root")].map((chip) => ({
          text: (chip.textContent ?? "").trim(),
          className: chip.className,
        })),
      );

    // One pill per mounted row, whatever the virtualiser has mounted.
    const unfiltered = await readPills();
    expect(unfiltered.length).toBe(await page.locator(".MuiDataGrid-row").count());
    expect(unfiltered.length).toBeGreaterThan(1);
    for (const pill of unfiltered) {
      expect(Object.keys(VARIANT), `unknown status text "${pill.text}"`).toContain(pill.text);
      expect(
        pill.className,
        `pill "${pill.text}" carries the wrong colour variant: ${pill.className}`,
      ).toContain(VARIANT[pill.text] as string);
    }
    expect(
      new Set(unfiltered.map((pill) => pill.text)).size,
      "every pill on page one reads the same status; the pill is not reading its row",
    ).toBeGreaterThan(1);

    for (const status of Object.keys(VARIANT)) {
      await chooseOption(page, "Verification status", status);
      // Retrying assertion first, so the grid has re-rendered before the one-shot
      // `evaluate` below reads the DOM.
      await expect(page.locator(".MuiDataGrid-row .MuiChip-root").first()).toHaveText(status);
      const pills = await readPills();
      expect(pills.length, `no rows left after filtering to "${status}"`).toBeGreaterThan(0);
      for (const pill of pills) {
        expect(pill.text, `filtered to "${status}" but a pill reads "${pill.text}"`).toBe(status);
        expect(pill.className).toContain(VARIANT[status] as string);
      }
    }

    writeJson("test-results/island-status-pills.json", { unfiltered });
  });

  /**
   * The grid footer in the three non-English locales.
   *
   * The strings come from MUI X's OWN pack (`@mui/x-data-grid/locales`), merged
   * under the one fixture label the grid takes, in `IslandView.tsx`. Expected values
   * are imported from the pack rather than copied out of it, so a pack change moves
   * the test. Arabic is `arSD` because MUI X ships no `arEG`; that mismatch is
   * recorded at `GRID_LOCALES` and is visible here in the pack the test imports.
   */
  test("localises the grid footer from MUI X's own locale pack", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const rowsPerPage = page.locator(".MuiTablePagination-selectLabel");
    const displayed = page.locator(".MuiTablePagination-displayedRows");

    await expect(rowsPerPage).toHaveText("Rows per page:");
    await expect(displayed).toHaveText("1–10 of 250");

    const cases = [
      { locale: "Français", pack: frFR },
      { locale: "Deutsch", pack: deDE },
      { locale: "العربية", pack: arSD },
    ] as const;

    const recorded: Array<Record<string, string>> = [];

    for (const { locale, pack } of cases) {
      await selectLocale(page, locale);

      const text = pack.components.MuiDataGrid.defaultProps.localeText;
      const expectedRows = text.paginationRowsPerPage as string;
      const displayedRows = text.paginationDisplayedRows as (info: {
        from: number;
        to: number;
        count: number;
        page: number;
        paginationMode: "client" | "server";
        estimated?: number;
      }) => string;
      const expectedDisplayed = displayedRows({
        from: 1,
        to: 10,
        count: 250,
        page: 0,
        paginationMode: "client",
      });

      await expect(
        rowsPerPage,
        `the grid footer is still English in ${locale}; the MUI X pack is not wired`,
      ).toHaveText(expectedRows);
      await expect(displayed).toHaveText(expectedDisplayed);

      recorded.push({ locale, expectedRows, expectedDisplayed });
    }

    // Arabic-Indic digits, i.e. the pack is formatting the counts for the locale
    // rather than only swapping the words around them.
    await expect(displayed).toHaveText(/[٠-٩]/);

    writeJson("test-results/island-pagination-locale.json", recorded);
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
   * THIS TEST DID EXACTLY WHAT IT WAS BUILT TO DO, so read the inversion below as
   * the mechanism working rather than as a test being bent to fit.
   *
   * It used to assert the defect - `toBeGreaterThan(16)` - with the comment
   * "asserts the defect, deliberately, so the day MUI fixes it this test fails and
   * the evidence gets revisited rather than quietly going stale". Wiring MUI's
   * documented RTL step 3 (`@mui/stylis-plugin-rtl` in an emotion cache; see
   * src/direction.tsx) fixed the defect, this assertion failed on the next run,
   * and the evidence is being revisited. That is the whole point of writing tests
   * against findings and not only against features.
   *
   * The defect it recorded: `MuiInputLabel-outlined` is positioned with a physical
   * `left: 0` plus `transform: translate(14px, -9px)`, which theme direction alone
   * does not flip, so in Arabic every floating label sat at the wrong END of its
   * own field. Bounded here by the filter grid's ~280px columns rather than the
   * full content width, which is why the island's numbers were always smaller than
   * the kitchen sink's - same defect, less spectacular.
   *
   * It now asserts the correct state, on the same measurement, with the same 16px
   * tolerance. Nothing about the metric changed: `f.right - l.right` was already
   * the logical-start distance under RTL, which is why this file needed only its
   * comparison inverted while the kitchen-sink twin needed its metric rewritten.
   */
  test("RTL puts MUI's floating labels at the field's logical start", async ({ page }) => {
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
        "Every label must sit within 16px of its field's logical start - the 14px " +
        "MUI reserves for the outline notch. Before @mui/stylis-plugin-rtl was " +
        "wired, these offsets were bounded only by the filter grid's column width.",
    });

    expect(measurement.length, "no labelled controls found to measure").toBeGreaterThan(0);

    // EVERY label, not the average: one control left behind by the flip is the
    // defect returning on a narrower path.
    expect(
      Math.max(...offsets),
      "a floating label is not at its field's logical start; check that the " +
        "emotion RTL cache in src/direction.tsx still wraps this view",
    ).toBeLessThanOrEqual(16);
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
