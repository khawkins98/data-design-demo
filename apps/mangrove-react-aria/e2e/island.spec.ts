/**
 * Evidence run for the embedded-island view (`island.html`).
 *
 * Same harness, same helpers and same three viewport projects as
 * `demo.spec.ts` — the kitchen sink and the island must be measured the same way
 * or their numbers cannot be compared.
 *
 * WHY THIS VIEW IS THE ONE TO READ FOR LEAKAGE. The kitchen sink hands React Aria
 * the whole content column, so the only host markup near it is the canary block
 * itself. Here the candidate is one region inside a reproduction of the real
 * published UNDRR page frame, with Mangrove's own masthead, `role="menubar"`
 * navigation and prose on both sides. The leakage assertion therefore runs against
 * real neighbouring content rather than a block that happens to sit above.
 *
 * Like `demo.spec.ts` this does NOT assert zero axe violations: Brief 1 forbids
 * claiming conformance, so the counts are the output, not the pass criterion.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";
import {
  MANGROVE_FRAME_CANARY_IDS,
  frameCanarySelector,
} from "@undrr-eval/test-harness/frame-canaries";

/** The island entry. Relative, so Playwright's baseURL applies. */
const URL = "/island.html";

/**
 * Clicks a locale in the switcher.
 *
 * React Aria's `Radio` renders a <label> wrapping a visually hidden <input>, and
 * the label intercepts pointer events, so `getByRole("radio").click()` times out.
 * Targeting the label is the working route. Same trap the kitchen-sink spec
 * documents; recorded once in EVIDENCE.md, met again here.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(".demo-locale__option", { hasText: label }).click();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("embedded island", () => {
  test("renders the candidate region inside the host frame", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator('[data-view="island"]')).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] table")).toHaveCount(1);
    await expect(page.locator(".demo-filters")).toHaveCount(1);
    await expect(page.locator(".demo-pagination")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] tbody tr")).toHaveCount(10);
  });

  test("renders all 14 host canaries and the island frame's 4 chrome canaries", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    // The host contract. If the frame renders fewer than the kitchen sink does,
    // the leakage assertion silently covers less than it appears to.
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);

    // The frame contract, a separate list on purpose: a Mangrove page header is
    // not a Delta application toolbar, so the two frames cannot share one.
    expect(MANGROVE_FRAME_CANARY_IDS.length).toBe(4);
    for (const id of MANGROVE_FRAME_CANARY_IDS) {
      await expect(page.locator(frameCanarySelector(id)), id).toHaveCount(1);
    }
  });

  test("known-issues box is host chrome in both candidate states", async ({ page }) => {
    // It reaches the page through the frame's `notices` prop, so it must render
    // OUTSIDE the candidate root in both states: outside, so no candidate
    // stylesheet can restyle it, and in both states, so it is in the leakage
    // baseline too and cannot itself register as a difference.
    for (const state of ["on", "off"] as const) {
      await page.goto(`${URL}?candidate=${state}`);
      await expect(page.locator(".undrr-known-issues"), state).toHaveCount(1);
      await expect(
        page.locator("[data-candidate-root] .undrr-known-issues"),
        `${state}: box must not be inside the candidate subtree`,
      ).toHaveCount(0);
    }
  });

  test("view switcher is host chrome, and the candidate cannot restyle it", async ({
    page,
  }) => {
    // Reaches the page through the frame's `notices` slot, so it must sit outside
    // the candidate root in both states — same contract as the known-issues box.
    const readStrip = async () =>
      page.locator('nav[aria-label="Demo views"]').evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          insideCandidateRoot: el.closest("[data-candidate-root]") !== null,
          background: cs.backgroundColor,
          borderInlineStartWidth: cs.borderInlineStartWidth,
          color: cs.color,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          padding: cs.padding,
        };
      });

    await page.goto(`${URL}?candidate=off`);
    const withoutCandidate = await readStrip();

    await page.goto(`${URL}?candidate=on`);
    const withCandidate = await readStrip();

    expect(withoutCandidate.insideCandidateRoot).toBe(false);
    expect(withCandidate.insideCandidateRoot).toBe(false);

    // The leakage assertion only watches `[data-canary]` elements, so it would not
    // notice the candidate restyling this strip. Diffing it across the two loads is
    // the same method applied to the chrome the switcher adds.
    expect(
      withCandidate,
      "the candidate's stylesheet changed the host view switcher",
    ).toEqual(withoutCandidate);

    // Links, not dead ends: this pairing ships island + inventory, and the island
    // is the current view so it is not a link.
    await expect(page.locator('nav[aria-label="Demo views"] a')).not.toHaveCount(0);
    await expect(page.locator('nav[aria-label="Demo views"] [aria-current="page"]')).toHaveCount(
      1,
    );
    // The full-application view is Delta-only and must not be offered here.
    await expect(page.locator('nav[aria-label="Demo views"] a[href="./app.html"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('nav[aria-label="Demo views"] a[href="./index.html"]'),
    ).toHaveCount(1);
  });

  test("page header mirrors under RTL, glyph included", async ({ page }) => {
    /*
     * The header's boxes use logical properties, which SHOULD mirror on their own —
     * but the frame sets `dir` on a wrapper rather than on <html>, and this run
     * already found that a portal escaping that wrapper loses direction. Verified
     * rather than assumed.
     *
     * The breadcrumb separator is checked SEPARATELY from the layout because CSS
     * does not mirror generated CONTENT. `margin-inline-end` puts the glyph on the
     * correct side in both directions while the glyph itself keeps pointing the way
     * the reader came, which is a defect logical properties cannot catch and this
     * assertion can.
     */
    await page.goto(`${URL}?candidate=on`);

    const crumb = page.locator('nav[aria-label="Breadcrumb"] li').last();
    const firstTab = page.locator('nav[aria-label="Demo views"] li').first();
    const read = async () => ({
      ...(await crumb.evaluate((el) => ({
        direction: getComputedStyle(el).direction,
        glyph: getComputedStyle(el, "::before").content,
      }))),
      // The first tab's own position across the two loads, NOT first-versus-last:
      // the tab row wraps at narrow widths, where comparing two tabs on different
      // rows compares nothing.
      tabX: (await firstTab.boundingBox())?.x ?? -1,
    });

    const ltr = await read();
    expect(ltr.direction).toBe("ltr");
    expect(ltr.glyph, "LTR: the separator should point forwards").toContain("›");

    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    const rtl = await read();
    expect(rtl.direction).toBe("rtl");
    expect(rtl.glyph, "RTL: the separator should have flipped").toContain("‹");
    expect(rtl.tabX, "RTL: the tab row should start from the right").toBeGreaterThan(ltr.tabX);
  });

  test("the page header frames the page, above the content", async ({ page }) => {
    /*
     * Position is the point of the `pageHeader` slot, so it is asserted rather than
     * left to review: passed as a child instead, the switcher rendered inside the
     * content region BELOW the page title and the host canary block, which put the
     * navigation for the page a screen down and made it read as content within it.
     */
    await page.goto(`${URL}?candidate=on`);

    const order = await page.evaluate(() => {
      const header = document.querySelector('nav[aria-label="Demo views"]');
      const title = document.querySelector("[data-canary='heading-1']");
      const candidate = document.querySelector("[data-candidate-root]");
      return {
        headerTop: header?.getBoundingClientRect().top ?? -1,
        titleTop: title?.getBoundingClientRect().top ?? -1,
        candidateTop: candidate?.getBoundingClientRect().top ?? -1,
        insideContent: header?.closest(".mg-page-content--padded") !== null,
      };
    });

    expect(order.insideContent, "the page header belongs to the frame, not the content").toBe(
      false,
    );
    expect(order.headerTop).toBeLessThan(order.titleTop);
    expect(order.headerTop).toBeLessThan(order.candidateTop);
  });

  test("candidate=off leaves the candidate region empty", async ({ page }) => {
    // The precondition the leakage assertion depends on. Asserted separately so
    // a regression here is diagnosed as "baseline broken" rather than showing up
    // as a mysterious leakage pass.
    await page.goto(`${URL}?candidate=off`);
    await expect(page.locator("[data-candidate-root] *")).toHaveCount(0);
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);
  });

  test("filters the table through the facet controls", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const count = page.locator(".demo-filters__count");
    await expect(count).toHaveText("250 / 250");

    // Text filter.
    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(count).not.toHaveText("250 / 250");

    // Clearing restores the full set. `Clear filters` is disabled until a facet
    // is actually narrowing, which is application logic React Aria does not
    // supply — asserted so the disabled state is measured, not assumed.
    const clear = page.getByRole("button", { name: "Clear filters" });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(count).toHaveText("250 / 250");
    await expect(clear).toBeDisabled();

    // Hazard facet, through React Aria's Select and its portalled listbox.
    await page.locator(".demo-select__trigger").first().click();
    await page.getByRole("option", { name: "Drought", exact: true }).click();
    await expect(count).not.toHaveText("250 / 250");
    await expect(page.locator("[data-candidate-root] tbody tr").first()).toBeVisible();
  });

  /**
   * Three fixes that had no test between them, which is how they became defects.
   *
   * All three are CSS or markup rather than behaviour, so nothing in this file
   * could see them: `aria-sort` was correct while the header showed no sort state,
   * the rows-per-page select was operable while showing the browser's focus ring
   * instead of the token's, and two live regions announced correctly — just twice,
   * per keystroke. Asserted on computed style and on the accessibility tree,
   * because that is where each of them lived.
   */
  test("a sortable header shows its sort state, not just aria-sort", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const readIndicator = (name: string) =>
      page.getByRole("columnheader", { name }).evaluate((el) => {
        const cs = getComputedStyle(el, "::after");
        return {
          content: cs.content,
          opacity: Number.parseFloat(cs.opacity),
          borderTopWidth: Number.parseFloat(cs.borderTopWidth),
          borderBottomWidth: Number.parseFloat(cs.borderBottomWidth),
        };
      });

    // Unsorted but sortable: an indicator exists, dimmed.
    const idle = await readIndicator("Country");
    expect(idle.content, "no ::after box on a [data-allows-sorting] header").not.toBe(
      "none",
    );
    expect(idle.borderBottomWidth, "the affordance triangle has no size").toBeGreaterThan(0);
    expect(idle.opacity, "an unsorted column should be dimmed").toBeLessThan(1);

    // Ascending: full strength, pointing one way.
    await page.getByRole("columnheader", { name: "Country" }).click();
    const ascending = await readIndicator("Country");
    expect(ascending.opacity).toBe(1);
    expect(ascending.borderBottomWidth).toBeGreaterThan(0);
    expect(ascending.borderTopWidth).toBe(0);

    // Descending: the triangle must actually flip, not just stay lit.
    await page.getByRole("columnheader", { name: "Country" }).click();
    const descending = await readIndicator("Country");
    expect(descending.opacity).toBe(1);
    expect(
      descending.borderTopWidth,
      "the indicator did not flip between ascending and descending",
    ).toBeGreaterThan(0);
    expect(descending.borderBottomWidth).toBe(0);
  });

  test("the native rows-per-page select honours the token focus ring", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Every other focus style keys off React Aria's `data-focus-visible`, which a
    // native element never receives, so this one needs `:focus-visible`.
    const select = page.locator("select.demo-input");
    await expect(select).toHaveCount(1);
    await select.focus();

    const ring = await select.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        width: cs.outlineWidth,
        style: cs.outlineStyle,
        colour: cs.outlineColor,
        // Resolved through a probe rather than read as a string: the token is a
        // hex literal and `outline-color` computes to `rgb(...)`, so comparing
        // the raw values would fail on notation alone.
        token: (() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--undrr-color-focus)";
          el.parentElement!.append(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        })(),
      };
    });

    expect(ring.style).toBe("solid");
    expect(Number.parseFloat(ring.width)).toBeGreaterThanOrEqual(2);
    expect(ring.token, "the focus token is unreachable here").not.toBe("");
    expect(
      ring.colour,
      `native select focus ring is ${ring.colour}, not the token ${ring.token}`,
    ).toBe(ring.token);
  });

  test("the island announces once, not twice per keystroke", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Two live regions both driven off the search box meant every character
    // queued two announcements of the same fact.
    await expect(
      page.locator('.demo-filters [role="status"], .demo-filters [aria-live]'),
      "the filter card still has a live region announcing on every keystroke",
    ).toHaveCount(0);

    const live = page.locator(
      '.demo-pagination [role="status"], .demo-pagination [aria-live]',
    );
    await expect(live, "the range readout should be the one live region").toHaveCount(1);

    // The surviving one carries the range AND the filtered total, so nothing the
    // dropped region announced has been lost.
    await expect(live).toHaveText("1–10 / 250");

    // And it settles rather than firing per character.
    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(page.locator(".demo-pagination__status")).toHaveText("1–10 / 19");
    await expect(live).toHaveText("1–10 / 19");
  });

  test("paginates, and resets to the first page when a facet changes", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const status = page.locator(".demo-pagination__status");
    await expect(status).toHaveText("1–10 / 250");

    const previous = page.getByRole("button", { name: "Previous" });
    await expect(previous).toBeDisabled();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(status).toHaveText("11–20 / 250");
    await expect(previous).toBeEnabled();

    // Page reset on filter change. React Aria models no pagination at all, so
    // this is entirely application code and is exactly the kind of thing that
    // breaks silently — a user left on page 3 of a 1-page result set.
    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    // The full string, not `toContainText("1–")`. The prior state was
    // "11–20 / 250", which contains "1–" — so the weaker form was already
    // satisfied before the reset happened and could not detect its absence.
    // 19 of the 250 fixture rows are Bangladesh.
    await expect(status).toHaveText("1–10 / 19");
    await expect(previous).toBeDisabled();
  });

  /**
   * This used to assert only `aria-sort` matching /ascending|descending/, which
   * could not fail for the reason it was written. React Aria derives `aria-sort`
   * from the `sortDescriptor` we hand back to it, not from the row order, so the
   * attribute appears whether or not `sortRecords` sorted anything — gutting the
   * comparator left the test green. The regex accepting either value also meant a
   * toggle stuck in one direction passed. It really did miss two live defects in
   * `demo-state.ts`: descending implemented as `.reverse()` and a `sensitivity:
   * "base"` collator.
   *
   * The ordering of the first column is now the assertion; `aria-sort` is kept
   * beside it, pinned to a specific direction, because the wiring and the result
   * are separate claims.
   */
  test("sorts on a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const collator = new Intl.Collator("en");
    const countryColumn = page.locator("[data-candidate-root] tbody tr td:first-child");

    /** Reads the visible page's first column and asserts it is ordered. */
    const readOrdered = async (direction: "ascending" | "descending") => {
      const sign = direction === "ascending" ? 1 : -1;
      const column = await countryColumn.allInnerTexts();
      expect(column.length, "the page should still hold 10 rows").toBe(10);
      for (let i = 1; i < column.length; i += 1) {
        expect(
          sign * collator.compare(column[i - 1]!, column[i]!),
          `${direction}: row ${i} ("${column[i]}") sorts before row ${i - 1} ` +
            `("${column[i - 1]}")`,
        ).toBeLessThanOrEqual(0);
      }
      return column;
    };

    const header = page.getByRole("columnheader", { name: "Country" });

    // First click sorts ascending. Pinned to the specific direction, not a regex
    // over both, so a toggle stuck one way cannot pass.
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascending = await readOrdered("ascending");

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const descending = await readOrdered("descending");

    expect(
      descending[0],
      "reversing the sort direction did not change the first row",
    ).not.toBe(ascending[0]);
  });

  /**
   * The second half of the sort defect, which ordering alone cannot see.
   *
   * `sortRecords` used to implement descending as `sorted.reverse()`. The primary
   * key still came out ordered, so every "is it sorted?" assertion passed — but
   * `Array.prototype.sort` is stable, and reversing its output also reverses the
   * order WITHIN each group of equal keys. `hazardType` has ~8 distinct values
   * across 250 rows, so toggling direction silently reshuffled ~31 rows per group.
   *
   * Narrowing to ONE hazard makes every key in the sort column tie, so the row
   * order is decided entirely by the tiebreak — which is direction-independent by
   * design. Ascending and descending must therefore produce the IDENTICAL page.
   * Under `.reverse()` they were exact opposites.
   */
  test("sorting is stable within tie groups", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Every remaining row now has the same hazardType.
    await page.locator(".demo-select__trigger").first().click();
    await page.getByRole("option", { name: "Drought", exact: true }).click();

    const firstColumn = page.locator("[data-candidate-root] tbody tr td:first-child");
    const header = page.getByRole("columnheader", { name: "Hazard type" });

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascending = await firstColumn.allInnerTexts();
    expect(ascending.length).toBeGreaterThan(1);

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const descending = await firstColumn.allInnerTexts();

    expect(
      descending,
      "all keys in this column tie, so flipping direction must not reorder the " +
        "rows. If these are reverses of each other, descending is implemented as " +
        "a reverse of the ascending array rather than a negated comparator.",
    ).toEqual(ascending);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });

    writeJson("test-results/leakage-island.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    // Recorded either way: a failure is documented, not swallowed.
    expect(
      result.differences,
      `host canaries changed after mounting React Aria in the island frame:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("leakage-island.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    // `dir` goes to the frame, because the frame's own markup is not React
    // Aria's to flip; I18nProvider mirrors the components themselves.
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    // The table must mirror rather than merely sit inside an RTL container.
    const inlineStart = await page
      .locator("[data-candidate-root] th")
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(inlineStart).toBe("rtl");

    // The facet listbox is PORTALLED to document.body, outside the frame's `dir`
    // element, so CSS direction does not inherit into it. It renders LTR in Arabic
    // unless direction is re-applied by hand — see views/records-state.ts
    // (useOverlayDir). Asserted here because the wrapper being RTL proves nothing
    // about a portal.
    await page.locator(".demo-select__trigger").first().click();
    const popover = page.locator(".demo-popover").first();
    await expect(popover).toBeVisible();
    expect(
      await popover.evaluate((el) => ({
        direction: getComputedStyle(el).direction,
        outsideFrame: el.closest("[data-candidate-root]") === null,
      })),
    ).toEqual({ direction: "rtl", outsideFrame: true });
  });

  test("axe on the candidate region and the whole framed page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    // Scoped first, so the recorded numbers describe the candidate rather than
    // the host frame.
    const scoped = await runAxe(page, {
      section: "island-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-island-candidate-subtree.json", scoped);

    // Whole page includes the frame's `role="menubar"` navigation, which is a
    // deliberate ARIA adversary: a candidate rendering its own menu beside it
    // either agrees with Mangrove on semantics or does not.
    const wholePage = await runAxe(page, { section: "island-whole-page" });
    writeJson("test-results/axe-island-whole-page.json", wholePage);

    /*
      THE FACET POPOVER, which neither scan above reaches and nothing else covered.

      "applies RTL for Arabic" above already proves it: it asserts
      `el.closest("[data-candidate-root]") === null` on this very element, because
      React Aria portals every overlay to a container appended to `document.body`.
      So the scoped scan misses it by construction, and the whole-page scan misses
      it because the popover is not in the DOM until the trigger is pressed. The
      listbox, its options and its selection semantics were the largest piece of
      candidate markup on this view with no accessibility scan at all.
    */
    await page.locator(".demo-select__trigger").first().click();
    await expect(page.locator(".demo-popover")).toBeVisible();
    const popover = await runAxe(page, {
      section: "island-facet-popover",
      include: ".demo-popover",
    });
    writeJson("test-results/axe-island-facet-popover.json", popover);
    await page.keyboard.press("Escape");

    // eslint-disable-next-line no-console
    console.log(
      `axe island scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete | whole page: ` +
        `${wholePage.counts.violations} violations ` +
        `(${wholePage.counts.critical} critical, ${wholePage.counts.serious} serious), ` +
        `${wholePage.counts.incomplete} incomplete | facet popover: ` +
        `${popover.counts.violations} violations ` +
        `(${popover.counts.critical} critical, ${popover.counts.serious} serious), ` +
        `${popover.counts.incomplete} incomplete`,
    );

    await testInfo.attach("axe-island-summary.json", {
      body: JSON.stringify({ scoped, wholePage, popover }, null, 2),
      contentType: "application/json",
    });

    /*
      THIS TEST HAD NO `expect` AT ALL. It ran axe, wrote its JSON and passed
      unconditionally — including if a scan returned nothing, or if the candidate
      shipped a hundred critical violations.

      Asserting zero CRITICAL is the line the MUI and Mantine specs draw, and it is
      compatible with the file header: Brief 1 forbids claiming conformance, so the
      serious/moderate/minor counts stay recorded-not-asserted and remain the
      output. Critical is different — it is not a grading curve, it is "this is
      unusable" — and there is no evidence value in leaving it unchecked.
    */
    for (const [name, result] of [
      ["candidate subtree", scoped],
      ["whole framed page", wholePage],
      ["facet popover", popover],
    ] as const) {
      expect(
        result.counts.critical,
        `axe found ${result.counts.critical} critical violation(s) in the ${name}; ` +
          `see test-results/axe-island-*.json`,
      ).toBe(0);
    }
  });

  test("screenshots per viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "island-00-full-page", testInfo);

    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-filters", testInfo, { fullPage: false });

    // The seam is the point of this view: the boundary where Mangrove prose meets
    // the candidate's first and last components.
    await page.locator(frameCanarySelector("frame-prose-after")).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-02-boundary", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "island-00-full-page", testInfo, { rtl: true });
    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "island-01-filters", testInfo, { rtl: true, fullPage: false });
    await page.locator(frameCanarySelector("frame-prose-after")).scrollIntoViewIfNeeded();
    await captureScreens(page, "island-02-boundary", testInfo, { rtl: true, fullPage: false });
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    // Written before the assertion so the evidence exists even when this fails.
    writeJson(`test-results/long-labels-island-${testInfo.project.name}.json`, {
      view: "island",
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${overflow}px in German at ` +
        `${testInfo.project.name}. Not weakened to pass: recorded in evidence.json.`,
    ).toBeLessThanOrEqual(1);
  });
});
