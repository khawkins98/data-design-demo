/**
 * Evidence run for the delta-mui FULL APPLICATION view (`app.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/delta-mui/e2e/demo.spec.ts`, so the three views of this pairing are
 * directly comparable.
 *
 * READ THE LEAKAGE RESULT FROM THIS VIEW WITH CARE, and the frame says so itself:
 * when the candidate owns the viewport there is almost no host markup left to leak
 * onto, so a clean result here means less than the same result from the kitchen
 * sink — the target shrank rather than the candidate improving. The frame keeps a
 * host strip below the application region precisely so the assertion still has all
 * 14 canaries to compare, and this spec asserts that count rather than trusting
 * it. Layout coverage is what this view is for; the kitchen sink and the island
 * are where leakage is read.
 *
 * The frame's own chrome carries a SEPARATE contract (`data-frame-canary`,
 * `DELTA_FRAME_CANARY_IDS`), including `frame-mangrove-in-delta` — a genuine
 * `mg-button` inside a Tailwind page, which is the coexistence real DELTA imposes
 * and no other view tests.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { arEG, deDE, frFR } from "@mui/material/locale";

import { LABELS } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import { DELTA_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The application entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/app.html";

/**
 * Every table locator is scoped to the candidate region, because the frame's host
 * strip below it contains a canary TABLE of its own. An unscoped `tbody tr` counts
 * the host's three canary rows as well as the candidate's ten, which is how this
 * spec first went wrong — and it would have quietly counted host rows as candidate
 * rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

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
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

/**
 * The first row's delete action.
 *
 * Its accessible name is built from the fixture labels, so it is localised: the
 * Arabic pass cannot look for "Delete". The label set is read from the fixtures
 * rather than hard-coded, so a fixture change moves the test with it.
 */
function deleteButton(page: Page, locale: LocaleCode = "en") {
  const verb = LABELS[locale].actionDelete;
  return page.getByRole("button", { name: new RegExp(`^${verb} DRR-\\d{4}$`) }).first();
}

