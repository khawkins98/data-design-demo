/**
 * Evidence run for the mangrove-mantine EMBEDDED ISLAND view (`island.html`).
 *
 * Same helpers, same viewport projects and the same structure as
 * `apps/mangrove-mantine/e2e/demo.spec.ts` and `apps/mangrove-mui/e2e/island.spec.ts`,
 * so the three views of this pairing and the two candidates' islands are directly
 * comparable.
 *
 * The leakage assertion is the important one here, and it is measuring more than
 * the kitchen sink's does: the candidate now sits inside the real published UNDRR
 * page frame, with host prose immediately above AND below it, rather than after a
 * canary block in an otherwise plain content column. The same 14 canaries are
 * diffed; what changes is that a candidate whose last component collapses a
 * following margin has somewhere to show up.
 *
 * It is also measuring something for real rather than vacuously, which for Mantine
 * takes work. Mantine ships a plain stylesheet, so a statically imported
 * `mantine-styles.css` would sit in BOTH loads of the leakage comparison and cancel
 * itself out. `src/island-main.tsx` defers the import into the `candidate=on`
 * branch, and the first test below proves the deferral held by checking that not one
 * `--mantine-*` custom property exists on the baseline load.
 *
 * The frame's own chrome carries a SEPARATE contract (`data-frame-canary`,
 * `MANGROVE_FRAME_CANARY_IDS`), asserted here for presence.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import { MANGROVE_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The island's entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/island.html";

/**
 * Every table locator is scoped to the candidate region. `HostCanaries` renders a
 * canary TABLE of its own immediately above the island, so an unscoped `tbody tr`
 * counts host rows as candidate rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * `SegmentedControl` renders a visually hidden radio behind a `<label>`, and the
 * label intercepts pointer events. Clicking the label is the working route — the
 * same helper the kitchen-sink spec uses.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(".mantine-SegmentedControl-label", { hasText: label }).first().click();
}

/**
 * The dropdown that is currently open.
 *
 * `:visible` is not decoration. Every `Select` renders its dropdown div up front and
 * hides it with `display: none`, so this view has THREE `.mantine-Select-dropdown`
 * nodes in the DOM at all times and `.first()` is whichever Select happens to be
 * first in source order, open or not. Measured, not assumed — an earlier version of
 * this spec used `.first()` and timed out waiting for the country dropdown to become
 * visible while the hazard dropdown was the one on screen.
 */
function openDropdown(page: Page) {
  return page.locator(".mantine-Select-dropdown:visible");
}

/**
 * Opens one of the filter `Select`s and picks an option from its PORTALLED
 * dropdown. The dropdown is at `document.body`, i.e. outside the candidate root, so
 * the option locator deliberately is not scoped to `ROOT`.
 */
