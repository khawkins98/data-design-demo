/**
 * Evidence run for the mangrove-antd EMBEDDED ISLAND view (`island.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/mangrove-antd/e2e/demo.spec.ts`, so the three views of this pairing are
 * directly comparable. What differs is what is being measured.
 *
 * THE CASCADE-LAYER ASSERTION IS THE POINT OF THIS FILE. `StyleProvider layer`
 * wraps every antd rule in a CSS `@layer`; Mangrove 1.8.1 ships none; unlayered
 * CSS beats layered CSS regardless of specificity. The kitchen sink measured that
 * against a canary block. Here it is measured where UNDRR would actually see it —
 * an antd `Input` a few pixels below Mangrove's own prose, inside `mg-container`,
 * under the real masthead — against a bare `<input>` injected into the SAME page at
 * measurement time, so it is not an eyeball judgement. See
 * `test-results/island-layer-takeover.json`.
 *
 * The leakage assertion measures more than the kitchen sink's does: the same 14
 * canaries, but now with real host prose immediately above AND below the candidate
 * region rather than above it only.
 *
 * The frame's own chrome carries a SEPARATE contract (`data-frame-canary`,
 * `MANGROVE_FRAME_CANARY_IDS`); see packages/test-harness/src/frame-canaries.ts for
 * why it is separate from `CANARY_IDS`.
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
 * Every table locator is scoped to the candidate region. The frame renders a host
 * canary TABLE of its own inside `HostCanaries`, so an unscoped `tbody tr` counts
 * host rows as candidate rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * antd's Segmented renders a visually-hidden radio inside a label, so clicking the
 * radio itself times out — it is covered by the label's own div. The role IS
 * exposed correctly, so this is a clickability quirk rather than an accessibility
 * defect. Clicking antd's own `title`-bearing label is the reliable route; same
 * helper as `demo.spec.ts`.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(`.ant-segmented-item-label[title="${label}"]`).click();
}

/**
 * Opens one of the filter selects and picks an option.
 *
 * The listbox is portalled into `.demo` by `getPopupContainer`, not to
 * document.body, so it is inside the candidate root — which is why the scoped axe
 * run below can see an open dropdown at all.
 */