test.describe("full application", () => {
  test("renders the whole records screen inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator("[data-candidate-root]")).toHaveCount(1);
    // Everything the view owes the brief: header, filter card, table, pagination.
    await expect(page.locator("[data-candidate-root] #records-filters")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] table")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] .MuiTablePagination-root")).toHaveCount(1);
    // One status pill per row on the page, not merely "a pill exists somewhere":
    // `.first()).toBeVisible()` passed with 250 identical pills, and the pill is the
    // only rendering of `verificationStatus` in the table. The content and the
    // variant are asserted in "status pills read the row's own status".
    await expect(page.locator(`${ROOT} tbody tr .MuiChip-root`)).toHaveCount(10);

    // The known-issues box is host chrome and must sit OUTSIDE the candidate
    // subtree, where no candidate stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return root?.querySelectorAll("[class*='known-issues']").length ?? -1;
    });
    expect(insideCandidate, "the known-issues box is inside the candidate subtree").toBe(0);
  });

  test("the candidate subtree is empty with candidate=off", async ({ page }) => {
    await page.goto(`${URL}?candidate=off`);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        children: root?.children.length ?? -1,
        innerHtmlLength: root?.innerHTML.length ?? -1,
        canaries: document.querySelectorAll("[data-canary]").length,
      };
    });

    writeJson("test-results/app-candidate-off.json", state);

    expect(state.children, "candidate=off left content in the candidate subtree").toBe(0);
    expect(state.innerHtmlLength).toBe(0);
    expect(state.canaries).toBe(CANARY_IDS.length);
  });

  test("renders every host canary and every frame canary", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    for (const id of CANARY_IDS) {
      await expect(page.locator(`[data-canary="${id}"]`), id).toHaveCount(1);
    }
    for (const id of DELTA_FRAME_CANARY_IDS) {
      await expect(page.locator(`[data-frame-canary="${id}"]`), id).toHaveCount(1);
    }

    await expect(page.locator("[data-frame-canary]")).toHaveCount(DELTA_FRAME_CANARY_IDS.length);

    // The Mangrove button in a Tailwind page must still be a Mangrove button:
    // if MUI's base styles had reached it, this is where it would show.
    const mangroveButton = page.locator('[data-frame-canary="frame-mangrove-in-delta"]');
    await expect(mangroveButton).toHaveClass(/mg-button/);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });
    writeJson("test-results/app-leakage.json", result);

    // The count is the load-bearing part of this assertion in this view: the frame
    // retains a host strip below the application region so all 14 canaries survive
    // a layout the candidate otherwise owns entirely. If this drops, the clean
    // verdict below is measuring nothing.
    expect(
      result.canariesChecked,
      "the host strip is gone, so this view's leakage result covers less than the kitchen sink's",
    ).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting MUI in the application frame:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("app-leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("collapses and expands the filter card", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const toggle = page.getByRole("button", { name: "Filter", exact: true });
    const panel = page.locator("#records-filters");

    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.click();
    // `unmountOnExit`, so the panel leaves the DOM rather than merely hiding —
    // which is also why `aria-controls` points at an element that may not exist.
    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("filters the table and reports the count in the page header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator("[data-candidate-root]")).toContainText("250 / 250");

    await chooseOption(page, "Verification status", "disputed");

    await expect(page.locator("[data-candidate-root]")).toContainText("53 / 250");
    await expect(page.locator(".MuiTablePagination-displayedRows")).toContainText("53");

    // Clearing is a single control and must restore the full set.
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator("[data-candidate-root]")).toContainText("250 / 250");
  });

  test("sorts by a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const before = await firstCell.innerText();

    // Ascending on first click. The comparator is hand-written application code,
    // not library behaviour — the cost of composing Table instead of DataGrid.
    await page.getByRole("button", { name: "Country" }).click();
    await expect(firstCell).toHaveText("Bangladesh");
    const afterAscending = await firstCell.innerText();

    // COMPARED, not merely recorded. `before` used to be captured, written to JSON
    // and never looked at, so a sort click that did nothing would still have passed
    // as long as the default order happened to start with the alphabetical first
    // row. The default order is `eventDate` descending, which starts elsewhere.
    expect(
      afterAscending,
      "sorting by Country did not change the first row: the click is a no-op and the " +
        "default order already began with the alphabetically first country",
    ).not.toBe(before);

    // Second click reverses it, and the two ends of the sort must differ.
    await page.getByRole("button", { name: "Country" }).click();
    await expect(firstCell).not.toHaveText("Bangladesh");
    const afterDescending = await firstCell.innerText();
    expect(afterDescending, "the second click did not reverse the sort").not.toBe(
      afterAscending,
    );

    writeJson("test-results/app-sort.json", {
      unsortedFirstCountry: before,
      ascendingFirstCountry: afterAscending,
      descendingFirstCountry: afterDescending,
    });
  });

  /**
   * The sort state as a screen reader receives it.
   *
   * `TableSortLabel` draws an arrow; `aria-sort` on the `th` is the only part a
   * screen reader gets, and it comes from `TableCell`'s `sortDirection` prop.
   * Before this was wired the view scored as having sort support on the strength of
   * a visual affordance alone, so this asserts the attribute directly rather than
   * the arrow.
   */
  test("announces the sort state with aria-sort", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const sorted = page.locator(`${ROOT} thead th[aria-sort]`);
    const header = (name: string) =>
      page.locator(`${ROOT} thead th`).filter({ hasText: name });

    // Exactly one column may claim the sort, and on load it is the default
    // `eventDate` descending — the same state the arrow is showing.
    await expect(sorted).toHaveCount(1);
    await expect(header("Event date")).toHaveAttribute("aria-sort", "descending");

    await page.getByRole("button", { name: "Country" }).click();
    await expect(sorted).toHaveCount(1);
    await expect(header("Country")).toHaveAttribute("aria-sort", "ascending");
    // The previous column must give it up, or two columns claim to be sorted.
    await expect(header("Event date")).not.toHaveAttribute("aria-sort", /.*/);

    // The attribute must track the reversal, not just appear once.
    await page.getByRole("button", { name: "Country" }).click();
    await expect(header("Country")).toHaveAttribute("aria-sort", "descending");

    const state = await page.evaluate(() =>
      [...document.querySelectorAll("[data-candidate-root] thead th")].map((th) => ({
        column: (th.textContent ?? "").trim(),
        ariaSort: th.getAttribute("aria-sort"),
      })),
    );
    writeJson("test-results/app-aria-sort.json", state);
  });

  /**
   * The status column, asserted on its content rather than its existence.
   *
   * This pill is the ONLY place the table renders `verificationStatus`, and it was
   * covered by a single `.first()).toBeVisible()` — an assertion that 250 rows all
   * reading "verified" would have satisfied. Both halves matter: the text has to be
   * the row's own status, and the colour variant has to track it, because the
   * colour is what a sighted reader actually scans the column by.
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
        [...document.querySelectorAll("[data-candidate-root] tbody tr .MuiChip-root")].map(
          (chip) => ({
            text: (chip.textContent ?? "").trim(),
            className: chip.className,
          }),
        ),
      );

    await expect(page.locator(`${ROOT} tbody tr .MuiChip-root`)).toHaveCount(10);
    const unfiltered = await readPills();
    expect(unfiltered).toHaveLength(10);
    for (const pill of unfiltered) {
      expect(Object.keys(VARIANT), `unknown status text "${pill.text}"`).toContain(pill.text);
      expect(
        pill.className,
        `pill "${pill.text}" carries the wrong colour variant: ${pill.className}`,
      ).toContain(VARIANT[pill.text] as string);
    }
    // Page one of the fixture spans four statuses. A uniform column would mean the
    // pill had stopped reading the row.
    expect(
      new Set(unfiltered.map((pill) => pill.text)).size,
      "every pill on page one reads the same status; the pill is not reading its row",
    ).toBeGreaterThan(1);

    // Filtering by a status pins the expected value for every visible row, which is
    // what ties the pill to `verificationStatus` rather than to row order.
    for (const status of Object.keys(VARIANT)) {
      await chooseOption(page, "Verification status", status);
      // Retrying assertion first, so React has re-rendered before the one-shot
      // `evaluate` below reads the DOM.
      await expect(page.locator(`${ROOT} tbody tr .MuiChip-root`).first()).toHaveText(status);
      const pills = await readPills();
      expect(pills.length, `no rows left after filtering to "${status}"`).toBeGreaterThan(0);
      for (const pill of pills) {
        expect(pill.text, `filtered to "${status}" but a pill reads "${pill.text}"`).toBe(status);
        expect(pill.className).toContain(VARIANT[status] as string);
      }
    }

    writeJson("test-results/app-status-pills.json", { unfiltered });
  });

  /**
   * Pagination chrome in the three non-English locales.
   *
   * The strings come from MUI's own core locale bundle, applied to the theme in
   * `AppView.tsx`. Expected values are imported FROM the bundle rather than copied
   * out of it, so a pack change moves the test instead of breaking it; the English
   * case is a literal, because `enUS` is an empty object and MUI's built-in
   * defaults are the English pack.
   */
  test("localises the pagination chrome from MUI's own locale bundle", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const rowsPerPage = page.locator(".MuiTablePagination-selectLabel");
    const displayed = page.locator(".MuiTablePagination-displayedRows");

    await expect(rowsPerPage).toHaveText("Rows per page:");
    await expect(displayed).toHaveText("1–10 of 250");

    const cases = [
      { locale: "Français", pack: frFR },
      { locale: "Deutsch", pack: deDE },
      { locale: "العربية", pack: arEG },
    ] as const;

    const recorded: Array<Record<string, string>> = [];

    for (const { locale, pack } of cases) {
      await selectLocale(page, locale);

      const props = pack.components?.MuiTablePagination?.defaultProps;
      const expectedRows = props?.labelRowsPerPage as string;
      const labelDisplayedRows = props?.labelDisplayedRows as (info: {
        from: number;
        to: number;
        count: number;
        page: number;
      }) => string;
      const expectedDisplayed = labelDisplayedRows({ from: 1, to: 10, count: 250, page: 0 });

      await expect(
        rowsPerPage,
        `"Rows per page" is still English in ${locale}; the locale bundle is not wired`,
      ).toHaveText(expectedRows);
      await expect(displayed).toHaveText(expectedDisplayed);

      recorded.push({ locale, expectedRows, expectedDisplayed });
    }

    // The Arabic row counts are Arabic-Indic digits, which is the bundle formatting
    // numbers for `ar-EG` rather than merely swapping words.
    await expect(displayed).toHaveText(/[٠-٩]/);

    writeJson("test-results/app-pagination-locale.json", recorded);
  });

  test("paginates, and returns to page one when sorting changes", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const footer = page.locator(".MuiTablePagination-displayedRows");
    await expect(footer).toContainText("1–10");
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(footer).toContainText("11–20");

    // A sort change while on page 2 must not strand the reader mid-list.
    await page.getByRole("button", { name: "Country" }).click();
    await expect(footer).toContainText("1–10");
  });

  test("confirms a delete through the modal flow", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstRow = page.locator(`${ROOT} tbody tr`).first();
    const before = await firstRow.innerText();

    await deleteButton(page).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog names the record it is about to remove, which is the whole point
    // of a confirmation step.
    await expect(dialog).toContainText(/DRR-\d{4}/);

    // Cancelling must change nothing.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("[data-candidate-root]")).toContainText("250 / 250");

    // Confirming removes exactly one record.
    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("[data-candidate-root]")).toContainText("249 / 250");
    await expect(firstRow).not.toHaveText(before);
  });

  test("closes the delete dialog on Escape and restores focus", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const trigger = deleteButton(page);
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // MUI's Dialog handles this; recorded because a records screen full of row
    // actions is where losing focus hurts most.
    await expect(trigger).toBeFocused();
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
  });

  /**
   * ONE RTL defect and one RTL guard, measured in this layout. They were previously
   * asserted side by side as two defects, which was wrong about the second one.
   *
   * 1. THE DEFECT (`mui-rtl-unfixable`), asserted as still present:
   *    `MuiInputLabel-outlined` uses a physical `left: 0` plus
   *    `transformOrigin: 'top left'` inside MUI's own stylesheet, which theme
   *    direction does not flip and no app-level prop reaches. Bounded here by the
   *    filter card's ~235px grid columns rather than by the content column, so
   *    smaller than the kitchen sink's 843px worst case and exactly as wrong. The
   *    day MUI fixes it this fails, and the evidence gets revisited rather than
   *    going stale.
   * 2. THE GUARD, asserted as CORRECT: the row-actions column aligns to the row's
   *    logical end. `TableCell`'s `align` prop is physical-only, and passing
   *    `align="right"` used to pin the actions to the physical right in Arabic —
   *    our shortcut, recorded at the time as a MUI defect it never was. The cell
   *    now uses `sx={{ textAlign: "end" }}`, so this asserts the correct
   *    behaviour: a regression to `align="right"` fails here rather than quietly
   *    reappearing as a finding.
   */
  test("RTL leaves physical offsets unflipped", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    const measurement = await page.evaluate(() => {
      const labels: Array<Record<string, number | string>> = [];
      for (const label of document.querySelectorAll(
        "[data-candidate-root] .MuiInputLabel-root",
      )) {
        const control = label.closest(".MuiFormControl-root");
        const field = control?.querySelector(".MuiInputBase-root");
        if (!field) continue;
        const l = label.getBoundingClientRect();
        const f = field.getBoundingClientRect();
        labels.push({
          label: (label.textContent ?? "").slice(0, 24),
          inlineStartOffsetPx: Math.round(f.right - l.right),
          fieldWidthPx: Math.round(f.width),
          labelCssLeft: getComputedStyle(label).left,
        });
      }

      const actionCell = document.querySelector("[data-candidate-root] tbody tr td:last-child");
      const firstCell = document.querySelector("[data-candidate-root] tbody tr td:first-child");

      /*
       * Measured as well as read off the computed style, because Chromium reports
       * `text-align: end` back verbatim rather than resolving it to a side: the
       * keyword proves the property is logical, the geometry proves it is being
       * honoured in this direction.
       *
       * The gaps are cell-edge to content-edge. Whichever gap is the smaller names
       * the side the content is hugging.
       */
      const gaps = (
        cell: Element | null | undefined,
        content: { left: number; right: number } | null,
      ): { startGapPx: number; endGapPx: number } | null => {
        if (!cell || !content) return null;
        const box = cell.getBoundingClientRect();
        return {
          startGapPx: Math.round(content.left - box.left),
          endGapPx: Math.round(box.right - content.right),
        };
      };

      const buttonBoxes = actionCell
        ? [...actionCell.querySelectorAll(".MuiIconButton-root")].map((el) =>
            el.getBoundingClientRect(),
          )
        : [];
      const buttonEnvelope = buttonBoxes.length
        ? {
            left: Math.min(...buttonBoxes.map((b) => b.left)),
            right: Math.max(...buttonBoxes.map((b) => b.right)),
          }
        : null;

      /*
       * The geometry is asserted on the "People affected" BODY cell rather than on
       * the actions cell, because that is where the alignment has room to show. The
       * actions column is sized by its three icon buttons, so at tablet and mobile
       * the buttons fill the cell and both gaps are the padding — equal under a
       * logical alignment AND under a physical one, i.e. unfalsifiable. A formatted
       * number is much narrower than the "People affected" header that sets the
       * column width, so the slack is real at every viewport. Measured with a Range,
       * since a text node has no box of its own.
       */
      const textEdges = (cell: Element | undefined): { left: number; right: number } | null => {
        if (!cell) return null;
        const range = document.createRange();
        range.selectNodeContents(cell);
        const box = range.getBoundingClientRect();
        return { left: box.left, right: box.right };
      };

      const numericCell = document.querySelectorAll("[data-candidate-root] tbody tr td")[3];
      const numericHeader = document.querySelectorAll("[data-candidate-root] thead th")[3];

      return {
        labels,
        actionCellTextAlign: actionCell ? getComputedStyle(actionCell).textAlign : "",
        numericCellTextAlign: numericCell ? getComputedStyle(numericCell).textAlign : "",
        numericHeaderTextAlign: numericHeader ? getComputedStyle(numericHeader).textAlign : "",
        actionCellIsLeftOfFirstCell:
          actionCell && firstCell
            ? actionCell.getBoundingClientRect().left < firstCell.getBoundingClientRect().left
            : null,
        actionGaps: gaps(actionCell, buttonEnvelope),
        numericCellGaps: gaps(numericCell, textEdges(numericCell)),
      };
    });

    const offsets = measurement.labels.map((row) => Number(row["inlineStartOffsetPx"]));

    writeJson("test-results/app-rtl-offsets.json", {
      labelsMeasured: measurement.labels.length,
      maxLabelOffsetPx: Math.max(...offsets),
      minLabelOffsetPx: Math.min(...offsets),
      ...measurement,
      note:
        "Label displacement is bounded by the filter card's column width, so smaller " +
        "than the kitchen sink's 843px worst case. Same unfixable defect, inside MUI's " +
        "own InputLabel stylesheet. Table alignment is a SEPARATE mechanism and is no " +
        "longer a finding: `sx={{ textAlign: 'end' }}` on TableCell is logical and " +
        "flips with the row, which `numericCellGaps` measures.",
    });

    expect(measurement.labels.length, "no labelled controls found to measure").toBeGreaterThan(
      0,
    );
    expect(
      Math.max(...offsets),
      "MUI's RTL floating-label defect appears to be fixed; re-measure and update " +
        "the known-issues registry (mui-rtl-unfixable)",
    ).toBeGreaterThan(16);
    // The row flips — the actions cell is physically LEFT of the country cell in
    // RTL — and the cell's own content alignment now follows it.
    expect(
      measurement.actionCellIsLeftOfFirstCell,
      "the row did not flip in Arabic, so the alignment measurements below mean nothing",
    ).toBe(true);
    for (const [name, align] of [
      ["row-actions cell", measurement.actionCellTextAlign],
      ["People affected header", measurement.numericHeaderTextAlign],
      ["People affected cell", measurement.numericCellTextAlign],
    ] as const) {
      expect(
        align,
        `the ${name} is back on a physical text-align (\`align="right"\`?); it must use ` +
          "the logical `end` so Arabic flips with the row",
      ).toBe("end");
    }

    // Logical end in RTL is the physical LEFT, so the start gap is the small one.
    const numeric = measurement.numericCellGaps;
    expect(numeric, "no People affected cell found to measure").not.toBeNull();
    expect(
      (numeric?.startGapPx ?? 0) + (numeric?.endGapPx ?? 0),
      "the number fills its cell, so this measurement cannot tell logical alignment " +
        "from physical and proves nothing",
    ).toBeGreaterThan(24);
    expect(
      numeric?.startGapPx,
      "the People affected number is not at the row's logical end in Arabic: left gap " +
        `${numeric?.startGapPx}px vs right gap ${numeric?.endGapPx}px`,
    ).toBeLessThan(numeric?.endGapPx ?? 0);
  });

  /**
   * The LTR half of the same guard. `textAlign: "end"` has to put the numbers on the
   * physical RIGHT in English — otherwise the RTL assertion above could be satisfied
   * by a table that is simply left-aligned in both directions, which is what the
   * `sx` would do if the property were misspelled.
   */
  test("numeric columns sit at the row's logical end in LTR too", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const measurement = await page.evaluate(() => {
      const cell = document.querySelectorAll("[data-candidate-root] tbody tr td")[3];
      if (!cell) return null;
      const range = document.createRange();
      range.selectNodeContents(cell);
      const text = range.getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      return {
        textAlign: getComputedStyle(cell).textAlign,
        inlineStartGapPx: Math.round(text.left - box.left),
        inlineEndGapPx: Math.round(box.right - text.right),
      };
    });

    expect(measurement, "no People affected cell found to measure").not.toBeNull();
    expect(measurement?.textAlign).toBe("end");
    expect(
      measurement?.inlineEndGapPx,
      "the People affected number is not at the row's logical end in English: " +
        `left gap ${measurement?.inlineStartGapPx}px vs right gap ${measurement?.inlineEndGapPx}px`,
    ).toBeLessThan(measurement?.inlineStartGapPx ?? 0);
  });

  test("axe on the candidate region and the whole page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const scoped = await runAxe(page, {
      section: "app-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-app-candidate-subtree.json", scoped);

    const wholePage = await runAxe(page, { section: "app-whole-page" });
    writeJson("test-results/axe-app-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe app scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete | ` +
        `whole page: ${wholePage.counts.violations} violations ` +
        `(rules: ${wholePage.violations.map((v) => v.id).join(", ") || "none"})`,
    );

    await testInfo.attach("axe-app-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });

    expect(
      scoped.counts.critical,
      `critical axe violations in the candidate region: ${scoped.violations
        .map((v) => v.id)
        .join(", ")}`,
    ).toBe(0);
  });

  test("axe on the open delete dialog", async ({ page }, testInfo) => {
    // The dialog is portalled to document.body, i.e. OUTSIDE the candidate root,
    // so the scoped run above cannot see it. Modal flows are exactly where ARIA
    // goes wrong, so it gets its own run.
    await page.goto(`${URL}?candidate=on`);
    await deleteButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // WAIT FOR THE TRANSITION TO FINISH, and do not remove this.
    //
    // MUI's Dialog fades its paper in by animating inline `opacity`, and
    // `toBeVisible()` is satisfied the moment opacity leaves 0. axe run at that
    // instant blends the paper against the 50%-black backdrop behind it and
    // reports a SERIOUS `color-contrast` violation on four nodes — the title, the
    // record id, and both action buttons. It is an artefact of the measurement,
    // not a defect: the same scan after the transition settles reports
    // `color-contrast` as INCOMPLETE, i.e. needs human review, and the measured
    // colours are #14232E on #FFFFFF.
    //
    // Recorded here because it is a trap for every other pairing's overlay tests
    // too: an animating overlay makes axe produce a real-looking contrast failure
    // that disappears on a rerun with a wait.
    await expect(dialog).toHaveCSS("opacity", "1");
    // The BACKDROP is the one that matters: its own opacity animates 0 -> 1 while
    // its colour stays rgba(0,0,0,.5), so it is what axe blends the paper against
    // mid-flight. The paper's opacity settles first, which is why waiting on the
    // dialog alone was not enough.
    await expect(page.locator(".MuiBackdrop-root")).toHaveCSS("opacity", "1");

    const result = await runAxe(page, { section: "app-delete-dialog", include: '[role="dialog"]' });
    writeJson("test-results/axe-app-delete-dialog.json", result);

    // eslint-disable-next-line no-console
    console.log(
      `axe app delete dialog: ${result.counts.violations} violations ` +
        `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
        `${result.counts.incomplete} incomplete`,
    );

    await testInfo.attach("axe-app-delete-dialog.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.counts.critical).toBe(0);
    // Asserted rather than only recorded, now that the transition wait above makes
    // the measurement trustworthy.
    expect(
      result.counts.serious,
      `serious axe violations in the delete dialog: ${result.violations
        .map((v) => v.id)
        .join(", ")}`,
    ).toBe(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "app-00-full-page", testInfo);

    await page.locator("[data-candidate-root]").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-records", testInfo, { fullPage: false });

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(page.locator("#records-filters")).toHaveCount(0);
    await captureScreens(page, "app-02-filters-collapsed", testInfo, { fullPage: false });

    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await captureScreens(page, "app-03-delete-dialog", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "app-00-full-page", testInfo, { rtl: true });
    await page.locator("[data-candidate-root]").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-records", testInfo, { rtl: true, fullPage: false });

    // `"ar"`, because the row actions' accessible names come from the fixture
    // labels and are localised with the rest of the screen.
    await deleteButton(page, "ar").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await captureScreens(page, "app-03-delete-dialog", testInfo, {
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

    writeJson(`test-results/app-long-labels-${testInfo.project.name}.json`, {
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

  /* ------------------------------------------------------- the step wizard */

  /*
   * The wizard is the one component on this screen that PrimeReact — the incumbent
   * being replaced — shipped, so it is the part worth asserting hardest. MUI ships
   * a stepper, which means most of what follows checks a LIBRARY contract rather
   * than hand-written markup; the exception is the ARIA, which
   * `views/EventWizard.tsx` overrides because MUI announces a linear wizard as a
   * tab list. Those overrides depend on MUI's prop-spread order and nothing in the
   * public API guarantees them, so the assertions here are the only thing that
   * would catch a minor-version release putting `role="tab"` back.
   *
   * Same assertions as the React Aria pilot, adapted to MUI's DOM: MUI's own
   * `.MuiStepButton-root` / `.MuiStepLabel-label` classes where the pilot used its
   * hand-written ones, and `data-testid` only where MUI emits no stable hook.
   */
  const WIZARD = '[data-testid="wizard"]';
  const STEP_BUTTONS = `${WIZARD} .MuiStepButton-root`;

  /**
   * The wizard's own Next, not the table pagination's — both are named "Next", and
   * an unscoped `getByRole("button", { name: "Next" })` is a strict-mode violation
   * on this page. `exact` as well: "Save" would otherwise also match "Save as
   * draft" in the same action row.
   */
  function wizardButton(page: Page, name: string) {
    return page
      .locator(`${WIZARD} [data-testid="wizard-actions"]`)
      .getByRole("button", { name, exact: true });
  }

  test("the wizard states which step is current, in the accessibility tree", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(STEP_BUTTONS)).toHaveCount(4);

    /*
     * Exactly one current step, via `aria-current="step"`. MUI emits this NOWHERE
     * and has no prop for it: what it emits instead is `aria-selected` on a
     * `role="tab"` inside a `role="tablist"`, which is why this assertion is against
     * an attribute the app had to add by hand.
     */
    const current = page.locator(`${STEP_BUTTONS}[aria-current="step"]`);
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Event basics");

    // The tab-set semantics are gone, in both directions.
    await expect(page.locator(`${WIZARD} [role="tablist"]`)).toHaveCount(0);
    await expect(page.locator(`${STEP_BUTTONS}[role="tab"]`)).toHaveCount(0);
    await expect(page.locator(`${STEP_BUTTONS}[aria-selected]`)).toHaveCount(0);

    /*
     * Steps ahead are unreachable and SAY so, via the native `disabled` attribute —
     * which is what `Step`'s `disabled` prop produces, since `StepButton` is a
     * `ButtonBase`. Identical to the React Aria pilot, and identically blunt:
     * `disabled` removes the step from the tab order entirely, so a keyboard user
     * cannot read ahead through the indicator. Neither library offers the
     * `aria-disabled` alternative.
     */
    await expect(page.locator(`${STEP_BUTTONS}[disabled]`)).toHaveCount(3);

    // The REQUIRED/OPTIONAL sublabel from the design file, in StepLabel's own
    // `optional` slot rather than smuggled into the label text.
    const optionality = page.locator(`${WIZARD} [data-testid="wizard-step-optionality"]`);
    await expect(optionality).toHaveCount(4);
    await expect(optionality.first()).toHaveText("Required");
    await expect(optionality.nth(1)).toHaveText("Optional");
  });

  test("advancing the wizard moves the current step and unlocks the ones behind", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    await wizardButton(page, "Next").click();
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Linked events",
    );
    // Step 1 is now complete, so it is reachable again: the behaviour the design
    // file shows, steps 1-3 checked while step 4 is active. The tick is MUI's
    // `StepIcon`, which swaps the number for a check on `completed` — one of the
    // pieces the React Aria pilot draws itself.
    await expect(page.locator(`${WIZARD} .MuiStepLabel-label.Mui-completed`)).toHaveCount(1);
    await expect(page.locator(`${STEP_BUTTONS}[disabled]`)).toHaveCount(2);

    // Back returns, and the completed step does not un-complete.
    await wizardButton(page, "Back").click();
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Event basics",
    );
    await expect(page.locator(`${STEP_BUTTONS}[disabled]`)).toHaveCount(2);
  });

  test("the last step reviews the submission and offers Save, not a dead Next", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);
    for (let i = 0; i < 3; i += 1) await wizardButton(page, "Next").click();

    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Review and save",
    );
    // Three review cards, and the em-dashed empty values are still empty.
    await expect(page.locator(`${WIZARD} [data-testid="wizard-review-card"]`)).toHaveCount(3);
    await expect(
      page.locator(`${WIZARD} [data-testid="wizard-review-value"]`).filter({ hasText: "—" }),
    ).toHaveCount(4);
    await expect(wizardButton(page, "Save")).toBeEnabled();
    await expect(page.locator(`${WIZARD} [data-testid="wizard-actions"]`)).not.toContainText(
      "Next",
    );
  });

  test("the wizard is reachable and operable by keyboard alone", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Advance from the keyboard. A stepper whose steps are only clickable is a
    // stepper half the users cannot use.
    await wizardButton(page, "Next").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Linked events",
    );

    // And a completed step can be returned to from the indicator itself.
    await page.locator(STEP_BUTTONS).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Event basics",
    );

    /*
     * MUI installs a roving tab index on the indicator whenever a `StepButton` is
     * among the children, and there is no prop to turn it off. Asserted rather than
     * merely noted: ArrowRight moves focus between steps, which is tab-set keyboard
     * behaviour on markup that no longer claims to be a tab set. Recorded as a
     * finding in EventWizard.tsx — MUI will not let the two be separated.
     */
    await page.locator(STEP_BUTTONS).first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(STEP_BUTTONS).nth(1)).toBeFocused();
  });

  test("the stepper mirrors, and its connectors stay logical, in Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    const steps = page.locator(`${WIZARD} .MuiStep-root`);
    const first = await steps.first().boundingBox();
    const last = await steps.last().boundingBox();
    expect(first?.x ?? 0, "Arabic: step 1 should sit right of step 4").toBeGreaterThan(
      last?.x ?? 0,
    );

    // The labels are Arabic too, including the review card field names: they are
    // chrome, so they translate, unlike the record values beside them.
    await expect(page.locator(STEP_BUTTONS).first()).toContainText("أساسيات الحدث");

    /*
     * The connector is `StepConnector`, MUI's own, and it survives the flip because
     * its offsets are symmetric (`left: calc(-50% + 20px)` / `right: calc(50% +
     * 20px)`, StepConnector.js:71-72) rather than because they are logical. Measured
     * here instead of assumed: the line between steps 1 and 2 must sit between their
     * two markers whichever way the row runs.
     */
    const connector = page.locator(`${WIZARD} .MuiStepConnector-root`).first();
    const line = await connector.boundingBox();
    const stepOne = await steps.first().boundingBox();
    const stepTwo = await steps.nth(1).boundingBox();
    const lineCentre = (line?.x ?? 0) + (line?.width ?? 0) / 2;
    expect(lineCentre, "Arabic: connector 1-2 sits between steps 2 and 1").toBeGreaterThan(
      (stepTwo?.x ?? 0) + (stepTwo?.width ?? 0) / 2,
    );
    expect(lineCentre).toBeLessThan((stepOne?.x ?? 0) + (stepOne?.width ?? 0) / 2);
  });

  test("German step labels wrap rather than clip", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    // "Zusätzliche Einzelheiten" under a 24px circle is the case that breaks a
    // fixed-width stepper. Measured rather than eyeballed: clipped text reports a
    // scrollWidth wider than its box.
    const clipped = await page
      .locator(`${WIZARD} .MuiStepLabel-label`)
      .evaluateAll((els) =>
        els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
      );
    expect(clipped, "step labels are clipped in German").toEqual([]);
  });
});
