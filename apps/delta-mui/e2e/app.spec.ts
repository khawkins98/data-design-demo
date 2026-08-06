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
    await expect(page.locator("[data-candidate-root] .MuiChip-root").first()).toBeVisible();

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

    // Second click reverses it, and the two ends of the sort must differ.
    await page.getByRole("button", { name: "Country" }).click();
    await expect(firstCell).not.toHaveText("Bangladesh");

    writeJson("test-results/app-sort.json", { unsortedFirstCountry: before });
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
   * Two separate RTL defects, measured in this layout.
   *
   * 1. The known floating-label defect (`mui-rtl-unfixable`): `MuiInputLabel-
   *    outlined` uses a physical `left: 0` that theme direction does not flip.
   *    Bounded here by the filter card's ~235px grid columns rather than by the
   *    content column, so smaller than the kitchen sink's 843px worst case and
   *    exactly as wrong.
   * 2. `TableCell align="right"` is a PHYSICAL value with no logical equivalent in
   *    MUI's Table API, so the row-actions column stays pinned to the physical
   *    right while the row itself has flipped to RTL.
   *
   * Both assert the defect, so a future MUI release that fixes either one fails
   * this test rather than letting the evidence go stale.
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

      return {
        labels,
        // In RTL the row's logical end is its physical LEFT. `align="right"`
        // keeps the action buttons at the physical right instead.
        actionCellTextAlign: actionCell ? getComputedStyle(actionCell).textAlign : "",
        actionCellIsLeftOfFirstCell:
          actionCell && firstCell
            ? actionCell.getBoundingClientRect().left < firstCell.getBoundingClientRect().left
            : null,
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
        "than the kitchen sink's 843px worst case. Same unfixable defect. The action " +
        "column's `align=right` is a physical value with no logical equivalent.",
    });

    expect(measurement.labels.length, "no labelled controls found to measure").toBeGreaterThan(
      0,
    );
    expect(
      Math.max(...offsets),
      "MUI's RTL floating-label defect appears to be fixed; re-measure and update " +
        "the known-issues registry (mui-rtl-unfixable)",
    ).toBeGreaterThan(16);
    // The row does flip — the actions cell is physically LEFT of the country cell
    // in RTL — but its own content alignment does not follow.
    expect(measurement.actionCellTextAlign).toBe("right");
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
});
