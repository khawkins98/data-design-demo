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

import { LABELS, LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { VerificationStatus } from "@undrr-eval/fixtures";
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

/** The view's page size and the fixture's four statuses. */
const PAGE_SIZE = 10;
const STATUSES: readonly VerificationStatus[] = ["verified", "pending", "disputed", "withdrawn"];

/**
 * The record id of every rendered row, in render order.
 *
 * `rowKey="id"` puts it on the `<tr>` as `data-row-key`, so the rendered table can
 * be checked against the fixture without re-deriving anything from the cells.
 */
async function renderedRowIds(page: Page): Promise<readonly string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-candidate-root] tbody tr[data-row-key]")].map(
      (row) => row.getAttribute("data-row-key") ?? "",
    ),
  );
}

/**
 * Every status pill on the current page, paired with the colour it was painted.
 *
 * Both halves feed one assertion: that the pill's colour is a FUNCTION of the
 * record's `verificationStatus`. `toBeVisible()` on the first tag — which is what
 * this column's only assertion used to be — passes on 250 rows all reading
 * "verified" in one colour.
 */
async function statusPills(
  page: Page,
): Promise<ReadonlyArray<{ text: string; background: string }>> {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-candidate-root] tbody tr[data-row-key] .ant-tag")].map(
      (pill) => ({
        text: (pill.textContent ?? "").trim(),
        background: getComputedStyle(pill).backgroundColor,
      }),
    ),
  );
}

/**
 * Whether a Select's own text — its placeholder when unset, its chosen value when
 * set — actually puts INK ON SCREEN in the closed control.
 *
 * The twin of `measureTextInk` in `apps/delta-antd/e2e/app.spec.ts`, kept identical so
 * the two hosts' numbers read side by side. The measurement matters more than usual on
 * this pairing, because both obvious ways of asking give the wrong answer:
 *
 *  - `elementsFromPoint` at the text's position returns antd's overlay input on
 *    EVERY host. antd renders the value inside a div and lays a readonly input over
 *    it by design, so "is it covered" is true on Delta and on Mangrove alike.
 *    Reported below as `textIsCovered` for comparability, and asserted on neither.
 *  - Screenshotting the control, hiding the text node and diffing the bytes reports
 *    a difference on Mangrove where a 4x screenshot shows an EMPTY FIELD: removing
 *    the node also moves the box it draws, by a couple of edge pixels.
 *
 * So this counts ink. Screenshot the control, decode it on a canvas inside the page,
 * count dark pixels inside the text node's own rectangle, recolour that node's text
 * to `transparent`, count again. `inkFromText` is the difference — the pixels that
 * exist BECAUSE of the glyphs, with borders and chrome inside the same rectangle
 * cancelling out. Zero means the reader sees nothing, whatever the DOM says.
 *
 * WHICH NODE, AND WHY IT IS FOUND RATHER THAN ASSUMED. antd puts the placeholder in
 * its own `div.ant-select-placeholder`; a chosen value is a BARE TEXT NODE in
 * `.ant-select-content`. That asymmetry is load-bearing on the Mangrove host:
 * `.ant-select-content` is `display: flex`, so the placeholder is a flex item and its
 * `z-index: 1` APPLIES despite `position: static`, putting it above the overlay
 * input; the value text has no box of its own and no z-index, so it paints under it.
 * Measured consequence — placeholder legible, value blank, same control. `state`,
 * `textNodeZIndex` and `textNodePosition` are recorded so that story stays checkable.
 *
 * The hit test samples `.ant-select-content` rather than the text node itself:
 * antd's placeholder is `pointer-events: none` and so absent from
 * `elementsFromPoint` entirely, which would make `opaqueLayersAboveText` read as
 * "everything" instead of "what is painted over this area".
 */
