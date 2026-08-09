/**
 * Evidence run for the full-application view (`app.html`).
 *
 * Same harness, same helpers and same three viewport projects as
 * `demo.spec.ts` — the kitchen sink and the application view must be measured the
 * same way or their numbers cannot be compared.
 *
 * WHY LEAKAGE READS DIFFERENTLY HERE, and the frame says so itself: when the
 * candidate owns the viewport there is almost no host markup left to leak onto, so
 * a clean result means less than the same result from the kitchen sink — not
 * because the candidate improved but because the target shrank. The frame keeps a
 * host strip below the application region so the assertion stays meaningful, and
 * it is still run below, but this view is to be read for LAYOUT COVERAGE.
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
  DELTA_FRAME_CANARY_IDS,
  frameCanarySelector,
} from "@undrr-eval/test-harness/frame-canaries";

/** The application entry. Relative, so Playwright's baseURL applies. */
const URL = "/app.html";

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

/** Opens the delete confirmation for the first row and returns its record id. */
async function openDeleteForFirstRow(page: Page): Promise<string> {
  const trigger = page.locator(".demo-iconbutton--danger").first();
  const label = await trigger.getAttribute("aria-label");
  if (!label) throw new Error("row delete button has no accessible name");
  await trigger.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  // Label shape is "<Delete>: DRR-0005"; the id is what identifies the row.
  const id = label.split(":").pop()?.trim();
  if (!id) throw new Error(`could not read a record id from "${label}"`);
  return id;
}

