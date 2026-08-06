/**
 * Evidence run for the delta-antd FULL APPLICATION view (`app.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/delta-antd/e2e/demo.spec.ts`, so the three views of this pairing are
 * directly comparable.
 *
 * READ THE LEAKAGE RESULT FROM THIS VIEW WITH CARE, and the frame says so itself:
 * when the candidate owns the viewport there is almost no host markup left to leak
 * onto, so a clean result here means less than the same result from the kitchen
 * sink — the target shrank rather than the candidate improving. The frame keeps a
 * host strip below the application region precisely so the assertion still has all
 * 14 canaries to compare, and this spec asserts that count rather than trusting it.
 *
 * The frame's own chrome carries a SEPARATE contract (`data-frame-canary`,
 * `DELTA_FRAME_CANARY_IDS`), including `frame-mangrove-in-delta` — a genuine
 * `mg-button` inside a Tailwind page. That one matters more for antd than for any
 * other candidate: `StyleProvider layer` is what makes antd lose to unlayered CSS,
 * and this button is the only unlayered adversary on the Delta host, because
 * Tailwind 4 compiles Preflight into `@layer base`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { LABELS, LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LocaleCode, VerificationStatus } from "@undrr-eval/fixtures";
import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import { DELTA_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The application entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/app.html";

/**
 * Every table locator is scoped to the candidate region, because the frame's host
 * strip below it contains a canary TABLE of its own. An unscoped `tbody tr` counts
 * the host's canary rows as well as the candidate's ten, which would quietly count
 * host rows as candidate rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * antd's Segmented renders a visually-hidden radio inside a label, so clicking the
 * radio itself times out — it is covered by the label's own div. Same helper as
 * `demo.spec.ts`.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(`.ant-segmented-item-label[title="${label}"]`).click();
}

/** Opens one of the filter selects and picks an option from its portalled list. */
async function chooseOption(page: Page, fieldId: string, optionTitle: string): Promise<void> {
  await page.locator(`#${fieldId}`).click();
  /*
   * Scoped by the field's OWN listbox id: antd keeps a previous field's dropdown in
   * the DOM through its leave transition, so a class-only selector can match two
   * overlays at once and fail strict mode.
   */
  const dropdown = page
    .locator(".ant-select-dropdown")
    .filter({ has: page.locator(`#${fieldId}_list`) });
  // Wait for the open transition to settle before clicking an option, so the click
  // cannot land on the mid-animation position of a virtualised list.
  await expect(dropdown).toHaveCSS("opacity", "1");
  await dropdown.locator(`.ant-select-item-option[title="${optionTitle}"]`).click();
  await expect(page.locator(`#${fieldId}`)).toHaveAttribute("aria-expanded", "false");
}

/**
 * Whether a Select's own text — its placeholder when unset, its chosen value when
 * set — actually puts INK ON SCREEN in the closed control.
 *
 * The measurement matters more than usual on this pairing, because both obvious ways
 * of asking give the wrong answer:
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

/**
 * The first row's delete action.
 *
 * Its accessible name is built from the fixture labels, so it is localised: the
 * Arabic pass cannot look for "Delete". The label set is read from the fixtures
 * rather than hard-coded, so a fixture change moves the test with it.
 */
function deleteButton(page: Page, locale: LocaleCode = "en") {
  const verb = LABELS[locale].actionDelete;
  return page
    .locator(ROOT)
    .getByRole("button", { name: new RegExp(`^${verb} DRR-\\d{4}$`) })
    .first();
}

/** The filter card's own toggle. antd's Collapse header is the button. */
function filterToggle(page: Page) {
  return page.locator(`${ROOT} .ant-collapse-header`);
}

/** The view's page size and the fixture's four statuses. */
const PAGE_SIZE = 10;
const STATUSES: readonly VerificationStatus[] = ["verified", "pending", "disputed", "withdrawn"];