async function measureTextInk(page: Page, fieldId: string) {
  const control = page
    .locator(`#${fieldId}`)
    .locator("xpath=ancestor::*[contains(concat(' ', @class, ' '), ' ant-select ')][1]");

  /** Dark pixels inside the text node's rectangle, read off a real screenshot. */
  const countInk = async (): Promise<number> => {
    const shot = (await control.screenshot()).toString("base64");
    return page.evaluate(
      async ({ id, shot }) => {
        const input = document.querySelector(`#${id}`) as HTMLElement;
        const select = input.closest(".ant-select") as HTMLElement;
        const node = (select.querySelector(".ant-select-placeholder") ??
          input.closest(".ant-select-content")) as HTMLElement;
        const selectBox = select.getBoundingClientRect();
        const nodeBox = node.getBoundingClientRect();
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = `data:image/png;base64,${shot}`;
        });
        // Element screenshots come back at the device pixel ratio, so derive the
        // scale rather than assuming 1.
        const scale = image.width / selectBox.width;
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) return -1;
        context.drawImage(image, 0, 0);
        const x = Math.max(0, Math.round((nodeBox.left - selectBox.left) * scale));
        const y = Math.max(0, Math.round((nodeBox.top - selectBox.top) * scale));
        const width = Math.min(Math.round(nodeBox.width * scale), image.width - x);
        const height = Math.min(Math.round(nodeBox.height * scale), image.height - y);
        if (width <= 0 || height <= 0) return -1;
        const { data } = context.getImageData(x, y, width, height);
        let dark = 0;
        for (let index = 0; index < data.length; index += 4) {
          const luminance =
            0.299 * (data[index] ?? 0) +
            0.587 * (data[index + 1] ?? 0) +
            0.114 * (data[index + 2] ?? 0);
          // Meaningfully darker than the field's fill. antd's placeholder grey is
          // well under this; antialiasing fringes on a border are not.
          if (luminance < 200) dark += 1;
        }
        return dark;
      },
      { id: fieldId, shot },
    );
  };

  const geometry = await page.evaluate((id) => {
    const input = document.querySelector(`#${id}`) as HTMLElement | null;
    const select = input?.closest(".ant-select") as HTMLElement | null;
    const content = input?.closest(".ant-select-content") as HTMLElement | null;
    if (!input || !select || !content) return null;
    const placeholder = select.querySelector(".ant-select-placeholder") as HTMLElement | null;
    const node = placeholder ?? content;
    const nodeStyle = getComputedStyle(node);
    // See the note above: hit-test the content box, not the text node.
    const box = content.getBoundingClientRect();
    const stack = document.elementsFromPoint(box.left + 4, box.top + box.height / 2);
    const contentIndex = stack.indexOf(content);
    const above = contentIndex < 0 ? stack : stack.slice(0, contentIndex);
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}:${
        getComputedStyle(el).backgroundColor
      }`;
    const isOpaque = (el: Element) => {
      const bg = getComputedStyle(el).backgroundColor;
      const match = /^rgba?\(([^)]+)\)$/.exec(bg);
      if (!match) return bg !== "transparent";
      const parts = match[1]?.split(",") ?? [];
      const alpha = parts.length > 3 ? Number(parts[3]) : 1;
      return alpha > 0;
    };
    return {
      text: (node.textContent ?? "").trim(),
      state: placeholder ? ("placeholder" as const) : ("value" as const),
      textNodeZIndex: nodeStyle.zIndex,
      textNodePosition: nodeStyle.position,
      contentDisplay: getComputedStyle(content).display,
      overlayBackgroundColor: getComputedStyle(input).backgroundColor,
      overlayHeightPx: Math.round(input.getBoundingClientRect().height),
      contentHeightPx: Math.round(box.height),
      topmostAtText: stack[0] ? describe(stack[0]) : "",
      textIsCovered: stack[0] === input,
      opaqueLayersAboveText: above.filter(isOpaque).map(describe),
    };
  }, fieldId);

  if (!geometry) {
    return {
      error: `no ant Select found for #${fieldId}`,
      text: "",
      state: "value" as const,
      textNodeZIndex: "",
      textNodePosition: "",
      contentDisplay: "",
      overlayBackgroundColor: "",
      overlayHeightPx: 0,
      contentHeightPx: 0,
      topmostAtText: "",
      textIsCovered: false,
      opaqueLayersAboveText: [] as string[],
      inkWithText: 0,
      inkWithoutText: 0,
      inkFromText: 0,
    };
  }

  const setTextColour = (colour: string) =>
    page.evaluate(
      ({ id, colour }) => {
        const input = document.querySelector(`#${id}`) as HTMLElement | null;
        const select = input?.closest(".ant-select");
        const node = (select?.querySelector(".ant-select-placeholder") ??
          input?.closest(".ant-select-content")) as HTMLElement | null;
        if (!node) return;
        node.style.color = colour;
        node.style.webkitTextFillColor = colour;
      },
      { id: fieldId, colour },
    );

  const inkWithText = await countInk();
  await setTextColour("transparent");
  const inkWithoutText = await countInk();
  await setTextColour("");

  return {
    error: null as string | null,
    ...geometry,
    inkWithText,
    inkWithoutText,
    inkFromText: inkWithText - inkWithoutText,
  };
}

