/**
 * Evidence run for the delta-mantine FULL APPLICATION view (`app.html`).
 *
 * Same helpers, same viewport projects and the same structure as
 * `apps/delta-mantine/e2e/demo.spec.ts` and `apps/delta-mui/e2e/app.spec.ts`, so the
 * views of this pairing and the two candidates' application screens are directly
 * comparable.
 *
 * READ THE LEAKAGE RESULT FROM THIS VIEW WITH CARE, and the frame says so itself:
 * when the candidate owns the viewport there is almost no host markup left to leak
 * onto, so a clean result here means less than the same result from the kitchen
 * sink — the target shrank rather than the candidate improving. The frame keeps a
 * host strip below the application region precisely so all 14 canaries survive, and
 * this spec asserts that count rather than trusting it.
 *
 * It also asserts the OTHER precondition, which is Mantine-specific: the kitchen
 * sink's entry imports `mantine-styles.css` statically, which puts the same CSS in
 * both loads of the leakage comparison and lets it cancel out. `src/app-main.tsx`
 * defers the import into the `candidate=on` branch instead, and the second test
 * below proves the deferral held.
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
 * the host's canary rows as candidate rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** `SegmentedControl` hides its radio behind a `<label>`, which takes the click. */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator("label.mantine-SegmentedControl-label", { hasText: label }).first().click();
}

/**
 * The dropdown that is currently open.
 *
 * `:visible` is not decoration: every `Select` renders its dropdown div up front and
 * hides it with `display: none`, so `.first()` is whichever Select is first in source
 * order rather than the one on screen.
 */
function openDropdown(page: Page) {
  return page.locator(".mantine-Select-dropdown:visible");
}

