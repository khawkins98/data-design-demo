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

  test("view switcher mirrors under RTL", async ({ page }) => {
    // It uses logical properties (`ms-`/`ps-`/`border-s`), which SHOULD mirror on
    // their own — but the frame sets `dir` on a wrapper rather than on <html>, and
    // this run already found that a portal escaping that wrapper loses direction.
    // Verified rather than assumed.
    await page.goto(`${URL}?candidate=on`);

    const separator = page.locator('nav[aria-label="Demo views"] li').last();
    const ltr = await separator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { left: cs.borderLeftWidth, right: cs.borderRightWidth };
    });
    expect(ltr.left, "LTR: inline-start border should be on the left").not.toBe("0px");
    expect(ltr.right).toBe("0px");

    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    const rtl = await separator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        direction: cs.direction,
        left: cs.borderLeftWidth,
        right: cs.borderRightWidth,
      };
    });
    expect(rtl.direction).toBe("rtl");
    expect(rtl.right, "RTL: inline-start border should have moved to the right").not.toBe("0px");
    expect(rtl.left).toBe("0px");
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

    const header = page.getByRole("columnheader", { name: "Country" });
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", /ascending|descending/);

    const first = await page.locator("[data-candidate-root] tbody td").first().innerText();
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", /ascending|descending/);
    const reversed = await page.locator("[data-candidate-root] tbody td").first().innerText();
    expect(reversed, "reversing the sort direction changed nothing").not.toBe(first);
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

    await page.locator(".demo-filters .demo-input").first().fill("Bangladesh");
    await expect(status).toContainText("1–");
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

    const outcome = observed.isBody ? "lost-to-body" : "unrelated-row-action";

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
    expect(
      KNOWN_FOCUS_OUTCOMES,
      `unmeasured post-delete focus outcome "${outcome}"; re-measure the finding`,
    ).toContain(outcome);

    // And in neither outcome does focus reference the record just deleted.
    expect(
      observed.label ?? "",
      "focus is on a control for the deleted record, which should not exist",
    ).not.toContain(deletedId);

    if (outcome === "unrelated-row-action") {
      // The bad-but-not-worst case: still in the table, on someone else's row.
      expect(observed.className ?? "").toContain("demo-iconbutton");
      expect(observed.label ?? "", "focused control names no record").toMatch(/DRR-\d+/);
      expect(observed.insideTable).toBe(true);
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
});