async function chooseOption(page: Page, fieldId: string, optionTitle: string): Promise<void> {
  await page.locator(`#${fieldId}`).click();
  /*
   * Scoped by the field's OWN listbox id, not by `:not(.ant-select-dropdown-hidden)`.
   * antd keeps a previous field's dropdown in the DOM through its leave transition,
   * so a class-only selector matches two overlays at once and fails strict mode.
   */
  const dropdown = page
    .locator(".ant-select-dropdown")
    .filter({ has: page.locator(`#${fieldId}_list`) });
  // Wait for the open transition to settle before clicking an option. Without this
  // the click can land on the mid-animation position of a virtualised list.
  await expect(dropdown).toHaveCSS("opacity", "1");
  await dropdown.locator(`.ant-select-item-option[title="${optionTitle}"]`).click();
  await expect(page.locator(`#${fieldId}`)).toHaveAttribute("aria-expanded", "false");
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Exactly one candidate region, holding the filter controls, the table and
    // the pagination the brief asks the island to own.
    await expect(page.locator(ROOT)).toHaveCount(1);
    await expect(page.locator(`${ROOT} #island-filters`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-table`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-pagination`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-tag`).first()).toBeVisible();

    // The known-issues box is host chrome and must sit OUTSIDE the candidate
    // subtree, where no candidate stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return root?.querySelectorAll("[class*='known-issues']").length ?? -1;
    });
    expect(insideCandidate, "the known-issues box is inside the candidate subtree").toBe(0);

    // Same for the view switcher, which goes through the same `notices` slot.
    await expect(page.locator(`${ROOT} .mg-viewswitcher`)).toHaveCount(0);
    await expect(page.locator(".mg-viewswitcher")).toHaveCount(1);
    await expect(
      page.locator('.mg-viewswitcher [aria-current="page"]'),
    ).toHaveText("Inside a real page");
    // This host ships no app.html, so the switcher must not offer that view.
    await expect(page.locator('.mg-viewswitcher a[href="./app.html"]')).toHaveCount(0);
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
        antdStyleTags: document.querySelectorAll("style[data-css-hash]").length,
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
      `host canaries changed after mounting antd inside the island frame:\n${JSON.stringify(
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

  /**
   * The finding this pairing exists to record, measured in the island.
   *
   * A bare `<input type="text">` is injected into the live page at measurement
   * time and compared property-for-property against antd's own `Input` in the
   * filter row. Identical values mean Mangrove's element selectors have taken the
   * antd control over completely — which is what `@layer` guarantees against an
   * unlayered host sheet, and which no amount of seed-token work can undo.
   *
   * Asserted, not merely recorded, in BOTH directions: if the values ever diverge
   * the layer behaviour has changed (Mangrove 2.0 adopting layers would do it) and
   * `EVIDENCE.md` plus `known-issues` need revisiting rather than going stale.
   */
  test("Mangrove's unlayered rules take over antd's controls", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const measurement = await page.evaluate(() => {
      const props = [
        "borderTopWidth",
        "borderTopColor",
        "borderTopStyle",
        "borderRadius",
        "height",
        "fontFamily",
      ] as const;

      const read = (el: Element): Record<string, string> => {
        const s = getComputedStyle(el);
        return Object.fromEntries(props.map((p) => [p, s[p]]));
      };

      const layered = [...document.querySelectorAll("style")].filter((s) =>
        (s.textContent ?? "").includes("@layer"),
      ).length;

      const antdInput = document.querySelector(
        "[data-candidate-root] #island-source",
      ) as HTMLElement | null;
      if (!antdInput) {
        return {
          error: "no antd input found",
          antd: {} as Record<string, string>,
          bareMangroveInput: {} as Record<string, string>,
          antdStyleTagsUsingLayer: layered,
          antdClassStillPresent: false,
        };
      }

      // Injected as a SIBLING of the antd control, so both sit at the same depth
      // in the same cascade. Removed again before returning.
      const probe = document.createElement("input");
      probe.type = "text";
      antdInput.parentElement?.appendChild(probe);
      const bare = read(probe);
      probe.remove();

      return {
        error: null as string | null,
        antd: read(antdInput),
        bareMangroveInput: bare,
        antdStyleTagsUsingLayer: layered,
        antdClassStillPresent: antdInput.className.includes("ant-input"),
      };
    });

    writeJson("test-results/island-layer-takeover.json", {
      ...measurement,
      note:
        "antd's Input and a bare Mangrove input, measured in the same page. Identical " +
        "values mean Mangrove's unlayered element selectors beat antd's layered " +
        "class selectors. Zero lines of repair CSS were written to achieve this; the " +
        "seed tokens for controlHeight and borderRadius do not reach the control.",
    });

    await testInfo.attach("island-layer-takeover.json", {
      body: JSON.stringify(measurement, null, 2),
      contentType: "application/json",
    });

    expect(measurement.error).toBeNull();
    expect(
      measurement.antdStyleTagsUsingLayer,
      "no antd style tag used @layer, so StyleProvider layer did nothing",
    ).toBeGreaterThan(0);
    // The class is still there — antd has not stopped styling, it has lost.
    expect(measurement.antdClassStillPresent).toBe(true);
    expect(
      measurement.antd,
      "antd's Input and a bare Mangrove input no longer compute identically. The " +
        "cascade-layer takeover this pairing's EVIDENCE.md rests on has changed; " +
        "re-measure before trusting either host's screenshots.",
    ).toEqual(measurement.bareMangroveInput);
  });

  /**
   * THE CONSEQUENCE THE KITCHEN SINK COULD NOT SHOW, and the single most important
   * thing this view measures.
   *
   * The cascade-layer takeover is not only cosmetic. antd 6 renders `Select` as a
   * `div.ant-select-content` holding the visible value, with a `readonly`
   * `input.ant-select-input` absolutely positioned on top of it. antd's own CSS
   * gives that input a transparent background. Mangrove's unlayered `input` rules
   * give it `background-color: #fff` and `height: 46px`, and layered CSS cannot win,
   * so the input becomes an OPAQUE WHITE BOX PAINTED OVER THE SELECTED VALUE.
   *
   * A reader of this page therefore cannot see which country, hazard or status they
   * have filtered by. The filter works — the row count changes, and the sibling
   * assertions prove it — but the control shows nothing. The same defect blanks the
   * pagination's page-size changer.
   *
   * The kitchen sink could not surface this, and did not: its selects in
   * `SectionSelection` start with NO value, so an empty-looking select reads as an
   * empty select. Only a screen where a filter is actually applied makes it visible.
   * Compare `screenshots/desktop/island-02-filtered.png`, where the table shows 34
   * drought rows beside a Hazard type control that appears blank.
   *
   * This is the finding that turns "antd loses to Mangrove" from a styling decision
   * into a functional one, and it belongs in `packages/known-issues` as a blocker
   * for the antd/mangrove pairing. That package is import-only for this run, so it
   * is reported rather than edited.
   *
   * ASSERTS THE DEFECT, deliberately, in the same spirit as the MUI runs' RTL
   * assertions: the day it stops reproducing — an antd release, a Mangrove 2.0 that
   * adopts cascade layers, or repair CSS being added here — this test fails and the
   * evidence gets revisited rather than quietly going stale.
   */
  test("Mangrove's input background hides antd's selected value", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await chooseOption(page, "island-hazard", "Drought");
    // The filter really did apply, so what follows is about VISIBILITY, not state.
    await expect(page.locator(ROOT)).toContainText("34 / 250");

    const measurement = await page.evaluate(() => {
      const input = document.querySelector("#island-hazard") as HTMLElement | null;
      const content = input?.closest(".ant-select-content") as HTMLElement | null;
      if (!input || !content) {
        return {
          error: "no select found",
          selectedValue: "",
          inputBackgroundColor: "",
          inputPosition: "",
          inputHeightPx: 0,
          contentHeightPx: 0,
          valueIsCovered: false,
          topmostAtValue: "",
        };
      }
      const box = content.getBoundingClientRect();
      // Just inside the value's own leading edge, where the text sits.
      const topmost = document.elementFromPoint(box.left + 12, box.top + box.height / 2);
      const style = getComputedStyle(input);
      return {
        error: null as string | null,
        selectedValue: content.textContent ?? "",
        inputBackgroundColor: style.backgroundColor,
        inputPosition: style.position,
        inputHeightPx: Math.round(input.getBoundingClientRect().height),
        contentHeightPx: Math.round(box.height),
        valueIsCovered: topmost === input,
        topmostAtValue: topmost ? `${topmost.tagName.toLowerCase()}.${topmost.className}` : "",
      };
    });

    writeJson("test-results/island-select-value-hidden.json", {
      ...measurement,
      note:
        "antd renders the Select's value in a div and overlays a readonly input on " +
        "top of it. antd's CSS makes that input transparent; Mangrove's unlayered " +
        "input rules make it opaque white and 46px tall, and layered CSS cannot " +
        "win. The selected value is painted over. Zero repair CSS was written, which " +
        "is the pairing's whole premise — and this is what that premise costs.",
    });

    await testInfo.attach("island-select-value-hidden.json", {
      body: JSON.stringify(measurement, null, 2),
      contentType: "application/json",
    });

    expect(measurement.error).toBeNull();
    // The value IS in the DOM, so this is not a state bug.
    expect(measurement.selectedValue).toBe("Drought");
    // And it is invisible, because Mangrove's opaque input sits over it.
    expect(
      measurement.inputBackgroundColor,
      "antd's select overlay input is no longer opaque; the value may now be visible " +
        "and this pairing's headline defect needs re-measuring",
    ).toBe("rgb(255, 255, 255)");
    expect(
      measurement.valueIsCovered,
      `the element on top of the selected value is ${measurement.topmostAtValue}; if it ` +
        "is no longer the overlay input, re-measure and update EVIDENCE.md",
    ).toBe(true);
  });

  /**
   * The `aria-hidden-focus` trap, and the proof that avoiding it worked.
   *
   * `rc-table` renders an `aria-hidden` measure row whenever `scroll.x` is set.
   * With `rowSelection` that row contains a focusable checkbox, which is a real
   * `aria-hidden-focus` violation belonging to antd. This view keeps `scroll.x`
   * (without it seven columns overflow the Mangrove content column at 390px) and
   * drops `rowSelection`, so the measure row is present and empty.
   *
   * Asserted both ways: the row must EXIST, or the trap is not being exercised at
   * all and this test proves nothing; and it must contain nothing focusable.
   */
  test("the aria-hidden measure row contains nothing focusable", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      if (!root) {
        return {
          error: "no candidate root",
          measureRows: -1,
          ariaHiddenSubtrees: -1,
          offenders: [] as Array<{ tag: string; className: string; focusable: number }>,
          rowSelectionCheckboxes: -1,
        };
      }
      const FOCUSABLE =
        "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
      const hiddenSubtrees = [...root.querySelectorAll('[aria-hidden="true"]')];
      const offenders = hiddenSubtrees
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === "string" ? el.className : "",
          focusable: el.querySelectorAll(FOCUSABLE).length,
        }))
        .filter((entry) => entry.focusable > 0);

      return {
        error: null as string | null,
        measureRows: root.querySelectorAll('tr[aria-hidden="true"]').length,
        ariaHiddenSubtrees: hiddenSubtrees.length,
        offenders,
        rowSelectionCheckboxes: root.querySelectorAll(
          "table input[type='checkbox']",
        ).length,
      };
    });

    writeJson("test-results/island-aria-hidden-measure-row.json", {
      ...state,
      note:
        "rc-table renders an aria-hidden measure row whenever scroll.x is set. With " +
        "rowSelection it carries a focusable checkbox and axe reports " +
        "aria-hidden-focus (serious). This view keeps scroll.x and drops " +
        "rowSelection, so it has no bulk-action affordance at all. That is the cost.",
    });

    expect(state.error).toBeNull();
    expect(
      state.measureRows,
      "no aria-hidden measure row, so scroll.x is not set and this test is not " +
        "exercising the antd trap it exists to cover",
    ).toBeGreaterThan(0);
    expect(
      state.offenders,
      `focusable elements inside an aria-hidden subtree: ${JSON.stringify(state.offenders)}`,
    ).toEqual([]);
    expect(state.rowSelectionCheckboxes, "rowSelection is back; re-check aria-hidden-focus").toBe(
      0,
    );
  });

  test("filters the table from the controls above it", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(ROOT)).toContainText("250 / 250");
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("250");

    await chooseOption(page, "island-hazard", "Drought");

    // The count line above the table and the pagination total must agree, because
    // they are driven by the same filtered array.
    await expect(page.locator(ROOT)).toContainText("34 / 250");
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("1-10 of 34");
    await expect(page.locator(`${ROOT} tbody tr[data-row-key]`)).toHaveCount(10);

    // A second filter narrows further rather than replacing the first.
    await chooseOption(page, "island-status", "disputed");
    await expect(page.locator(ROOT)).not.toContainText("34 / 250");
  });

  test("paginates the filtered result", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const total = page.locator(`${ROOT} .ant-pagination-total-text`);
    await expect(total).toContainText("1-10 of 250");

    await page.locator(`${ROOT} .ant-pagination-next`).click();
    await expect(total).toContainText("11-20 of 250");
    await expect(page.locator(`${ROOT} tbody tr[data-row-key]`)).toHaveCount(10);

    await page.locator(`${ROOT} .ant-pagination-prev`).click();
    await expect(total).toContainText("1-10 of 250");
  });

  test("resets to page one when a filter changes", async ({ page }) => {
    // Pagination state and filter state are separate, so a filter change on page
    // two would otherwise strand the reader.
    await page.goto(`${URL}?candidate=on`);

    await page.locator(`${ROOT} .ant-pagination-next`).click();
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("11-20");

    await chooseOption(page, "island-hazard", "Drought");
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("1-10 of 34");
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // The frame root is what carries `dir`, i.e. the host chrome flips with the
    // candidate rather than the candidate flipping alone inside an LTR page.
    await expect(page.locator('.mg-island[dir="rtl"]')).toHaveCount(1);

    // antd's own RTL, from ConfigProvider and no build plugin. This is the
    // assertion MUI Community cannot pass at all.
    await expect(page.locator(`${ROOT} .ant-form-rtl`).first()).toBeVisible();
    await expect(page.locator(`${ROOT} .ant-input-rtl`).first()).toBeVisible();
    await expect(page.locator(`${ROOT} .ant-table-rtl`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-pagination-rtl`)).toHaveCount(1);
  });

  /**
   * RTL for a PORTALLED overlay, which is where the pilot found the hosts' frames
   * break candidates: `dir` sits on a frame wrapper, not on `<html>`, so an overlay
   * escaping to document.body loses CSS `direction`.
   *
   * antd has two answers and this measures both. `getPopupContainer` keeps the
   * dropdown inside `.demo`, so `direction` is inherited normally; and antd stamps
   * `.ant-select-dropdown-rtl` on it from ConfigProvider regardless. The computed
   * value is what is asserted, because the class alone would not prove it applied.
   */
  test("portalled dropdowns keep their direction in RTL", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    await page.locator("#island-country").click();
    const dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    await expect(dropdown).toBeVisible();

    const measurement = await page.evaluate(() => {
      const el = document.querySelector(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
      ) as HTMLElement | null;
      if (!el) {
        return {
          error: "no open dropdown",
          direction: "",
          textAlign: "",
          hasRtlClass: false,
          insideCandidateRoot: false,
          parentIsBody: false,
        };
      }
      return {
        error: null as string | null,
        direction: getComputedStyle(el).direction,
        textAlign: getComputedStyle(el).textAlign,
        hasRtlClass: el.className.includes("ant-select-dropdown-rtl"),
        // Where the overlay actually landed. Inside the candidate root means
        // `var(--undrr-*)` resolves AND `dir` is inherited from the frame.
        insideCandidateRoot: Boolean(el.closest("[data-candidate-root]")),
        parentIsBody: el.parentElement === document.body,
      };
    });

    writeJson("test-results/island-rtl-portal.json", {
      ...measurement,
      note:
        "The pilot found portalled overlays lose CSS direction against these frames " +
        "because dir sits on a frame wrapper rather than on <html>. antd avoids it " +
        "twice over: getPopupContainer keeps the overlay inside the candidate root, " +
        "and ConfigProvider stamps the -rtl class independently.",
    });

    expect(measurement.error).toBeNull();
    expect(measurement.insideCandidateRoot, "the dropdown escaped to document.body").toBe(true);
    expect(measurement.direction, "the portalled dropdown lost its direction").toBe("rtl");
    expect(measurement.hasRtlClass).toBe(true);
  });

  /**
   * axe, and the honest consequence of how this view dodged `aria-hidden-focus`.
   *
   * Desktop is clean: zero violations in the candidate region. Tablet and mobile
   * report ONE serious `scrollable-region-focusable`, on `rc-table`'s horizontal
   * scroll container. That is the OTHER end of the `rowSelection` trade. Dropping
   * `rowSelection` removed the focusable checkbox from the `aria-hidden` measure
   * row — which is what the kitchen sink still trips, serious, on
   * `.ant-table-measure-row` — but it also left the scroll container with no
   * focusable descendant at all, and axe wants a horizontally scrollable region to
   * be keyboard-reachable. The Delta application view does NOT report it, at any
   * viewport, because its rows carry row-action buttons.
   *
   * So on a wide antd table the run has three options and no clean one: keep
   * `rowSelection` and take `aria-hidden-focus`; drop it and take
   * `scrollable-region-focusable` unless the rows contain something focusable
   * anyway; or drop `scroll.x` and overflow the page. All three are antd's, not
   * this integration's. Recorded, not asserted away — only `critical` is asserted.
   */
  test("axe on the candidate region and the whole page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const scoped = await runAxe(page, {
      section: "island-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-candidate-subtree.json", scoped);

    // Whole page includes the island frame's own chrome: the Mangrove host's known
    // `link-in-text-block` violation on its canary paragraph, and the
    // `role="menubar"` navigation the frame renders deliberately as an adversary
    // for this run. Both are host baseline, not ours.
    const wholePage = await runAxe(page, { section: "island-whole-page" });
    writeJson("test-results/axe-island-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe island scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete ` +
        `(rules: ${scoped.violations.map((v) => v.id).join(", ") || "none"}) | ` +
        `whole page: ${wholePage.counts.violations} violations ` +
        `(rules: ${wholePage.violations.map((v) => v.id).join(", ") || "none"})`,
    );

    await testInfo.attach("axe-island-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });

    // The candidate region is ours to answer for, so it is asserted rather than
    // only recorded. Counts are recorded either way; zero is not claimed.
    expect(
      scoped.counts.critical,
      `critical axe violations in the candidate region: ${scoped.violations
        .map((v) => v.id)
        .join(", ")}`,
    ).toBe(0);
    // Named explicitly, because this is the antd defect the view was shaped to
    // avoid: if it reappears, `rowSelection` or `scroll.x` changed.
    expect(
      scoped.violations.map((v) => v.id),
      "aria-hidden-focus is back in the candidate region",
    ).not.toContain("aria-hidden-focus");
  });

  /**
   * The open state, measured separately because the closed state is clean and the
   * open one is not.
   *
   * The dropdown is portalled. It stays inside the candidate root here, thanks to
   * `getPopupContainer`, so the scoped run CAN see it — but only while it is open,
   * which the run above is not.
   *
   * WHAT THIS RUN FINDS, recorded rather than asserted away: ONE serious
   * `color-contrast` violation, and it is on the Select's own control, not on the
   * options. antd 6 renders `Select` as a `readonly` `input.ant-select-input`
   * overlaying a sibling `div.ant-select-content` that holds the visible value, and
   * while the dropdown is open it colours that input `rgba(20, 35, 46, 0.22)` —
   * antd's `colorTextQuaternary`, 1.56:1 on white. The input's own value is empty,
   * so nothing is actually illegible; the visible text is in the sibling div at
   * full contrast. It reads as an artefact of antd's overlay-input structure rather
   * than a defect a user would meet. It is still antd's structure, it is still what
   * an audit would report, and it is NOT reachable through theme tokens, because
   * `colorTextQuaternary` is not in antd's alias interface — the same wall the
   * kitchen-sink run hit with `colorTextSecondary` and `colorTextTertiary`. Only
   * `critical` is asserted; the counts go to `test-results` verbatim.
   */
  test("axe on an open dropdown", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await page.locator("#island-hazard").click();
    const dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    await expect(dropdown).toBeVisible();
    // Wait for the open transition to settle. An animating overlay makes axe blend
    // it against what is behind and report contrast failures that vanish on a
    // rerun — a trap the MUI pilot documented for its dialog.
    await expect(dropdown).toHaveCSS("opacity", "1");

    const result = await runAxe(page, {
      section: "island-open-dropdown",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-open-dropdown.json", result);

    // eslint-disable-next-line no-console
    console.log(
      `axe island open dropdown: ${result.counts.violations} violations ` +
        `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
        `${result.counts.incomplete} incomplete ` +
        `(rules: ${result.violations.map((v) => v.id).join(", ") || "none"})`,
    );

    await testInfo.attach("axe-island-open-dropdown.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.counts.critical).toBe(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "island-00-full-page", testInfo);

    // The seam between host prose and the candidate region is what this view
    // exists to show, so it gets its own viewport-sized shot.
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-candidate-region", testInfo, { fullPage: false });

    await chooseOption(page, "island-hazard", "Drought");
    await captureScreens(page, "island-02-filtered", testInfo, { fullPage: false });
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
