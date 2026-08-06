/**
 * Evidence run for the mangrove-carbon EMBEDDED ISLAND view (`island.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/mangrove-carbon/e2e/demo.spec.ts`, and deliberately the same shape as
 * `apps/mangrove-mui/e2e/island.spec.ts` so the two pairings are comparable.
 *
 * The leakage assertion is the important one here, and it is measuring more than
 * the kitchen sink's does. In the kitchen sink the candidate sits after a canary
 * block in an otherwise plain content column. In this view it sits inside the real
 * published UNDRR page frame: a four-colour decoration bar, the masthead and logo,
 * `mg-mega-topbar` navigation with `role="menubar"`, and host prose immediately
 * above and below the candidate region. The same 14 canaries are diffed, but now
 * with real neighbouring content either side.
 *
 * FOR THIS PAIRING IT IS MEASURED TWICE, because Carbon is the only candidate
 * whose documented consumption route is a global stylesheet that restyles the
 * document:
 *
 *   default (`carbonCss=global`)  Carbon exactly as documented. LEAKS.
 *   `?carbonCss=scoped`           the containment experiment. Recorded separately.
 *
 * The kitchen-sink spec carries the deliberately-FAILING assertion that makes the
 * global result impossible to miss (see the note at the top of demo.spec.ts). This
 * spec does not repeat it: a second red test in a second view would triple the
 * noise without adding a measurement. Instead it ASSERTS THE DEFECT — the global
 * build must still differ, the scoped build must still be clean — so a Carbon
 * release that changes either one fails here rather than letting the evidence go
 * stale.
 *
 * AXE COUNTS ARE RECORDED, NOT ASSERTED AGAINST ZERO. Claiming conformance is
 * forbidden by the brief, and the Mangrove host contributes its own documented
 * `link-in-text-block` violation plus the `role="menubar"` navigation the frame
 * renders as a deliberate adversary.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import { MANGROVE_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The island's entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/island.html";

const ROOT = "[data-candidate-root]";

/** Carbon's Pagination reports "1–10 of 250 items" in this element. */
const PAGINATION_COUNT = `${ROOT} .cds--pagination__items-count`;

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Clicks a locale.
 *
 * `data-locale` rather than a role or text query: Carbon's `Switch` inside a
 * `ContentSwitcher` renders `button[role="tab"]`, and targeting by visible text
 * would break on the Arabic pass. Same reasoning as the kitchen sink's helper,
 * which clicks a `label[for]` for the same class of reason.
 */
async function selectLocale(page: Page, code: string): Promise<void> {
  await page.locator(`[data-locale="${code}"]`).click();
}

/**
 * Opens a Carbon `Dropdown` and picks an option.
 *
 * Carbon renders the menu INSIDE the ListBox element carrying the `id`, and only
 * while it is open, so both halves scope to that id — no portal to chase and no
 * ambiguity with the other two dropdowns above the table.
 */
async function chooseOption(page: Page, dropdownId: string, option: string): Promise<void> {
  await page.locator(`#${dropdownId} button`).click();
  await page
    .locator(`#${dropdownId} li[role="option"]`)
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
}