/**
 * The record id of every rendered row, in render order. `rowKey="id"` puts it on
 * the `<tr>` as `data-row-key`, so the table can be checked against the fixture
 * without re-deriving anything from the cells.
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

test.describe("full application", () => {
  test("renders the whole records screen inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(ROOT)).toHaveCount(1);
    // Everything the view owes the brief: header, filter card, table, pagination,
    // status pills and row actions.
    await expect(page.locator(`${ROOT} #records-filters`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-collapse`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-table`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-pagination`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} tbody tr[data-row-key] .ant-tag`)).toHaveCount(PAGE_SIZE);
    await expect(deleteButton(page)).toBeVisible();

    // The known-issues box is host chrome and must sit OUTSIDE the candidate
    // subtree, where no candidate stylesheet can restyle it.
    const insideCandidate = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      return root?.querySelectorAll("[class*='known-issues']").length ?? -1;
    });
    expect(insideCandidate, "the known-issues box is inside the candidate subtree").toBe(0);

    /*
     * Same for the view switcher, which goes through the same `notices` slot. The
     * Delta host's switcher is styled with Tailwind utilities rather than a
     * `mg-viewswitcher` class — unlike the Mangrove one — so it is located by its
     * accessible name, which is the part that is contractual.
     */
    const switcher = 'nav[aria-label="Demo views"]';
    await expect(page.locator(`${ROOT} ${switcher}`)).toHaveCount(0);
    await expect(page.locator(switcher)).toHaveCount(1);
    await expect(page.locator(`${switcher} [aria-current="page"]`)).toHaveText(
      "A whole DELTA screen",
    );
    // This host ships no island.html, so the switcher must not offer that view.
    await expect(page.locator(`${switcher} a[href="./island.html"]`)).toHaveCount(0);
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

    // The Mangrove button in a Tailwind page must still be a Mangrove button. It is
    // the only UNLAYERED adversary on this host, so it is also the only place where
    // `StyleProvider layer` could bite in the direction that damages the host.
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
      `host canaries changed after mounting antd in the application frame:\n${JSON.stringify(
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

  /**
   * The `aria-hidden-focus` trap, and the proof that avoiding it worked.
   *
   * `rc-table` renders an `aria-hidden` measure row whenever `scroll.x` is set, and
   * `rowSelection` puts a focusable checkbox inside it. This screen keeps `scroll.x`
   * — eight columns overflow 390px otherwise — and has no `rowSelection`, so it has
   * row actions but no bulk actions. Asserted both ways: the measure row must EXIST,
   * or the trap is not being exercised, and it must contain nothing focusable.
   */
  test("the aria-hidden measure row contains nothing focusable", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      if (!root) {
        return {
          error: "no candidate root",
          measureRows: -1,
          offenders: [] as Array<{ tag: string; className: string; focusable: number }>,
          rowSelectionCheckboxes: -1,
        };
      }
      const FOCUSABLE =
        "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
      const offenders = [...root.querySelectorAll('[aria-hidden="true"]')]
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === "string" ? el.className : "",
          focusable: el.querySelectorAll(FOCUSABLE).length,
        }))
        .filter((entry) => entry.focusable > 0);

      return {
        error: null as string | null,
        measureRows: root.querySelectorAll('tr[aria-hidden="true"]').length,
        offenders,
        rowSelectionCheckboxes: root.querySelectorAll("table input[type='checkbox']").length,
      };
    });

    writeJson("test-results/app-aria-hidden-measure-row.json", {
      ...state,
      note:
        "The row-action icon buttons are in normal DOM order, not in the measure " +
        "row, so they are unaffected. What is missing is rowSelection: no select-all, " +
        "no bulk actions on a records screen that would want them.",
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

  test("collapses and expands the filter card", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const toggle = filterToggle(page);
    const panel = page.locator(`${ROOT} #records-filters`);

    await expect(panel).toBeVisible();
    // antd's Collapse wires `aria-expanded` itself. In the MUI pilot the toggle,
    // its `aria-expanded` and its `aria-controls` are all application code.
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.click();
    // antd keeps the panel in the DOM and hides it, rather than unmounting it the
    // way MUI's `Collapse unmountOnExit` does — so `aria-controls` always points at
    // an element that exists, and the assertion is on visibility, not on count.
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("filters the table and reports the count in the page header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(ROOT)).toContainText("250 / 250");

    await chooseOption(page, "app-status", "disputed");

    await expect(page.locator(ROOT)).toContainText("53 / 250");
    await expect(page.locator(`${ROOT} .ant-pagination-total-text`)).toContainText("1-10 of 53");

    // Clearing is a single control inside the collapse header, and must restore the
    // full set without collapsing the panel as a side effect.
    await page.locator(`${ROOT} .ant-collapse-extra button`).click();
    await expect(page.locator(ROOT)).toContainText("250 / 250");
    await expect(filterToggle(page)).toHaveAttribute("aria-expanded", "true");
  });

  /**
   * THE FILTERS' RESTING TEXT, and the fix it locks in.
   *
   * Every one of these three Selects used to carry a first option labelled
   * `labels.actionClearFilters`, and `value` defaulted to that sentinel. So all
   * three controls sat at rest reading "Clear filters" — as visible text and as
   * their accessible name — a few pixels below a real Clear-filters button in the
   * Collapse header saying the identical thing. Three controls named after an
   * action they do not perform, and no control named after the field it filters.
   *
   * The fix is antd's own: `placeholder` plus `allowClear`, with
   * `value={x === ALL ? undefined : x}` so the empty state is actually empty.
   *
   * ASSERTED IN BOTH DIRECTIONS, because either half alone is weak. That the
   * resting text NAMES THE FIELD is what makes the control readable; that the
   * clear-filters string appears NOWHERE in the three controls or their option
   * lists is what stops the old shape coming back. The option-list half is the one
   * that catches a regression: a sentinel could be re-added with a nicer label and
   * the first assertion would still pass.
   *
   * AND THE VALUE-VISIBILITY MEASUREMENT, which belongs beside it. The Mangrove
   * island's headline blocker is that Mangrove's unlayered `input` rules paint
   * antd's overlay input opaque white over the selected value — see
   * `apps/mangrove-antd/e2e/island.spec.ts`. `packages/known-issues` claims the
   * Delta host is unaffected because Tailwind compiles Preflight into `@layer base`
   * and antd's later layer wins. That claim is measured here rather than assumed,
   * with the same probe the island uses, so the two hosts' numbers are comparable
   * and the registry entry has something behind it on both sides.
   */
  test("each filter rests on its field name and shows the value it holds", async ({
    page,
  }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const clearLabel = LABELS.en.actionClearFilters;
    const fields = [
      { id: "app-country", fieldName: LABELS.en.fieldCountry },
      { id: "app-hazard", fieldName: LABELS.en.fieldHazard },
      { id: "app-status", fieldName: LABELS.en.colStatus },
    ] as const;

    // ---- resting text ------------------------------------------------------
    const resting = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const input = document.querySelector(`#${id}`);
          const select = input?.closest(".ant-select");
          return {
            id,
            // The whole control's text, so this holds whether antd renders the
            // placeholder inside `.ant-select-content` or in a sibling node.
            text: (select?.textContent ?? "").trim(),
          };
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
      // The specific string that used to be here, and must never be again.
      expect(
        seen?.text,
        `${field.id} is showing the clear-filters label as its resting text again`,
      ).not.toContain(clearLabel);
      /*
       * The ACCESSIBLE name as well as the visible text. It comes from the
       * `Form.Item` label rather than the placeholder, and it used to be "Clear
       * filters" too — with the sentinel selected, antd folded the selected
       * option's label into the combobox's name.
       */
      await expect(
        page.locator(ROOT).getByRole("combobox", { name: field.fieldName, exact: true }),
      ).toHaveCount(1);
    }

    // ---- and not hiding in the option lists either --------------------------
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

    // ---- the placeholder, and then the value, must reach the reader ---------
    /*
     * IN PIXELS, not in the DOM. The words being right is necessary and not
     * sufficient: `#island-hazard` on the Mangrove host holds the correct value in
     * the correct node and renders an empty field, which is that pairing's blocker.
     * `measureTextInk` is the same probe both specs use, so the two hosts' numbers
     * are directly comparable.
     */
    const restingInk = await measureTextInk(page, "app-hazard");

    await chooseOption(page, "app-hazard", "Drought");
    // The filter really applied, so everything below is about VISIBILITY.
    await expect(page.locator(ROOT)).toContainText("34 / 250");
    const chosenInk = await measureTextInk(page, "app-hazard");

    writeJson("test-results/app-filter-resting-text.json", {
      resting,
      clearFiltersLabel: clearLabel,
      restingInk,
      chosenInk,
      note:
        "Resting text is each field's own localised name, via antd's `placeholder` " +
        "plus `allowClear`, not a sentinel option labelled 'Clear filters'. The ink " +
        "blocks are the Delta-side counterpart of island-filter-resting-text.json — " +
        "same probe — so the known-issues claim that the Delta host is unaffected by " +
        "the value-hiding defect can be read off a measurement rather than a cascade " +
        "argument. NOTE textIsCovered: true on BOTH hosts, because antd's overlay " +
        "input is the hit-test target by design. It is not the discriminator; " +
        "inkFromText is.",
    });

    await testInfo.attach("app-filter-resting-text.json", {
      body: JSON.stringify({ resting, restingInk, chosenInk }, null, 2),
      contentType: "application/json",
    });

    expect(restingInk.error).toBeNull();
    expect(restingInk.state).toBe("placeholder");
    expect(restingInk.text).toBe(LABELS.en.fieldHazard);
    expect(
      restingInk.inkFromText,
      "the placeholder naming the field puts no ink on screen, so the control is " +
        "blank to a reader however correct the DOM is",
    ).toBeGreaterThan(0);

    expect(chosenInk.error).toBeNull();
    expect(chosenInk.state).toBe("value");
    expect(chosenInk.text).toBe("Drought");
    /*
     * THE REGISTRY CLAIM, ASSERTED, AND ON THE RIGHT SIGNAL.
     *
     * `textIsCovered` is TRUE here as well, and that is not the defect: antd puts a
     * transparent input over the value on every host, so the hit test reads the same
     * on Delta and on Mangrove. What differs is whether that input PAINTS. So the
     * assertions are the overlay's background alpha, the absence of any opaque layer
     * above the value, and the ink the value itself contributes.
     *
     * If these flip, the Delta host has acquired the island's blocker and
     * `packages/known-issues` needs correcting.
     */
    expect(
      chosenInk.overlayBackgroundColor,
      "antd's select overlay input has become opaque on the Delta host; the " +
        "known-issues claim that Delta is unaffected by the value-hiding defect is " +
        "no longer true",
    ).toBe("rgba(0, 0, 0, 0)");
    expect(
      chosenInk.opaqueLayersAboveText,
      "something opaque is now painted over the selected value on Delta",
    ).toEqual([]);
    expect(
      chosenInk.inkFromText,
      "the chosen value puts no ink on screen: the closed control is blank and the " +
        "Delta host now has the island's value-hiding blocker",
    ).toBeGreaterThan(0);
  });

  test("sorts by a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstCell = page.locator(`${ROOT} tbody tr[data-row-key] td`).first();

    // The comparator is antd's, driven by the column's `sorter`. The MUI pilot
    // wrote its own by hand — the difference `Table` versus `Table + comparator`
    // makes on a real screen.
    const countryHeader = page.locator(`${ROOT} thead th`).filter({ hasText: "Country" });
    await countryHeader.click();
    await expect(firstCell).toHaveText("Bangladesh");

    await countryHeader.click();
    await expect(firstCell).not.toHaveText("Bangladesh");
  });

  /**
   * STATUS PILLS, asserted as a mapping rather than as a presence.
   *
   * The pill text is checked against the fixture by the row's own `data-row-key`,
   * and the pill colour is checked to be a function of that text. The old
   * assertion, `.first()).toBeVisible()`, was the only assertion about this column
   * and was satisfied by any one visible tag — 250 rows all reading "verified" in
   * one colour would have passed it.
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

    writeJson("test-results/app-status-pills.json", {
      ids,
      pills,
      colours: [...byStatus].map(([status, colours]) => ({ status, colours: [...colours] })),
    });

    expect(ids).toHaveLength(PAGE_SIZE);
    expect(pills).toHaveLength(PAGE_SIZE);
    expect(pills.map((pill) => pill.text)).toEqual(
      ids.map((id) => LOSS_RECORDS.find((row) => row.id === id)?.verificationStatus ?? "unknown"),
    );
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

  test("paginates, and returns to page one when sorting changes", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const total = page.locator(`${ROOT} .ant-pagination-total-text`);
    await expect(total).toContainText("1-10 of 250");
    await expect(page.locator(`${ROOT} tbody tr[data-row-key]`)).toHaveCount(10);

    await page.locator(`${ROOT} .ant-pagination-next`).click();
    await expect(total).toContainText("11-20 of 250");

    // A sort change while on page 2 must not strand the reader mid-list. antd does
    // NOT do this for you, so it is the one piece of paging logic this view owns.
    await page.locator(`${ROOT} thead th`).filter({ hasText: "Country" }).click();
    await expect(total).toContainText("1-10 of 250");
  });

  test("confirms a delete through the modal flow", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await deleteButton(page).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog names the record it is about to remove, which is the whole point
    // of a confirmation step.
    await expect(dialog).toContainText(/DRR-\d{4}/);

    // Cancelling must change nothing.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator(ROOT)).toContainText("250 / 250");

    // Confirming removes exactly one record.
    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator(ROOT)).toContainText("249 / 250");
  });

  test("closes the delete dialog on Escape and restores focus", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const trigger = deleteButton(page);
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    // antd's Modal handles this; recorded because a records screen full of row
    // actions is where losing focus hurts most.
    await expect(trigger).toBeFocused();
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // The frame root carries `dir`, so host chrome flips with the candidate.
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
    await expect(page.locator(`${ROOT} .ant-table-rtl`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-pagination-rtl`)).toHaveCount(1);
    await expect(page.locator(`${ROOT} .ant-collapse-rtl`)).toHaveCount(1);
  });

  /**
   * RTL in the row-action column, measured rather than described.
   *
   * antd's column `align` takes `"start" | "center" | "end"` — LOGICAL values — so
   * the column follows the reading direction with no RTL code in the view. Asserted
   * because "antd's RTL is native at zero custom lines" is a claim about behaviour,
   * and a row-action column pinned to a physical side is the layout that would
   * expose it. Both the computed keyword and the geometry are checked.
   */
  test("RTL flips the row-action column with the row", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator(`${ROOT} .ant-table-rtl`)).toHaveCount(1);

    const measurement = await page.evaluate(() => {
      const row = document.querySelector(
        "[data-candidate-root] tbody tr[data-row-key]",
      ) as HTMLElement | null;
      if (!row) {
        return {
          error: "no data row",
          actionCellTextAlign: "",
          actionCellIsLeftOfFirstCell: false,
          firstCellTextAlign: "",
          buttonsInLeftHalfOfCell: false,
        };
      }
      const cells = [...row.querySelectorAll("td")];
      const first = cells.at(0);
      const actions = cells.at(-1);
      if (!first || !actions) {
        return {
          error: "row has no cells",
          actionCellTextAlign: "",
          actionCellIsLeftOfFirstCell: false,
          firstCellTextAlign: "",
          buttonsInLeftHalfOfCell: false,
        };
      }
      const cellBox = actions.getBoundingClientRect();
      const buttons = [...actions.querySelectorAll("button")].map((b) =>
        b.getBoundingClientRect(),
      );
      const buttonsCentre =
        buttons.length > 0
          ? buttons.reduce((sum, b) => sum + b.left + b.width / 2, 0) / buttons.length
          : Number.NaN;

      return {
        error: null as string | null,
        /*
         * Chromium reports antd's alignment back as the LOGICAL keyword `end`
         * rather than a resolved `left` or `right`, which is itself the evidence
         * that the value stayed logical all the way to the computed style.
         */
        actionCellTextAlign: getComputedStyle(actions).textAlign,
        actionCellIsLeftOfFirstCell: cellBox.left < first.getBoundingClientRect().left,
        firstCellTextAlign: getComputedStyle(first).textAlign,
        // Geometry, not keywords: in RTL the logical end is the physical left, so
        // the icon buttons must sit in the left half of their own cell.
        buttonsInLeftHalfOfCell: buttonsCentre < cellBox.left + cellBox.width / 2,
      };
    });

    writeJson("test-results/app-rtl-row-actions.json", {
      ...measurement,
      note:
        "antd column `align` is logical (start/center/end), so the row-action column " +
        "follows the reading direction. Zero custom RTL lines in this view: the " +
        "column definitions carry `align: \"end\"` and nothing else.",
    });

    expect(measurement.error).toBeNull();
    expect(measurement.actionCellIsLeftOfFirstCell, "the table row did not flip").toBe(true);
    // The keyword stays LOGICAL: a resolved `right` here would mean antd's `align`
    // had been compiled down to a physical side somewhere along the way.
    expect(
      measurement.actionCellTextAlign,
      "antd's column align resolved to a physical value; it is no longer logical",
    ).toBe("end");
    expect(
      measurement.buttonsInLeftHalfOfCell,
      "the row-action buttons did not follow the direction to the logical end",
    ).toBe(true);
  });

  /**
   * The portal case the pilot flagged, and the one place this view accepts it.
   *
   * `getPopupContainer` keeps dropdowns inside the candidate root. `Modal` does not
   * take that prop — it takes `getContainer` — and it is left at the default, so the
   * dialog renders at document.body, OUTSIDE the frame's `dir` wrapper. That is
   * exactly the arrangement in which the pilot found overlays lose CSS `direction`.
   * antd repairs it itself from `ConfigProvider direction`, and the computed value is
   * what is asserted, because the `-rtl` class alone would not prove it applied.
   */
  test("the portalled modal keeps its direction in RTL", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await deleteButton(page, "ar").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const measurement = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
      if (!dialog) {
        return {
          error: "no dialog",
          direction: "",
          insideCandidateRoot: false,
          insideDirWrapper: false,
          hasRtlWrap: false,
          tokensResolve: "",
          tokenScopeAncestor: false,
        };
      }
      return {
        error: null as string | null,
        direction: getComputedStyle(dialog).direction,
        insideCandidateRoot: Boolean(dialog.closest("[data-candidate-root]")),
        insideDirWrapper: Boolean(dialog.closest('[dir="rtl"]')),
        hasRtlWrap: Boolean(document.querySelector(".ant-modal-wrap-rtl")),
        // The tokens are scoped to `.undrr-tokens`, not `:root`, so an overlay at
        // document.body loses them unless the class travels with it.
        tokensResolve: getComputedStyle(dialog)
          .getPropertyValue("--undrr-color-text-primary")
          .trim(),
        tokenScopeAncestor: Boolean(dialog.closest(".undrr-tokens")),
      };
    });

    writeJson("test-results/app-rtl-portal-modal.json", {
      ...measurement,
      note:
        "The Modal is deliberately NOT retargeted into `.demo`: it would be clipped " +
        "by the table's own overflow scroll container. So it is a genuine " +
        "document.body portal outside the frame's dir wrapper, and antd still gets " +
        "direction right from ConfigProvider. The token scope class is passed on the " +
        "Modal's own className to keep var(--undrr-*) resolving.",
    });

    expect(measurement.error).toBeNull();
    // The premise: this really is outside the candidate root.
    expect(measurement.insideCandidateRoot).toBe(false);
    expect(measurement.direction, "the portalled modal lost its direction").toBe("rtl");
    expect(measurement.hasRtlWrap).toBe(true);
    expect(
      measurement.tokensResolve,
      "the UNDRR tokens do not resolve inside the portalled modal",
    ).not.toBe("");
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
        `${scoped.counts.incomplete} incomplete ` +
        `(rules: ${scoped.violations.map((v) => v.id).join(", ") || "none"}) | ` +
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
    // Named explicitly, because this is the antd defect the view was shaped to
    // avoid: if it reappears, `rowSelection` or `scroll.x` changed.
    expect(
      scoped.violations.map((v) => v.id),
      "aria-hidden-focus is back in the candidate region",
    ).not.toContain("aria-hidden-focus");
  });

  test("axe on the open delete dialog", async ({ page }, testInfo) => {
    // The dialog is portalled to document.body, i.e. OUTSIDE the candidate root, so
    // the scoped run above cannot see it. Modal flows are exactly where ARIA goes
    // wrong, so it gets its own run.
    await page.goto(`${URL}?candidate=on`);
    await deleteButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // WAIT FOR THE TRANSITION TO FINISH, and do not remove this. An animating
    // overlay makes axe blend it against the backdrop behind it and report a
    // serious `color-contrast` failure that disappears on a rerun with a wait. The
    // MUI pilot documented the same trap for its Dialog; antd's Modal animates the
    // same way.
    await expect(dialog).toHaveCSS("opacity", "1");
    await expect(page.locator(".ant-modal-mask")).toHaveCSS("opacity", "1");

    const result = await runAxe(page, {
      section: "app-delete-dialog",
      include: '[role="dialog"]',
    });
    writeJson("test-results/axe-app-delete-dialog.json", result);

    // eslint-disable-next-line no-console
    console.log(
      `axe app delete dialog: ${result.counts.violations} violations ` +
        `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
        `${result.counts.incomplete} incomplete ` +
        `(rules: ${result.violations.map((v) => v.id).join(", ") || "none"})`,
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

    await filterToggle(page).click();
    await expect(page.locator(`${ROOT} #records-filters`)).toBeHidden();
    await captureScreens(page, "app-02-filters-collapsed", testInfo, { fullPage: false });

    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await captureScreens(page, "app-03-delete-dialog", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    await captureScreens(page, "app-00-full-page", testInfo, { rtl: true });
    await page.locator(ROOT).scrollIntoViewIfNeeded();
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