/** The status of each of these records, taken from the fixture. */
function fixtureStatuses(ids: readonly string[]): readonly string[] {
  return ids.map(
    (id) => LOSS_RECORDS.find((row) => row.id === id)?.verificationStatus ?? "unknown",
  );
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
    await expect(page.locator(`${ROOT} tbody tr[data-row-key] .ant-tag`)).toHaveCount(PAGE_SIZE);

    // The known-issues box is host chrome and must sit OUTSIDE the candidate
    // subtree, where no candidate stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return root?.querySelectorAll("[class*='known-issues']").length ?? -1;
    });
    expect(insideCandidate, "the known-issues box is inside the candidate subtree").toBe(0);

    /*
     * Same for the view switcher, which goes through the frame's `pageHeader` slot
     * rather than `notices` — the box is a caveat about this page, the switcher is
     * the way off it — but is host chrome on identical terms.
     *
     * `[aria-current="page"]` is scoped to the tab row: the breadcrumb marks the
     * current page too, so unscoped it matches two elements and the assertion below
     * would fail on a header that is behaving correctly.
     */
    await expect(page.locator(`${ROOT} .mg-pageheader`)).toHaveCount(0);
    await expect(page.locator(".mg-pageheader")).toHaveCount(1);
    await expect(
      page.locator('nav[aria-label="Demo views"] [aria-current="page"]'),
    ).toHaveText("Inside a real page");
    // This host ships no app.html, so the switcher must not offer that view.
    await expect(page.locator('.mg-pageheader a[href="./app.html"]')).toHaveCount(0);
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

  /**
   * THE FILTERS' RESTING TEXT, and the fix it locks in.
   *
   * All three of these Selects used to carry a first option labelled
   * `labels.actionClearFilters`, with `value` defaulting to that sentinel — so the
   * DOM text of every resting filter was "Clear filters", as was its accessible
   * name. Worse here than on the Delta application screen, because this island had
   * no Clear-filters button at all: the words were the label of three controls that
   * did not perform the action, and the action was unavailable. antd's own
   * `placeholder` plus `allowClear` replaces the sentinel, and the label moved to a
   * real button beside the count.
   *
   * ASSERTED IN BOTH DIRECTIONS: resting text must NAME THE FIELD, and the
   * clear-filters string must appear in none of the three controls and none of
   * their option lists. The option-list half is the one that catches a regression.
   *
   * WHETHER A READER CAN SEE ANY OF IT IS A SEPARATE QUESTION, and this test
   * measures it rather than assuming, because `packages/known-issues` rests on the
   * answer. Mangrove's unlayered `input` rules paint antd's overlay input opaque
   * white across the whole control, so the expectation going in was that the fix
   * would be DOM-only here. IT IS NOT, and the two states diverge:
   *
   *   - the PLACEHOLDER is legible. antd renders it in its own
   *     `.ant-select-placeholder` div, `.ant-select-content` is `display: flex`, so
   *     that div is a flex item and its `z-index: 1` applies even at
   *     `position: static` — it paints ABOVE the opaque input.
   *   - a CHOSEN VALUE is not. It is a bare text node with no box and no z-index, so
   *     it paints under the same input and the filled field reads as empty.
   *
   * Both halves are asserted below. The Delta host's identical probe returns ink for
   * both states — see `apps/delta-antd/e2e/app.spec.ts` — which is the distinction
   * the registry entry turns on: DELTA IS AFFECTED BY THE WRONG-WORD DEFECT AND NOT
   * BY THE VALUE-HIDING ONE.
   */
  test("each filter rests on its field name, not on the clear-filters label", async ({
    page,
  }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const clearLabel = LABELS.en.actionClearFilters;
    const fields = [
      { id: "island-country", fieldName: LABELS.en.fieldCountry },
      { id: "island-hazard", fieldName: LABELS.en.fieldHazard },
      { id: "island-status", fieldName: LABELS.en.colStatus },
    ] as const;

    const resting = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const input = document.querySelector(`#${id}`);
          const select = input?.closest(".ant-select");
          return { id, text: (select?.textContent ?? "").trim() };
        }),
      fields.map((field) => field.id),
    );

    for (const [index, field] of fields.entries()) {
      const seen = resting[index];
      expect(seen?.id).toBe(field.id);
      expect(
        seen?.text,
        `${field.id} rests on "${seen?.text}" instead of its own field name`,
      ).toBe(field.fieldName);
      expect(
        seen?.text,
        `${field.id} is showing the clear-filters label as its resting text again`,
      ).not.toContain(clearLabel);
      await expect(
        page.locator(ROOT).getByRole("combobox", { name: field.fieldName, exact: true }),
      ).toHaveCount(1);
    }

    for (const field of fields) {
      await page.locator(`#${field.id}`).click();
      const dropdown = page
        .locator(".ant-select-dropdown")
        .filter({ has: page.locator(`#${field.id}_list`) });
      await expect(dropdown).toHaveCSS("opacity", "1");
      await expect(
        dropdown.locator(`.ant-select-item-option[title="${clearLabel}"]`),
        `${field.id} has a sentinel option labelled "${clearLabel}" again`,
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(`#${field.id}`)).toHaveAttribute("aria-expanded", "false");
    }

    // The label now lives on a control that performs the action, and only there.
    const clearButton = page.locator(`${ROOT} [data-testid="island-clear-filters"]`);
    await expect(clearButton).toHaveText(clearLabel);
    await expect(clearButton).toBeDisabled();

    const restingInk = await measureTextInk(page, "island-hazard");

    await chooseOption(page, "island-hazard", "Drought");
    await expect(page.locator(ROOT)).toContainText("34 / 250");
    const chosenInk = await measureTextInk(page, "island-hazard");

    // And the button is the way back to unfiltered.
    await expect(clearButton).toBeEnabled();
    await clearButton.click();
    await expect(page.locator(ROOT)).toContainText("250 / 250");
    const afterClear = await page.evaluate(() => {
      const select = document.querySelector("#island-hazard")?.closest(".ant-select");
      return (select?.textContent ?? "").trim();
    });
    expect(afterClear).toBe(LABELS.en.fieldHazard);

    writeJson("test-results/island-filter-resting-text.json", {
      resting,
      clearFiltersLabel: clearLabel,
      restingInk,
      chosenInk,
      note:
        "Resting text is each field's own localised name, via antd's `placeholder` " +
        "plus `allowClear`. THE TWO STATES DO NOT FARE THE SAME ON THIS HOST, which " +
        "is the finding: the PLACEHOLDER reaches the reader (inkFromText > 0) " +
        "because antd renders it in its own flex item with z-index 1, above the " +
        "input Mangrove painted opaque white; a CHOSEN VALUE is a bare text node " +
        "with no box and no z-index, so it paints under that input and the field " +
        "goes blank (inkFromText == 0). Both are > 0 on the Delta host — see " +
        "app-filter-resting-text.json — which is the measured form of the " +
        "known-issues claim that Delta is unaffected by the value-hiding defect. " +
        "textIsCovered is true on BOTH hosts and is not the discriminator.",
    });

    await testInfo.attach("island-filter-resting-text.json", {
      body: JSON.stringify({ resting, restingInk, chosenInk }, null, 2),
      contentType: "application/json",
    });

    /*
     * THE PLACEHOLDER DOES REACH THE READER, and that is worth asserting rather than
     * assuming: it is the difference between this fix helping the Mangrove island and
     * being a DOM-only correction. `.ant-select-content` is `display: flex`, so
     * antd's `.ant-select-placeholder` is a flex item and its `z-index: 1` applies
     * even at `position: static` — it paints above the opaque input.
     */
    expect(restingInk.error).toBeNull();
    expect(restingInk.state).toBe("placeholder");
    expect(restingInk.text).toBe(LABELS.en.fieldHazard);
    expect(restingInk.contentDisplay).toBe("flex");
    expect(restingInk.textNodeZIndex).toBe("1");
    expect(
      restingInk.inkFromText,
      "the placeholder naming the field puts no ink on screen either, so this fix is " +
        "invisible on the Mangrove host and the note above needs rewriting",
    ).toBeGreaterThan(0);

    /*
     * AND THE CHOSEN VALUE STILL DOES NOT, asserted deliberately, in the same spirit
     * as the sibling test "Mangrove's input background hides antd's selected value":
     * the fix above is right in the DOM and in the accessibility tree, and the filled
     * control is still blank on this host. The day Mangrove adopts cascade layers
     * this flips, the test fails, and the evidence gets re-measured rather than
     * quietly going stale.
     */
    expect(chosenInk.error).toBeNull();
    expect(chosenInk.state).toBe("value");
    expect(chosenInk.text).toBe("Drought");
    expect(
      chosenInk.opaqueLayersAboveText.length,
      "nothing opaque is painted over the value any more; re-measure this pairing's " +
        "blocker and the known-issues entry",
    ).toBeGreaterThan(0);
    expect(
      chosenInk.inkFromText,
      "the chosen value now puts ink on screen, so Mangrove no longer hides it; " +
        "re-measure the blocker and correct the known-issues entry",
    ).toBe(0);
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

  /**
   * SORTING, which this view did not have.
   *
   * The island was the only one of the ten views whose table could not be sorted:
   * it carried no `sorter` on any column while its Delta twin carried four and
   * every other island sorted. That was an omission of this view's, not a limit of
   * antd's — `sorter` is a comparator and a prop, and antd supplies the header
   * affordance, the tri-state cycle, `aria-sort` and the reordering. Asserted here
   * so the gap cannot reopen quietly.
   */
  test("sorts from a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Every column, not a subset: the island's feature surface is meant to be
    // comparable with the other nine views'.
    await expect(page.locator(`${ROOT} thead th.ant-table-column-has-sorters`)).toHaveCount(7);

    const firstCell = page.locator(`${ROOT} tbody tr[data-row-key] td`).first();
    const countryHeader = page.locator(`${ROOT} thead th`).filter({ hasText: "Country" });

    // The default is eventDate descending, declared with `defaultSortOrder`.
    await expect(page.locator(`${ROOT} thead th[aria-sort="descending"]`)).toHaveCount(1);
    const defaultIds = await renderedRowIds(page);

    await countryHeader.click();
    await expect(page.locator(`${ROOT} thead th[aria-sort="ascending"]`)).toHaveCount(1);
    await expect(firstCell).toHaveText("Bangladesh");
    const ascendingIds = await renderedRowIds(page);
    expect(ascendingIds, "clicking the header did not reorder the table").not.toEqual(defaultIds);

    // Ascending across the whole visible page, not only its first cell.
    const ascendingCountries = await page.evaluate(() =>
      [...document.querySelectorAll("[data-candidate-root] tbody tr[data-row-key]")].map((row) =>
        (row.querySelector("td")?.textContent ?? "").trim(),
      ),
    );
    expect([...ascendingCountries].sort(new Intl.Collator("en-GB").compare)).toEqual(
      ascendingCountries,
    );

    await countryHeader.click();
    await expect(page.locator(`${ROOT} thead th[aria-sort="descending"]`)).toHaveCount(1);
    await expect(firstCell).not.toHaveText("Bangladesh");

    writeJson("test-results/island-sort.json", { defaultIds, ascendingIds, ascendingCountries });
  });

  /**
   * A descending sort is the true inverse of ascending, tie groups included.
   *
   * `hazardType` has eight values over 250 rows, so a descending sort on it fills
   * the first page with rows that all compare equal. antd sorts a copy with
   * `Array#sort`, which is stable, so those rows must stay in the fixture's own
   * order. The wrong prediction — the tail of the group, backwards, which is what a
   * `.reverse()`-based descending sort produces — is computed here too and named,
   * so a regression cannot read as a new expectation.
   */
  test("a descending sort preserves the source order inside tie groups", async ({ page }) => {
    const collator = new Intl.Collator("en-GB");
    const hazards = [...new Set(LOSS_RECORDS.map((row) => row.hazardType))].sort(
      collator.compare,
    );
    const highest = hazards.at(-1) as string;
    const group = LOSS_RECORDS.filter((row) => row.hazardType === highest);
    const correct = group.slice(0, PAGE_SIZE).map((row) => row.id);
    const reversedArray = [...group].reverse().slice(0, PAGE_SIZE).map((row) => row.id);

    await page.goto(`${URL}?candidate=on`);
    const hazardHeader = page.locator(`${ROOT} thead th`).filter({ hasText: "Hazard type" });
    await hazardHeader.click();
    await expect(page.locator(`${ROOT} thead th[aria-sort="ascending"]`)).toHaveCount(1);
    await hazardHeader.click();
    await expect(page.locator(`${ROOT} thead th[aria-sort="descending"]`)).toHaveCount(1);

    const rendered = await renderedRowIds(page);

    writeJson("test-results/island-sort-tie-groups.json", {
      hazard: highest,
      groupSize: group.length,
      rendered,
      correct,
      reversedArray,
    });

    expect(group.length).toBeGreaterThan(PAGE_SIZE);
    expect(correct, "the fixture's tie group is palindromic; this test cannot tell").not.toEqual(
      reversedArray,
    );
    expect(rendered).toEqual(correct);
    expect(rendered, "the descending sort behaves like a reversed array").not.toEqual(
      reversedArray,
    );
  });

  test("returns to page one when the sort changes", async ({ page }) => {
    // antd does NOT reset the page for you, so this is the one piece of paging
    // logic the view owns.
    await page.goto(`${URL}?candidate=on`);

    await page.locator(`${ROOT} .ant-pagination-next`).click();
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("11-20 of 250");

    await page.locator(`${ROOT} thead th`).filter({ hasText: "Country" }).click();
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("1-10 of 250");
  });

  /**
   * ORDERING IS THE SELECTED LOCALE'S, not the runner's.
   *
   * The string `sorter`s pass `bcp47` to `localeCompare`. Playwright pins the
   * browser locale to `en-GB`, so this runs the GERMAN pass: the rendered order has
   * to match a `de-DE` collator rather than the runtime default.
   */
  test("orders by the selected locale's collation in German", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    await page.locator(`${ROOT} thead th`).filter({ hasText: "Land" }).click();
    await expect(page.locator(`${ROOT} thead th[aria-sort="ascending"]`)).toHaveCount(1);

    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll("[data-candidate-root] tbody tr[data-row-key]")].map((row) =>
        (row.querySelector("td")?.textContent ?? "").trim(),
      ),
    );
    const expectedFirstPage = LOSS_RECORDS.map((row) => row.country)
      .sort(new Intl.Collator("de-DE").compare)
      .slice(0, PAGE_SIZE);

    writeJson("test-results/island-sort-locale.json", { locale: "de", rendered });

    expect([...rendered].sort(new Intl.Collator("de-DE").compare)).toEqual(rendered);
    expect(rendered).toEqual(expectedFirstPage);
  });

  /**
   * STATUS PILLS, asserted as a mapping rather than as a presence.
   *
   * The pill text is checked against the fixture by the row's own `data-row-key`,
   * and the pill colour is checked to be a function of that text. The old
   * assertion, `.first()).toBeVisible()`, was satisfied by any one visible tag.
   */
  test("status pills read the record's status and their colour tracks it", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const ids = await renderedRowIds(page);
    const pills = await statusPills(page);

    const byStatus = new Map<string, Set<string>>();
    for (const pill of pills) {
      const seen = byStatus.get(pill.text) ?? new Set<string>();
      seen.add(pill.background);
      byStatus.set(pill.text, seen);
    }

    writeJson("test-results/island-status-pills.json", {
      ids,
      pills,
      colours: [...byStatus].map(([status, colours]) => ({ status, colours: [...colours] })),
    });

    expect(ids).toHaveLength(PAGE_SIZE);
    expect(pills).toHaveLength(PAGE_SIZE);
    expect(pills.map((pill) => pill.text)).toEqual(fixtureStatuses(ids));
    for (const status of pills.map((pill) => pill.text)) {
      expect(STATUSES).toContain(status as VerificationStatus);
    }

    // The colour is a FUNCTION of the status: one colour each, no two statuses
    // sharing one. Vacuous unless more than one status is on the page.
    expect(byStatus.size, "only one status on the page; the mapping is untested").toBeGreaterThan(
      1,
    );
    for (const [status, colours] of byStatus) {
      expect([...colours], `"${status}" was painted more than one colour`).toHaveLength(1);
    }
    const distinctColours = new Set([...byStatus.values()].map((set) => [...set][0]));
    expect(distinctColours.size, "two statuses share a pill colour").toBe(byStatus.size);
    for (const pill of pills) {
      expect(pill.background).not.toBe("rgba(0, 0, 0, 0)");
    }
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