/** The island mounts after several dynamic imports; wait for the real tree. */
async function open(page: Page, query = "?candidate=on"): Promise<void> {
  await page.goto(`${URL}${query}`);
  await expect(page.locator(`${ROOT} table`)).toHaveCount(1);
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await open(page);

    // Exactly one candidate region, holding the filters, the table and Carbon's
    // pagination and nothing else.
    await expect(page.locator(ROOT)).toHaveCount(1);
    await expect(page.locator(`${ROOT} #island-filters`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .cds--data-table`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .cds--pagination`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .cds--tag`).first()).toBeVisible();

    // The known-issues box and the view switcher are host chrome and must sit
    // OUTSIDE the candidate subtree, where no candidate stylesheet can restyle
    // them.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        knownIssues: root?.querySelectorAll("[class*='known-issues']").length ?? -1,
        switcher: root?.querySelectorAll('nav[aria-label="Demo views"]').length ?? -1,
      };
    });
    expect(insideCandidate.knownIssues, "the known-issues box is inside the candidate subtree").toBe(
      0,
    );
    expect(insideCandidate.switcher, "the view switcher is inside the candidate subtree").toBe(0);
  });

  test("the candidate subtree is empty with candidate=off", async ({ page }) => {
    // The premise the leakage assertion rests on: the baseline load must contain
    // the host frame and nothing of the candidate's — and for this pairing that
    // includes Carbon's STYLESHEET, which island-main.tsx does not import when the
    // candidate is off. See src/css-mode.ts for why that matters more here than
    // for any other pairing.
    await page.goto(`${URL}?candidate=off`);
    await expect(page.locator('[data-frame-canary="frame-prose-after"]')).toHaveCount(1);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return {
        children: root?.children.length ?? -1,
        innerHtmlLength: root?.innerHTML.length ?? -1,
        canaries: document.querySelectorAll("[data-canary]").length,
        carbonStylesheets: Array.from(document.styleSheets).filter((sheet) =>
          /styles-|carbon-scoped/.test(sheet.href ?? ""),
        ).length,
      };
    });

    writeJson("test-results/island-candidate-off.json", state);

    expect(state.children, "candidate=off left content in the candidate subtree").toBe(0);
    expect(state.innerHtmlLength).toBe(0);
    expect(state.canaries).toBe(CANARY_IDS.length);
    expect(state.carbonStylesheets, "Carbon's CSS is present in the leakage baseline").toBe(0);
  });

  test("renders every host canary and every frame canary", async ({ page }) => {
    await open(page);

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

  test("leakage with Carbon's documented global stylesheet", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });
    writeJson("test-results/island-leakage.json", result);

    await testInfo.attach("island-leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    // Same 14 canaries as the kitchen sink. If this drops, the frame stopped
    // rendering part of the contract and the assertion silently covers less.
    expect(result.canariesChecked).toBe(CANARY_IDS.length);

    // eslint-disable-next-line no-console
    console.log(
      `island leakage (Carbon global CSS): ${result.differences.length} ` +
        `computed-property differences across ${result.canariesChecked} canaries, ` +
        `on ${new Set(result.differences.map((d) => d.canary)).size} canaries`,
    );

    /*
     * ASSERTS THE DEFECT. `@carbon/styles/css/styles.css` opens with a global reset
     * over html, body, h1-h6, p, a, table, button, ul, ol and more, and it is not
     * containable: restyling the document is what it is for. The kitchen-sink spec
     * carries the assertion that FAILS on this, so the finding cannot be missed;
     * here the expectation is inverted so that a Carbon release which stops leaking
     * fails this test instead of quietly making the evidence wrong.
     */
    expect(
      result.differences.length,
      "Carbon's global stylesheet no longer changes the host canaries in the island " +
        "frame. Re-measure and update evidence.json.leakage and EVIDENCE.md.",
    ).toBeGreaterThan(0);
  });

  test("leakage with the scoped-CSS containment experiment", async ({ page }, testInfo) => {
    // Same measurement, Carbon compiled inside a `.demo { }` block, so the cost of
    // containment is a number rather than an opinion. See src/carbon-scoped.scss
    // for the four measured costs of taking that route.
    const result = await checkLeakage(page, { url: `${URL}?carbonCss=scoped` });
    writeJson("test-results/island-leakage-scoped.json", result);

    await testInfo.attach("island-leakage-scoped.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.canariesChecked).toBe(CANARY_IDS.length);

    // eslint-disable-next-line no-console
    console.log(
      `island leakage (Carbon scoped CSS): ${result.differences.length} differences`,
    );

    expect(
      result.differences,
      `containment failed in the island frame:\n${JSON.stringify(result.differences, null, 2)}`,
    ).toEqual([]);
  });

  test("filters the table from the controls above it", async ({ page }) => {
    await open(page);

    await expect(page.locator("#island-count")).toContainText("250 / 250");
    await expect(page.locator(PAGINATION_COUNT)).toContainText("250");

    await chooseOption(page, "island-hazard", "Drought");

    // The count line above the table and Carbon's pagination footer must agree:
    // they are driven by the same filtered array.
    await expect(page.locator("#island-count")).toContainText("34 / 250");
    await expect(page.locator(PAGINATION_COUNT)).toContainText("34");
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);
  });

  test("filters by data source through the search field", async ({ page }) => {
    await open(page);

    // A `Search` over one column, not `TableToolbarSearch` over every cell: a real
    // UNDRR page puts named filters above the table. Carbon has no per-column
    // filter model, so the predicate is ours.
    await page.locator("#island-source").fill("DesInventar");
    await expect(page.locator("#island-count")).toContainText("44 / 250");

    await page.locator("#island-source").fill("");
    await expect(page.locator("#island-count")).toContainText("250 / 250");
  });

  test("sorts the filtered set with Carbon's own comparator", async ({ page }) => {
    await open(page);

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const header = page.locator(`${ROOT} thead th button`, { hasText: "Country" });

    await header.click();
    await expect(firstCell).toHaveText("Bangladesh");

    await header.click();
    await expect(firstCell).not.toHaveText("Bangladesh");
  });

  test("paginates, and returns to page one when a filter changes", async ({ page }) => {
    await open(page);

    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);
    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const firstOnPageOne = await firstCell.innerText();

    await page.locator(ROOT).getByRole("button", { name: "Next page" }).click();
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);
    expect(await firstCell.innerText()).not.toBe(firstOnPageOne);

    // Page state and filter state are separate — Carbon's Pagination knows nothing
    // about the table — so a filter change on page 2 would otherwise strand the
    // reader on an empty page.
    await chooseOption(page, "island-hazard", "Drought");
    await expect(page.locator(PAGINATION_COUNT)).toContainText("34");
    await expect(page.locator(PAGINATION_COUNT)).toContainText("1");
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await open(page);
    await selectLocale(page, "ar");

    // The frame root is what carries it: the host chrome flips with the candidate
    // rather than the candidate flipping alone inside an LTR page. The candidate
    // wrapper deliberately does not repeat the attribute — Carbon is authored in
    // logical properties and inherits direction.
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);

    // A Carbon INTERNAL actually mirrored, not just the container: the pagination
    // row's `__left` block belongs at the physical right in RTL.
    const measurement = await page
      .locator(`${ROOT} .cds--pagination__left`)
      .first()
      .evaluate((el) => {
        const parent = el.parentElement;
        if (!parent) return null;
        const box = el.getBoundingClientRect();
        const outer = parent.getBoundingClientRect();
        return {
          startGapPx: Math.round(box.left - outer.left),
          endGapPx: Math.round(outer.right - box.right),
          candidateDirection: getComputedStyle(el).direction,
        };
      });

    writeJson("test-results/island-rtl.json", measurement);

    expect(measurement).not.toBeNull();
    if (measurement) {
      expect(measurement.candidateDirection).toBe("rtl");
      expect(measurement.endGapPx, "Carbon's pagination row did not mirror").toBeLessThan(
        measurement.startGapPx,
      );
    }
  });

  test("axe on the candidate region and the whole page", async ({ page }, testInfo) => {
    await open(page);

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

    // And again with Carbon contained, because Carbon's global reset can MASK the
    // host's own failures as well as cause new ones — worth knowing in both
    // directions.
    await open(page, "?candidate=on&carbonCss=scoped");
    const scopedBuild = await runAxe(page, { section: "island-whole-page-scoped-css" });
    writeJson("test-results/axe-island-whole-page-scoped-css.json", scopedBuild);

    // eslint-disable-next-line no-console
    console.log(
      `axe island scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete ` +
        `[${scoped.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "none"}] | ` +
        `whole page: ${wholePage.counts.violations} ` +
        `[${wholePage.violations.map((v) => v.id).join(", ") || "none"}] | ` +
        `whole page, Carbon contained: ${scopedBuild.counts.violations} ` +
        `[${scopedBuild.violations.map((v) => v.id).join(", ") || "none"}]`,
    );

    await testInfo.attach("axe-island-summary.json", {
      body: JSON.stringify({ scoped, wholePage, scopedBuild }, null, 2),
      contentType: "application/json",
    });

    // Recorded, not asserted against zero: the counts are the output, and claiming
    // conformance is forbidden by the brief.
    expect(scoped.counts.violations).toBeGreaterThanOrEqual(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await open(page);
    await captureScreens(page, "island-00-full-page", testInfo);

    // The seam between host prose and the candidate region is what this view
    // exists to show, so it gets its own viewport-sized shot.
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, { fullPage: false });

    await chooseOption(page, "island-hazard", "Drought");
    await captureScreens(page, "island-02-filtered", testInfo, { fullPage: false });

    // The same seam with Carbon contained. The pair is the evidence: the host
    // chrome above the region is Carbon-reset in one and untouched in the other.
    await open(page, "?candidate=on&carbonCss=scoped");
    await captureScreens(page, "island-03-scoped-css", testInfo);
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await open(page);
    await selectLocale(page, "ar");
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "island-00-full-page", testInfo, { rtl: true });
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, {
      rtl: true,
      fullPage: false,
    });
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await open(page);
    await selectLocale(page, "de");

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