/** Opens a filter `Select` and picks an option from its portalled dropdown. */
async function chooseOption(page: Page, testId: string, option: string): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  // A closed dropdown renders no options at all, so this is the close signal.
  await expect(page.getByRole("option")).toHaveCount(0);
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

    await expect(page.locator(ROOT)).toHaveCount(1);
    // Everything the view owes the brief: header, filter card, table, pagination,
    // status pills and row actions.
    await expect(page.locator(`${ROOT} #records-filters`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} table`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .mantine-Pagination-root`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .mantine-Badge-root`).first()).toBeVisible();
    await expect(page.locator(`${ROOT} tbody tr`).first().locator("button")).toHaveCount(3);

    // Host chrome must sit OUTSIDE the candidate subtree, where no candidate
    // stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        knownIssues: root?.querySelectorAll("[class*='known-issues']").length ?? -1,
        switcher: root?.querySelectorAll('nav[aria-label="Demo views"]').length ?? -1,
      };
    });
    expect(insideCandidate.knownIssues, "known-issues box inside the candidate subtree").toBe(0);
    expect(insideCandidate.switcher, "view switcher inside the candidate subtree").toBe(0);

    const switcher = page.locator('nav[aria-label="Demo views"]');
    await expect(switcher).toContainText("Component inventory");
    await expect(switcher, "offered a Mangrove-only view on a Delta host").not.toContainText(
      "Inside a real page",
    );
  });

  test("the candidate subtree is empty with candidate=off, and Mantine's CSS is absent", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=off`);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      const rootStyles = getComputedStyle(document.documentElement);
      return {
        children: root?.children.length ?? -1,
        innerHtmlLength: root?.innerHTML.length ?? -1,
        canaries: document.querySelectorAll("[data-canary]").length,
        mantineFontFamily: rootStyles.getPropertyValue("--mantine-font-family").trim(),
        mantineSpacing: rootStyles.getPropertyValue("--mantine-spacing-md").trim(),
        mantineClassNodes: document.querySelectorAll("[class*='mantine-']").length,
      };
    });

    writeJson("test-results/app-candidate-off.json", state);

    expect(state.children, "candidate=off left content in the candidate subtree").toBe(0);
    expect(state.innerHtmlLength).toBe(0);
    expect(state.canaries).toBe(CANARY_IDS.length);
    // Deferred import held: no Mantine CSS in the baseline load, so the leakage
    // result below is a measurement rather than a tautology.
    expect(state.mantineFontFamily, "Mantine CSS variables present with the candidate off").toBe(
      "",
    );
    expect(state.mantineSpacing).toBe("");
    expect(state.mantineClassNodes).toBe(0);
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

    // The Mangrove button in a Tailwind page must still be a Mangrove button: if
    // Mantine's base styles had reached it, this is where it would show.
    const mangroveButton = page.locator('[data-frame-canary="frame-mangrove-in-delta"]');
    await expect(mangroveButton).toHaveClass(/mg-button/);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });
    writeJson("test-results/app-leakage.json", result);

    // The count is the load-bearing part in this view: the frame retains a host
    // strip below the application region so all 14 canaries survive a layout the
    // candidate otherwise owns entirely. If it drops, the clean verdict below is
    // measuring nothing.
    expect(
      result.canariesChecked,
      "the host strip is gone, so this view's leakage result covers less than the kitchen sink's",
    ).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Mantine in the application frame:\n${JSON.stringify(
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
    // `keepMounted={false}`, so the panel leaves the DOM rather than merely hiding —
    // which is also why `aria-controls` points at an element that may not exist.
    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("filters the table and reports the count in the page header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const summary = page.getByTestId("app-summary");
    await expect(summary).toContainText("250 / 250");

    await chooseOption(page, "app-filter-status", "disputed");
    await expect(summary).toContainText("53 / 250");
    await expect(page.getByTestId("app-page-summary")).toHaveText("Page 1 / 6");

    await chooseOption(page, "app-filter-hazard", "Drought");
    // Two filters compose rather than replacing one another.
    await expect(summary).not.toContainText("53 / 250");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(summary).toContainText("250 / 250");
  });

  test("sorts by a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const before = await firstCell.innerText();

    // Default sort is eventDate descending, declared through `aria-sort` because
    // `Table.Th` has no sorting affordance of its own. The comparator is
    // `src/table-model.ts`, i.e. application code.
    await expect(page.locator(`${ROOT} th[aria-sort="descending"]`)).toHaveCount(1);

    await page.getByRole("button", { name: "Sort by Country" }).click();
    await expect(page.locator(`${ROOT} th[aria-sort="ascending"]`)).toHaveCount(1);
    await expect(firstCell).toHaveText("Bangladesh");

    await page.getByRole("button", { name: "Sort by Country" }).click();
    await expect(firstCell).not.toHaveText("Bangladesh");

    writeJson("test-results/app-sort.json", { unsortedFirstCountry: before });
  });

  test("paginates, and returns to page one when sorting changes", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const summary = page.getByTestId("app-page-summary");
    await expect(summary).toHaveText("Page 1 / 25");
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(summary).toHaveText("Page 2 / 25");

    // A sort change while on page 2 must not strand the reader mid-list.
    await page.getByRole("button", { name: "Sort by Country" }).click();
    await expect(summary).toHaveText("Page 1 / 25");

    // Edge controls, whose accessible names exist only because `getControlProps`
    // supplies them.
    await page.getByRole("button", { name: "Last page" }).click();
    await expect(summary).toHaveText("Page 25 / 25");
  });

  test("confirms a delete through the modal flow", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstRow = page.locator(`${ROOT} tbody tr`).first();
    const before = await firstRow.innerText();

    await deleteButton(page).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog names the record it is about to remove, which is the whole point of
    // a confirmation step.
    await expect(page.getByTestId("app-delete-target")).toContainText(/DRR-\d{4}/);

    // Cancelling must change nothing.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("app-summary")).toContainText("250 / 250");

    // Confirming removes exactly one record.
    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("app-summary")).toContainText("249 / 250");
    await expect(firstRow).not.toHaveText(before);
  });

  test("closes the delete dialog on Escape and restores focus", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const trigger = deleteButton(page);
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Mantine's `Modal` handles this (`closeOnEscape`, `returnFocus`, `trapFocus`
    // all default true); recorded because a records screen full of row actions is
    // where losing focus hurts most.
    await expect(trigger).toBeFocused();
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // The frame's wrapper carries it, and `<html>` does NOT: unlike the
    // mangrove-mantine run, this view never calls Mantine's `setDirection()`, so the
    // candidate does not reach outside its subtree. See src/AppView.tsx.
    await expect(page.locator('#root > [dir="rtl"]')).toHaveCount(1);
    await expect(page.locator('html[dir="rtl"]')).toHaveCount(0);
  });

  /**
   * The portal direction measurement, which is where this frame costs Mantine
   * something the kitchen sink already paid.
   *
   * `AppFrame` puts `dir` on its own wrapper, exactly as `HostShell` does. A portal
   * appended to `document.body` sits outside it and falls back to `<html dir="ltr">`,
   * which the host owns and the candidate must not rewrite — so in Arabic every
   * overlay would render left-to-right inside a right-to-left screen. Mantine's
   * `Portal` forwards only `className`, `style`, `id` and `target`, and drops a `dir`
   * prop, so the direction has to travel as a class plus a stamped attribute. Both
   * mitigations are reused from the kitchen sink; this test asserts they still work
   * in a layout whose overlays are a modal and eleven tooltips rather than a demo
   * section's one of each.
   */
  test("portalled overlays follow the page direction", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // A dropdown, mounted AFTER the locale change: its container takes the direction
    // class from `portalProps` at mount.
    await page.getByTestId("app-filter-status").click();
    await expect(openDropdown(page)).toBeVisible();
    await page.keyboard.press("Escape");

    // The modal, also mounted after the change.
    await deleteButton(page, "ar").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const measurement = await page.evaluate(() => {
      const modal = document.querySelector(".mantine-Modal-content");
      const inside = document.querySelector("[data-candidate-root] table");
      const portals = [...document.querySelectorAll<HTMLElement>(".demo-portal")];
      return {
        modalIsInsideCandidateRoot: modal ? Boolean(modal.closest("[data-candidate-root]")) : null,
        modalDirection: modal ? getComputedStyle(modal).direction : "",
        modalFocusToken: modal
          ? getComputedStyle(modal).getPropertyValue("--undrr-color-focus").trim()
          : "",
        modalBackground: modal ? getComputedStyle(modal).backgroundColor : "",
        subtreeDirection: inside ? getComputedStyle(inside).direction : "",
        portalContainers: portals.length,
        portalsWithoutRtl: portals.filter((node) => node.getAttribute("dir") !== "rtl").length,
        htmlDir: document.documentElement.getAttribute("dir"),
      };
    });

    writeJson(`test-results/app-rtl-portal-${testInfo.project.name}.json`, measurement);

    expect(measurement.modalIsInsideCandidateRoot, "modal is not portalled").toBe(false);
    expect(measurement.subtreeDirection, "candidate subtree direction").toBe("rtl");
    expect(measurement.modalDirection, "portalled modal direction").toBe("rtl");
    // `reuseTargetNode: false` means one container per overlay, so there is more than
    // one to keep in step — which is the whole reason the stamping effect exists.
    expect(measurement.portalContainers).toBeGreaterThan(0);
    expect(measurement.portalsWithoutRtl, "a portal container was left in LTR").toBe(0);
    expect(measurement.modalFocusToken, "token scope did not reach the portal").not.toBe("");
    expect(measurement.modalBackground).not.toBe("rgba(0, 0, 0, 0)");
    // The candidate must not have rewritten the host's document element to get here.
    expect(measurement.htmlDir, "the candidate mutated <html dir>").not.toBe("rtl");
  });

  /**
   * The row-action column follows the reading direction, which is worth asserting
   * because the delta-mui run's equivalent does NOT: MUI's `TableCell align="right"`
   * is a physical value with no logical equivalent, so its action column stays pinned
   * to the physical right while the row has flipped. Mantine's `ta="end"` is logical.
   * Asserted rather than described, so a regression in either direction is visible.
   */
  test("RTL flips the row-action column with the row", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    const measurement = await page.evaluate(() => {
      const actionCell = document.querySelector("[data-candidate-root] tbody tr td:last-child");
      const firstCell = document.querySelector("[data-candidate-root] tbody tr td:first-child");
      return {
        actionCellTextAlign: actionCell ? getComputedStyle(actionCell).textAlign : "",
        actionCellIsLeftOfFirstCell:
          actionCell && firstCell
            ? actionCell.getBoundingClientRect().left < firstCell.getBoundingClientRect().left
            : null,
      };
    });

    writeJson(`test-results/app-rtl-columns-${testInfo.project.name}.json`, {
      ...measurement,
      note:
        "Mantine's `ta` style prop takes logical values, so the action column's own " +
        "alignment follows the row. MUI's TableCell align=right does not.",
    });

    // Chromium reports the LOGICAL keyword back from `getComputedStyle`, i.e. `end`
    // rather than the resolved `left` — which is itself the evidence that the value
    // is logical, where MUI's `align="right"` reads back as the physical `right`.
    expect(measurement.actionCellTextAlign).toBe("end");
    // The geometry is the assertion that matters: in RTL the row's logical end is
    // its physical LEFT, and the action cell is there.
    expect(measurement.actionCellIsLeftOfFirstCell).toBe(true);
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
    // The dialog is portalled to `document.body`, i.e. OUTSIDE the candidate root, so
    // the scoped run above cannot see it. Modal flows are exactly where ARIA goes
    // wrong, so it gets its own run.
    await page.goto(`${URL}?candidate=on`);
    await deleteButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // WAIT FOR THE TRANSITION TO FINISH, and do not remove this. The delta-mui run
    // recorded the trap: an overlay caught mid-fade makes axe blend the surface
    // against the backdrop and report a real-looking SERIOUS `color-contrast`
    // failure that disappears on a rerun. Mantine animates both the content and the
    // overlay, so both are waited on.
    await expect(page.locator(".mantine-Modal-content")).toHaveCSS("opacity", "1");
    await expect(page.locator(".mantine-Modal-overlay")).toHaveCSS("opacity", "1");

    const result = await runAxe(page, {
      section: "app-delete-dialog",
      include: '[role="dialog"]',
    });
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
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "app-00-full-page", testInfo);

    await page.locator(ROOT).scrollIntoViewIfNeeded();
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
    await expect(page.locator('#root > [dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "app-00-full-page", testInfo, { rtl: true });
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-records", testInfo, { rtl: true, fullPage: false });

    // `"ar"`, because the row actions' accessible names come from the fixture labels
    // and are localised with the rest of the screen.
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