async function chooseOption(page: Page, testId: string, option: string): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  // A closed dropdown renders no options at all, so this is the close signal.
  await expect(page.getByRole("option")).toHaveCount(0);
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Exactly one candidate region, holding the filters, the table and pagination.
    await expect(page.locator(ROOT)).toHaveCount(1);
    await expect(page.locator(`${ROOT} form`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} table`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .mantine-Pagination-root`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .mantine-Badge-root`).first()).toBeVisible();

    // The known-issues box and the view switcher are host chrome and must sit
    // OUTSIDE the candidate subtree, where no candidate stylesheet can restyle them.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        knownIssues: root?.querySelectorAll("[class*='known-issues']").length ?? -1,
        switcher: root?.querySelectorAll('nav[aria-label="Demo views"]').length ?? -1,
      };
    });
    expect(insideCandidate.knownIssues, "known-issues box inside the candidate subtree").toBe(0);
    expect(insideCandidate.switcher, "view switcher inside the candidate subtree").toBe(0);

    // The switcher offers the two views this app ships and no third.
    const switcher = page.locator('nav[aria-label="Demo views"]');
    await expect(switcher).toHaveCount(1);
    await expect(switcher).toContainText("Component inventory");
    await expect(switcher, "offered a Delta-only view on a Mangrove host").not.toContainText(
      "A whole DELTA screen",
    );
  });

  test("the candidate subtree is empty with candidate=off, and Mantine's CSS is absent", async ({
    page,
  }) => {
    // The premise the leakage assertion rests on, twice over: the baseline load must
    // contain the host frame and nothing of the candidate's — no DOM, and no CSS.
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

    writeJson("test-results/island-candidate-off.json", state);

    expect(state.children, "candidate=off left content in the candidate subtree").toBe(0);
    expect(state.innerHtmlLength).toBe(0);
    expect(state.canaries).toBe(CANARY_IDS.length);
    // If either of these has a value, `mantine-styles.css` reached the baseline load
    // and the leakage result below is vacuous rather than clean.
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

    // Same 14 canaries as the kitchen sink. If this number drops, the frame stopped
    // rendering part of the contract and the assertion silently covers less.
    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Mantine inside the island frame:\n${JSON.stringify(
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

    const count = page.getByTestId("island-count");
    await expect(count).toHaveText("250 / 250");
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);

    await chooseOption(page, "island-filter-hazard", "Drought");
    await expect(count).toHaveText("34 / 250");
    await expect(page.getByTestId("island-page-summary")).toHaveText("Page 1 / 4");

    await chooseOption(page, "island-filter-status", "disputed");
    // Two filters compose rather than replacing one another.
    await expect(count).not.toHaveText("34 / 250");

    // Clearing is a single control and must restore the full set.
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(count).toHaveText("250 / 250");
  });

  test("resets to page one when a filter changes", async ({ page }) => {
    // Filter state and page state are separate, so a filter change on page 3 would
    // otherwise strand the reader on an empty page.
    await page.goto(`${URL}?candidate=on`);

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByTestId("island-page-summary")).toHaveText("Page 2 / 25");

    await chooseOption(page, "island-filter-hazard", "Drought");
    await expect(page.getByTestId("island-page-summary")).toHaveText("Page 1 / 4");
  });

  test("paginates the filtered result", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const summary = page.getByTestId("island-page-summary");
    await expect(summary).toHaveText("Page 1 / 25");

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(summary).toHaveText("Page 2 / 25");
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);

    // The four EDGE controls have accessible names only because `getControlProps`
    // supplies them; Mantine ships them nameless. Asserted so a regression in that
    // wiring fails here rather than only in the axe run.
    await page.getByRole("button", { name: "Last page" }).click();
    await expect(summary).toHaveText("Page 25 / 25");
    await page.getByRole("button", { name: "First page" }).click();
    await expect(summary).toHaveText("Page 1 / 25");
  });

  test("sorts from a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const before = await firstCell.innerText();

    // Default sort is eventDate descending, declared through `aria-sort` because
    // Mantine's `Table.Th` has no sorting affordance of its own.
    await expect(page.locator(`${ROOT} th[aria-sort="descending"]`)).toHaveCount(1);

    await page.getByRole("button", { name: "Sort by Country" }).click();
    await expect(page.locator(`${ROOT} th[aria-sort="ascending"]`)).toHaveCount(1);
    await expect(firstCell).toHaveText("Bangladesh");

    await page.getByRole("button", { name: "Sort by Country" }).click();
    await expect(firstCell).not.toHaveText("Bangladesh");

    writeJson("test-results/island-sort.json", { unsortedFirstCountry: before });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // The frame root carries it, i.e. the host chrome flips WITH the candidate.
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);
    // And `<html>` carries it too, because Mantine's only direction API writes
    // there. See the DirectionSync note in src/IslandView.tsx: that is a candidate
    // mutating host DOM, and it is also what keeps portals in the right direction.
    await expect(page.locator('html[dir="rtl"]')).toHaveCount(1);
  });

  /**
   * The portal direction measurement, which is the finding this view was built to
   * check for Mantine.
   *
   * `IslandFrame` puts `dir` on its own wrapper, not on `<html>`. A portal appended
   * to `document.body` is outside that wrapper, so on the face of it every dropdown
   * should render left-to-right inside a right-to-left page — the defect the pilot
   * measured for React Aria's overlays. It does not happen here, and for a reason
   * that is not to Mantine's credit: its `setDirection()` writes `dir` to
   * `document.documentElement`, so the portal inherits RTL from the host's own root
   * element. Recorded as a measurement rather than assumed either way.
   */
  test("portalled dropdowns follow the page direction", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    await page.getByTestId("island-filter-hazard").click();
    await expect(openDropdown(page)).toBeVisible();

    const measurement = await page.evaluate(() => {
      const node = [...document.querySelectorAll(".mantine-Select-dropdown")].find(
        (candidate) => getComputedStyle(candidate).display !== "none",
      );
      const inside = document.querySelector("[data-candidate-root] table");
      return {
        dropdownIsInsideCandidateRoot: node
          ? Boolean(node.closest("[data-candidate-root]"))
          : null,
        dropdownDirection: node ? getComputedStyle(node).direction : "",
        // Proves the token scope reached the portal: `OVERLAY_CLASS` carries
        // `.undrr-tokens`, without which `var(--undrr-*)` inside a portal is void.
        dropdownFocusToken: node
          ? getComputedStyle(node).getPropertyValue("--undrr-color-focus").trim()
          : "",
        dropdownBackground: node ? getComputedStyle(node).backgroundColor : "",
        subtreeDirection: inside ? getComputedStyle(inside).direction : "",
        htmlDir: document.documentElement.getAttribute("dir"),
      };
    });

    writeJson(`test-results/island-rtl-portal-${testInfo.project.name}.json`, measurement);

    expect(measurement.dropdownIsInsideCandidateRoot, "dropdown is not portalled").toBe(false);
    expect(measurement.subtreeDirection, "candidate subtree direction").toBe("rtl");
    expect(measurement.dropdownDirection, "portalled dropdown direction").toBe("rtl");
    expect(measurement.dropdownFocusToken, "token scope did not reach the portal").not.toBe("");
    // Not transparent: the failure mode docs/requirements.md warns about.
    expect(measurement.dropdownBackground).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("axe on the candidate region and the whole page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const scoped = await runAxe(page, {
      section: "island-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-candidate-subtree.json", scoped);

    // Whole page includes the frame's own chrome: Mangrove's known
    // `link-in-text-block` violation on its canary paragraph, and the
    // `role="menubar"` navigation the frame renders deliberately as an adversary.
    // Both are host baseline, not ours.
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

  test("axe on an open portalled dropdown", async ({ page }, testInfo) => {
    // The dropdown is portalled to `document.body`, i.e. outside the candidate
    // root, so the scoped run above cannot see it.
    await page.goto(`${URL}?candidate=on`);
    await page.getByTestId("island-filter-status").click();
    await expect(openDropdown(page)).toBeVisible();

    const result = await runAxe(page, {
      section: "island-dropdown",
      include: ".mantine-Select-dropdown",
    });
    writeJson("test-results/axe-island-dropdown.json", result);

    // eslint-disable-next-line no-console
    console.log(
      `axe island dropdown: ${result.counts.violations} violations ` +
        `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
        `${result.counts.incomplete} incomplete`,
    );

    await testInfo.attach("axe-island-dropdown.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.counts.critical).toBe(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "island-00-full-page", testInfo);

    // The seam between host prose and the candidate region is what this view exists
    // to show, so it gets its own viewport-sized shot.
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, { fullPage: false });

    await chooseOption(page, "island-filter-hazard", "Drought");
    await captureScreens(page, "island-02-filtered", testInfo, { fullPage: false });

    await page.getByTestId("island-filter-status").click();
    await expect(openDropdown(page)).toBeVisible();
    await captureScreens(page, "island-03-dropdown", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "island-00-full-page", testInfo, { rtl: true });
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, {
      rtl: true,
      fullPage: false,
    });

    await page.getByTestId("island-filter-status").click();
    await expect(openDropdown(page)).toBeVisible();
    await captureScreens(page, "island-03-dropdown", testInfo, { rtl: true, fullPage: false });
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