test.describe("full application", () => {
  test("renders every part of the records screen", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator('[data-view="app"]')).toHaveCount(1);
    await expect(page.locator(".demo-pageheader__title")).toBeVisible();
    await expect(page.locator(".demo-filters--collapsible")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] table")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] tbody tr")).toHaveCount(10);
    await expect(page.locator(".demo-badge")).not.toHaveCount(0);
    await expect(page.locator(".demo-pagination")).toHaveCount(1);
    // Row actions: two icon buttons per row.
    await expect(page.locator(".demo-iconbutton")).toHaveCount(20);
  });

  test("renders all 14 host canaries and the app frame's 4 chrome canaries", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);

    // A separate contract from CANARY_IDS on purpose. Two of these are the point
    // of this frame: `frame-mangrove-in-delta` is a real `mg-button` inside a
    // Tailwind page, which is the coexistence real DELTA imposes.
    expect(DELTA_FRAME_CANARY_IDS.length).toBe(4);
    for (const id of DELTA_FRAME_CANARY_IDS) {
      await expect(page.locator(frameCanarySelector(id)), id).toHaveCount(1);
    }
  });

  test("known-issues box is host chrome in both candidate states", async ({ page }) => {
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
    // Reaches the page through the frame's `pageHeader` slot, so it must sit outside
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
    // the same method applied to the chrome the switcher adds. Worth doing on this
    // host in particular: the strip is styled with Tailwind utilities from the same
    // sheet whose Preflight reset reaches the candidate's subtree.
    expect(
      withCandidate,
      "the candidate's stylesheet changed the host view switcher",
    ).toEqual(withoutCandidate);

    await expect(page.locator('nav[aria-label="Demo views"] a')).not.toHaveCount(0);
    await expect(page.locator('nav[aria-label="Demo views"] [aria-current="page"]')).toHaveCount(
      1,
    );
    // The island view is Mangrove-only and must not be offered here.
    await expect(
      page.locator('nav[aria-label="Demo views"] a[href="./island.html"]'),
    ).toHaveCount(0);
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
     * left to review: passed as a child instead, the switcher rendered inside
     * `main` BELOW the host canary block, which put the navigation for the page a
     * screen down and made it read as content within the page.
     */
    await page.goto(`${URL}?candidate=on`);

    const order = await page.evaluate(() => {
      const header = document.querySelector('nav[aria-label="Demo views"]');
      const canaries = document.querySelector("[data-canary='heading-2']");
      const candidate = document.querySelector("[data-candidate-root]");
      return {
        headerTop: header?.getBoundingClientRect().top ?? -1,
        canaryTop: canaries?.getBoundingClientRect().top ?? -1,
        candidateTop: candidate?.getBoundingClientRect().top ?? -1,
        insideMain: header?.closest("main") !== null,
      };
    });

    expect(order.insideMain, "the page header belongs to the frame, not the content").toBe(false);
    expect(order.headerTop).toBeLessThan(order.canaryTop);
    expect(order.headerTop).toBeLessThan(order.candidateTop);
  });

  test("candidate=off leaves the application region empty", async ({ page }) => {
    await page.goto(`${URL}?candidate=off`);
    await expect(page.locator("[data-candidate-root] *")).toHaveCount(0);
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);
  });

  test("collapses and expands the filter card", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // React Aria's Disclosure supplies aria-expanded and the panel wiring with no
    // custom state, which is the whole reason the collapsible card was cheap.
    const trigger = page.locator(".demo-accordion__trigger");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".demo-filters__panel")).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".demo-filters__panel")).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".demo-filters__panel")).toBeVisible();
  });

  test("filters the table through the facet controls", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const count = page.locator(".demo-filters__count");
    await expect(count).toHaveText("250 / 250");

    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(count).not.toHaveText("250 / 250");

    const clear = page.getByRole("button", { name: "Clear filters" });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(count).toHaveText("250 / 250");
    await expect(clear).toBeDisabled();

    await page.locator(".demo-select__trigger").first().click();
    await page.getByRole("option", { name: "Drought", exact: true }).click();
    await expect(count).not.toHaveText("250 / 250");
  });

  test("sorts on a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const collator = new Intl.Collator("en");
    // The first cell is the selection checkbox; Country is the first data column.
    const countryColumn = page.locator("[data-candidate-root] tbody tr td:nth-child(2)");

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

    // `aria-sort` is pinned to a specific direction rather than matched against a
    // regex over both, so a toggle stuck one way cannot pass. And the ordering is
    // asserted separately, because React Aria derives `aria-sort` from the
    // `sortDescriptor` we hand back rather than from the rows.
    const header = page.getByRole("columnheader", { name: "Country" });

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascending = await readOrdered("ascending");

    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const descending = await readOrdered("descending");

    expect(descending[0], "reversing the sort direction changed nothing").not.toBe(
      ascending[0],
    );
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

    const firstColumn = page.locator("[data-candidate-root] tbody tr td:nth-child(2)");
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

  /**
   * Four fixes that had no test between them, which is how they became defects.
   *
   * All four are CSS or markup rather than behaviour, so nothing in this file
   * could see them: `aria-sort` was correct while the header showed no sort
   * state, the status bar's live region worked while painting an empty green
   * strip, the rows-per-face select was operable while showing the wrong focus
   * ring, and two live regions announced correctly — just twice, per keystroke.
   * Asserted on computed style and on the accessibility tree, because that is
   * where each of them lived.
   */
  test("a sortable header shows its sort state, not just aria-sort", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const readIndicator = (name: string) =>
      page.getByRole("columnheader", { name }).evaluate((el) => {
        const inner = el.querySelector(".demo-table__columnInner");
        if (!inner) throw new Error("sortable header has no inner layout element");
        const cs = getComputedStyle(inner, "::after");
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

  test("the status region paints nothing until there is something to say", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    // The live region must be in the DOM from the first paint or the first
    // announcement is lost, so this asserts the BOX is empty, not the node.
    // Located structurally, not by class: when there is no message the element
    // deliberately carries no class at all, which is the fix.
    const region = page.locator('[data-candidate-root] p[data-toast-status][role="status"]');
    await expect(region).toHaveCount(1);

    const before = await region.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        height: Math.round(r.height),
        paddingTop: cs.paddingTop,
        background: cs.backgroundColor,
        text: el.textContent ?? "",
      };
    });
    expect(before.text).toBe("");
    expect(before.height, "an empty status message still occupies a strip").toBe(0);
    expect(before.paddingTop).toBe("0px");
    expect(
      before.background,
      "an empty status message is painting a background",
    ).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);

    // And it does style itself once it has a message.
    const id = await openDeleteForFirstRow(page);
    await page.locator(".demo-dialog__actions .demo-button--danger").click();
    await expect(page.locator(".demo-status--success")).toContainText(id);
    const after = await page.locator(".demo-status--success").evaluate((el) => ({
      height: Math.round(el.getBoundingClientRect().height),
      background: getComputedStyle(el).backgroundColor,
    }));
    expect(after.height).toBeGreaterThan(0);
    expect(after.background).not.toBe(before.background);
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

  test("the records screen announces once, not twice per keystroke", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Two live regions both driven off the search box meant every character
    // queued two announcements of the same fact. The filter card's is the one
    // that went; the delete confirmation's status line is a different fact and
    // is not driven by typing, so it stays.
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

    /*
     * Scoped to the pagination landmark. These were page-wide until the step
     * wizard was added below the table, which brought a second "Next" onto the
     * page and made the unscoped locator a strict-mode violation. Scoping is the
     * right fix rather than the narrower one: "the page has exactly one Next"
     * was never what this test meant to assert.
     */
    const pagination = page.getByLabel("Pagination");
    const previous = pagination.getByRole("button", { name: "Previous" });
    await expect(previous).toBeDisabled();

    await pagination.getByRole("button", { name: "Next" }).click();
    await expect(status).toHaveText("11–20 / 250");
    await expect(previous).toBeEnabled();

    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    // The full string, not `toContainText("1–")`. The prior state was
    // "11–20 / 250", which contains "1–" — so the weaker form was already
    // satisfied before the reset happened and could not detect its absence.
    // 19 of the 250 fixture rows are Bangladesh.
    await expect(status).toHaveText("1–10 / 19");
    await expect(previous).toBeDisabled();
  });

  test("delete confirmation opens, cancels and confirms", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const status = page.locator(".demo-pagination__status");
    await expect(status).toHaveText("1–10 / 250");

    // Cancel leaves the data alone.
    const id = await openDeleteForFirstRow(page);
    await expect(page.locator(".demo-dialog__detail")).toContainText(id);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(status).toHaveText("1–10 / 250");

    // Escape dismisses too, which is the library's, not ours.
    await openDeleteForFirstRow(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(status).toHaveText("1–10 / 250");

    // Confirm removes the record.
    await openDeleteForFirstRow(page);
    await page.locator(".demo-dialog__actions .demo-button--danger").click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(status).toHaveText("1–10 / 249");
    await expect(page.locator(".demo-status--success")).toContainText(id);
  });

  test("delete dialog traps focus and is a real alertdialog", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await openDeleteForFirstRow(page);

    const dialog = page.getByRole("alertdialog");
    // Focus containment is React Aria's, not ours: tabbing repeatedly must never
    // leave the dialog.
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const active = document.activeElement;
        return active ? active.closest('[role="alertdialog"]') !== null : false;
      });
      expect(inside, `focus escaped the dialog after ${i + 1} tabs`).toBe(true);
    }

    await expect(dialog).toHaveAttribute("aria-labelledby", /.+/);
  });

  /**
   * RECORDED DEFECT — this asserts CURRENT behaviour, which is broken.
   *
   * When a dialog closes, React Aria restores focus to the element that opened it.
   * After a confirmed delete that element no longer exists, because its row has
   * been removed, and the library has no fallback that means anything to the user.
   *
   * WHAT IT ACTUALLY DOES IS NOT EVEN CONSISTENT, which is the sharper half of the
   * finding and only appeared once this ran at three viewports. Two outcomes were
   * measured from identical steps:
   *
   *   - focus lands on whichever row-action button now occupies that position in
   *     the table, i.e. a DIFFERENT record's delete/edit controls (mobile, desktop)
   *   - focus falls all the way to `<body>`, losing the user's place entirely
   *     (tablet)
   *
   * Same code, same fixture, same click sequence. The difference is a race between
   * the row unmounting and focus restoration running, so which one you get is not
   * something an application can predict or handle.
   *
   * Neither outcome is announced by the library. The `role="status"` line this view
   * renders is OURS, added in AppView.tsx precisely because nothing in React Aria
   * says a record was deleted. So a keyboard user is silently either pointed at
   * another record's destructive control or dumped at the top of the document.
   *
   * WHY THIS TEST ASSERTS THE BROKEN BEHAVIOUR RATHER THAN THE FIX. The repo's job
   * is to measure candidates, and an unmeasured defect becomes a forgotten one. But
   * it deliberately asserts only the part that is STABLE — that focus never returns
   * anywhere meaningful — and treats the two outcomes as an enumerated set rather
   * than pinning either. Pinning one would have made this flaky, which is exactly
   * the trap the nondeterminism sets. If this test fails, React Aria's restoration
   * behaviour has changed and the finding needs re-measuring; that is the point.
   *
   * HOW IT USED TO FAIL TO DO THAT — repaired below, and worth spelling out because
   * the shape is a common one. `outcome` was a two-branch ternary over the same two
   * string literals this array holds:
   *
   *     const outcome = observed.isBody ? "lost-to-body" : "unrelated-row-action";
   *     expect(KNOWN_FOCUS_OUTCOMES).toContain(outcome);
   *
   * so `toContain` was true by construction. Every case landed in one of the two
   * branches, including the case the comment claimed it caught: if React Aria began
   * restoring focus somewhere sensible — the table, a heading, the status line — the
   * else-branch still labelled it "unrelated-row-action" and the test still passed.
   * It could not detect the defect being fixed, which is the only thing it existed
   * for. The `not.toContain(deletedId)` that followed was vacuous in the body branch
   * too, where `observed.label` is null and the subject is the empty string.
   *
   * The repair keeps the enumerated-set shape but derives the label from what was
   * actually observed rather than from a coin flip, so "neither known outcome" is
   * now a reachable third value. Both nondeterministic outcomes still pass, so it
   * is no more flaky than before.
   */
  const KNOWN_FOCUS_OUTCOMES = ["unrelated-row-action", "lost-to-body"] as const;

  test("records the post-delete focus defect", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const deletedId = await openDeleteForFirstRow(page);
    await page.locator(".demo-dialog__actions .demo-button--danger").click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    const observed = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tag: active?.tagName.toLowerCase() ?? null,
        label: active?.getAttribute("aria-label") ?? null,
        className: active?.getAttribute("class") ?? null,
        insideTable: active ? active.closest("table") !== null : false,
        isBody: active === document.body || active === null,
      };
    });

    /*
      Each outcome is recognised by what it IS, not by elimination. Anything that
      matches neither — focus restored to the table, to a heading, to the status
      line, or to a control that still names the deleted record — falls through to
      "unmeasured" and fails the assertion below, which is what makes this a test
      rather than a description.
     */
    const isLostToBody = observed.isBody;
    const isUnrelatedRowAction =
      !observed.isBody &&
      observed.insideTable &&
      (observed.className ?? "").includes("demo-iconbutton") &&
      // Names some record...
      /DRR-\d+/.test(observed.label ?? "") &&
      // ...but not the one just deleted. Folded in here rather than asserted
      // separately, because in the body branch there is no label at all and
      // asserting `"".not.toContain(id)` proves nothing.
      !(observed.label ?? "").includes(deletedId);

    const outcome = isLostToBody
      ? "lost-to-body"
      : isUnrelatedRowAction
        ? "unrelated-row-action"
        : "unmeasured";

    // Written before the assertions, so the evidence survives a failure.
    writeJson(`test-results/focus-after-delete-${testInfo.project.name}.json`, {
      viewport: testInfo.project.name,
      deletedId,
      observed,
      outcome,
      finding:
        "After a confirmed delete React Aria cannot restore focus to the removed " +
        "trigger and has no meaningful fallback. Measured outcomes vary by run: " +
        "focus either lands on an unrelated record's row-action button or falls to " +
        "<body>. Neither is announced by the library. Asserted as CURRENT " +
        "behaviour, not desired behaviour.",
    });

    // The stable core of the defect: focus never comes back anywhere meaningful.
    // `outcome` can now be "unmeasured", so this is no longer true by construction.
    expect(
      KNOWN_FOCUS_OUTCOMES,
      `unmeasured post-delete focus outcome — focus went to ` +
        `${JSON.stringify(observed)} after deleting ${deletedId}. Either React ` +
        `Aria's restoration behaviour changed (good news, re-measure the finding) ` +
        `or focus is on a control for the deleted record (worse news).`,
    ).toContain(outcome);

    // Recorded separately from the classification: in the body case the observed
    // element must genuinely be <body>, not merely something without a label.
    if (outcome === "lost-to-body") {
      expect(
        observed.tag === "body" || observed.tag === null,
        `classified lost-to-body but the focused element is <${observed.tag}>`,
      ).toBe(true);
      expect(observed.insideTable).toBe(false);
    }
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });

    writeJson("test-results/leakage-app.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting React Aria in the app frame:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("leakage-app.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    const direction = await page
      .locator("[data-candidate-root] th")
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("rtl");

    // The portalled dialog must mirror too, not just the in-page layout.
    await openDeleteForFirstRow(page);
    const dialogDirection = await page
      .getByRole("alertdialog")
      .evaluate((el) => getComputedStyle(el).direction);
    expect(dialogDirection).toBe("rtl");
  });


  /**
   * THE HOST MENU BAR, BUILT WITH THIS LIBRARY.
   *
   * DELTA's bar is a PrimeReact `Menubar` whose four items each open a submenu, so
   * replacing PrimeReact means replacing a menu. The frame's `navMenu` slot lets
   * this pairing render it, and this is the only assertion that the result is a
   * real menu rather than chrome that looks like one - which is what the bar was
   * before the slot existed.
   *
   * Scoped to `[data-nav-item]`, the frame's own marker, so the same test shape
   * works across five libraries whose menus share no class names.
   */
  test("the DELTA menu bar opens a real menu", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const trigger = page.locator('[data-nav-item="data"] button').first();
    await expect(trigger).toHaveAttribute("aria-haspopup", "true");

    await trigger.click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();
    // The trigger reports its own state, which four of five candidates do.
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // DELTA's DATA menu is three items, each with its supporting line.
    const items = page.locator('[role="menuitem"]');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText("Hazardous events");
    await expect(items.first()).toContainText("Monitor hazardous situations");

    /*
     * Escape closes it. Asserted as NOT VISIBLE rather than absent from the DOM,
     * because the five libraries differ on that and the difference is not a
     * defect: React Aria, MUI, Mantine and Carbon unmount the panel, while antd
     * leaves it mounted under a wrapper with `display: none` - hidden from the
     * accessibility tree either way. Counting nodes would have failed antd for
     * behaviour that is correct.
     */
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]').first()).not.toBeVisible();
  });

  /**
   * The disabled item, which is where the five diverge most. Recorded per pairing
   * rather than asserted uniformly, because "correct" differs: the APG asks for a
   * disabled menu item to stay focusable so its unavailability is discoverable.
   */
  test("the menu bar's disabled item is marked as such", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await page.locator('[data-nav-item="settings"] button').first().click();
    await expect(page.locator('[role="menu"]').first()).toBeVisible();

    const apiKeys = await page.evaluate(() => {
      const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
        (el.textContent ?? "").includes("API keys"),
      );
      if (!item) return null;
      return {
        ariaDisabled: item.getAttribute("aria-disabled"),
        native: item.hasAttribute("disabled"),
        tabindex: item.getAttribute("tabindex"),
      };
    });

    expect(apiKeys, "the disabled API keys item was not rendered").not.toBeNull();
    if (apiKeys) {
      expect(apiKeys.ariaDisabled, "expected aria-disabled on the item").toBe("true");
    }
  });

  test("axe on the candidate region and the whole framed page", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);

    const scoped = await runAxe(page, {
      section: "app-candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-app-candidate-subtree.json", scoped);

    const wholePage = await runAxe(page, { section: "app-whole-page" });
    writeJson("test-results/axe-app-whole-page.json", wholePage);

    // The dialog is a separate scan: it is portalled outside the candidate root,
    // so neither scan above reaches it.
    await openDeleteForFirstRow(page);
    const dialog = await runAxe(page, {
      section: "app-delete-dialog",
      include: '[role="alertdialog"]',
    });
    writeJson("test-results/axe-app-delete-dialog.json", dialog);
    await page.keyboard.press("Escape");

    // eslint-disable-next-line no-console
    console.log(
      `axe app scoped: ${scoped.counts.violations} violations ` +
        `(${scoped.counts.critical} critical, ${scoped.counts.serious} serious), ` +
        `${scoped.counts.incomplete} incomplete | whole page: ` +
        `${wholePage.counts.violations} violations ` +
        `(${wholePage.counts.critical} critical, ${wholePage.counts.serious} serious), ` +
        `${wholePage.counts.incomplete} incomplete | dialog: ` +
        `${dialog.counts.violations} violations ` +
        `(${dialog.counts.critical} critical, ${dialog.counts.serious} serious), ` +
        `${dialog.counts.incomplete} incomplete`,
    );

    await testInfo.attach("axe-app-summary.json", {
      body: JSON.stringify({ scoped, wholePage, dialog }, null, 2),
      contentType: "application/json",
    });

    /*
      THIS TEST HAD NO `expect` AT ALL. It ran axe three times, wrote three JSON
      files and passed unconditionally — including if a scan returned nothing, or
      if the candidate shipped a hundred critical violations.

      Asserting zero CRITICAL is the line the MUI and Mantine specs draw, and it
      is compatible with the file header: Brief 1 forbids claiming conformance, so
      the serious/moderate/minor counts stay recorded-not-asserted and remain the
      output. Critical is different — it is not a grading curve, it is "this is
      unusable" — and there is no evidence value in leaving it unchecked.
    */
    for (const [name, result] of [
      ["candidate subtree", scoped],
      ["whole page", wholePage],
      ["delete dialog", dialog],
    ] as const) {
      expect(
        result.counts.critical,
        `axe found ${result.counts.critical} critical violation(s) in the ${name}; ` +
          `see test-results/axe-app-*.json`,
      ).toBe(0);
    }
  });

  test("screenshots per viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "app-00-full-page", testInfo);

    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-filters", testInfo, { fullPage: false });

    await page.locator("[data-candidate-root] table").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-02-table", testInfo, { fullPage: false });

    await openDeleteForFirstRow(page);
    await captureScreens(page, "app-03-delete-dialog", testInfo, { fullPage: false });
    await page.keyboard.press("Escape");
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "app-00-full-page", testInfo, { rtl: true });
    await page.locator(".demo-filters").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-filters", testInfo, { rtl: true, fullPage: false });
    await page.locator("[data-candidate-root] table").scrollIntoViewIfNeeded();
    await captureScreens(page, "app-02-table", testInfo, { rtl: true, fullPage: false });

    await openDeleteForFirstRow(page);
    await captureScreens(page, "app-03-delete-dialog", testInfo, {
      rtl: true,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    writeJson(`test-results/long-labels-app-${testInfo.project.name}.json`, {
      view: "app",
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

  /* ------------------------------------------------------- the step wizard */

  /*
   * The wizard is the part of this view that PrimeReact would have given DELTA for
   * free, so it is the part worth asserting hardest. React Aria ships no stepper:
   * the markup, the states and the semantics below are all hand-written, which
   * means there is no library contract keeping them right and only these
   * assertions stand between a regression and a screenshot that still looks fine.
   */
  const WIZARD = ".demo-wizard";
  const STEP_BUTTONS = `${WIZARD} .demo-stepper__button`;

  /** The wizard's own Next, not the pagination's — both are named "Next". */
  /*
   * `exact` is not optional decoration: "Save" is a substring of "Save as draft",
   * so the default substring match resolves to both buttons and every assertion on
   * it fails as a strict-mode violation rather than as the thing being tested.
   */
  function wizardButton(page: Page, name: string, exact = false) {
    return page
      .locator(`${WIZARD} .demo-wizard__actions`)
      .getByRole("button", { name, exact });
  }

  test("the wizard states which step is current, in the accessibility tree", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(STEP_BUTTONS)).toHaveCount(4);
    // Exactly one current step, and it is the one the indicator shows as current.
    const current = page.locator(`${STEP_BUTTONS}[aria-current="step"]`);
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Event basics");

    /*
     * Steps ahead are unreachable and SAY so — but via the NATIVE `disabled`
     * attribute, because that is what React Aria's `Button` emits for `isDisabled`.
     * Asserted as `[disabled]` after the first draft of this test looked for
     * `aria-disabled="true"` and found none: the assertion was wrong, not the
     * component.
     *
     * WORTH KNOWING RATHER THAN JUST PASSING. `disabled` removes the element from
     * the tab order entirely, so a keyboard or screen-reader user cannot move
     * through the indicator to see what is coming; `aria-disabled` would leave the
     * steps readable while still inert. React Aria's Button has no prop for that, so
     * getting it would mean dropping `isDisabled` and hand-rolling the inertness —
     * more of the hand-rolling this component already is. Recorded in the register.
     */
    await expect(page.locator(`${STEP_BUTTONS}[disabled]`)).toHaveCount(3);
  });

  test("advancing the wizard moves the current step and unlocks the ones behind", async ({
    page,
  }) => {
    await page.goto(`${URL}?candidate=on`);

    await wizardButton(page, "Next").click();
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Linked events",
    );
    // Step 1 is now complete, so it is reachable again: this is the behaviour the
    // design file shows, steps 1-3 checked while step 4 is active.
    await expect(page.locator(`${WIZARD} [data-state="complete"]`)).toHaveCount(1);
    await expect(page.locator(`${STEP_BUTTONS}[disabled]`)).toHaveCount(2);

    // Back returns, and the completed marker does not un-complete.
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
    await expect(page.locator(`${WIZARD} .demo-review__card`)).toHaveCount(3);
    await expect(page.locator(`${WIZARD} .demo-review__value`).filter({ hasText: "—" })).toHaveCount(
      4,
    );
    await expect(wizardButton(page, "Save", true)).toBeEnabled();
    await expect(page.locator(`${WIZARD} .demo-wizard__actions`)).not.toContainText("Next");
  });

  test("the wizard is reachable and operable by keyboard alone", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    // Focus the wizard's Next through the keyboard, then advance with the keyboard.
    // A stepper whose steps are only clickable is a stepper half the users cannot use.
    await wizardButton(page, "Next").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Linked events",
    );

    // And a completed step can be returned to from the indicator itself.
    await page.locator(`${STEP_BUTTONS}`).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`${STEP_BUTTONS}[aria-current="step"]`)).toContainText(
      "Event basics",
    );
  });

  test("the stepper mirrors, and its connectors stay logical, in Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "العربية");

    const steps = page.locator(`${WIZARD} .demo-stepper__item`);
    const first = await steps.first().boundingBox();
    const last = await steps.last().boundingBox();
    expect(first?.x ?? 0, "Arabic: step 1 should sit right of step 4").toBeGreaterThan(
      last?.x ?? 0,
    );

    // The labels are Arabic too, including the review card field names: they are
    // chrome, so they translate, unlike the record values beside them.
    await expect(page.locator(`${STEP_BUTTONS}`).first()).toContainText("أساسيات الحدث");
  });

  test("German step labels wrap rather than clip", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "Deutsch");

    // "Zusätzliche Einzelheiten" under a 2.25rem circle is the case that breaks a
    // fixed-width stepper. Measured rather than eyeballed: clipped text reports a
    // scrollWidth wider than its box.
    const clipped = await page.locator(`${WIZARD} .demo-stepper__label`).evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
    );
    expect(clipped, "step labels are clipped in German").toEqual([]);
  });
});
