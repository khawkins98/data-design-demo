/**
 * Evidence run for the delta-carbon FULL APPLICATION view (`app.html`).
 *
 * Same helpers, same viewport projects and same structure as
 * `apps/delta-carbon/e2e/demo.spec.ts`, so the three views of this pairing are
 * directly comparable, and deliberately the same shape as
 * `apps/delta-mui/e2e/app.spec.ts` so the two pairings are comparable to each
 * other.
 *
 * READ THE LEAKAGE RESULT FROM THIS VIEW WITH CARE, and the frame says so itself:
 * when the candidate owns the viewport there is almost no host markup left to leak
 * onto, so a clean result here means less than the same result from the kitchen
 * sink — the target shrank rather than the candidate improving. The frame keeps a
 * host strip below the application region precisely so the assertion still has all
 * 14 canaries to compare, and this spec asserts that count rather than trusting
 * it.
 *
 * For THIS pairing there is a second reason to be careful. delta-carbon's leakage
 * result is clean only because `src/carbon.scss` hand-composes Carbon's component
 * partials and omits the global reset that `@carbon/styles/css/styles.css` opens
 * with. `?globalcss=on` loads that documented stylesheet, and the last leakage test
 * below measures what it does to this layout's canaries. Without that measurement,
 * a clean result would be read as "Carbon does not leak" rather than "this demo
 * paid to stop it".
 *
 * AXE TOTALS ARE RECORDED, NOT ASSERTED AGAINST ZERO. Claiming conformance is
 * forbidden by the brief, and whether a realistic layout adds, removes or reveals
 * violations is the thing to measure rather than assert away.
 *
 * CRITICAL COUNT IS A DIFFERENT MATTER AND IS ASSERTED AT ZERO, the same way every
 * sibling pairing's app spec does it. Recording a total is honest; `expect(count)
 * .toBeGreaterThanOrEqual(0)` is not a record, it is an assertion that cannot fail
 * — it was here on both axe tests below and it made this spec read as verified in
 * the run log while checking nothing.
 *
 * A NOTE ON THE CRITICAL THAT USED TO BE HERE. An earlier version of this comment
 * said delta-carbon carried one CRITICAL in the kitchen sink,
 * "`aria-valid-attr-value`, two nodes, on Carbon's own ComboBox/MultiSelect
 * markup". Two nodes was right; ComboBox/MultiSelect was not — the nodes were
 * `#form-required` and `#form-format`, the two invalid `TextInput`s, and the fix
 * (an explicit `aria-describedby`) had been sitting in the mangrove-carbon twin the
 * whole time. It is applied now and the count is 0. The ComboBox does appear in the
 * axe output, but under INCOMPLETE, for a different rule about
 * `aria-controls` + `aria-haspopup`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { LABELS } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import {
  ALL_CANARIES_SELECTOR,
  CANARY_IDS,
  WATCHED_PROPERTIES,
  captureScreens,
  checkLeakage,
  diffSnapshots,
  runAxe,
} from "@undrr-eval/test-harness";
import type { CanarySnapshot } from "@undrr-eval/test-harness";
import { DELTA_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

/** The application entry. Relative, so it resolves against Playwright's baseURL. */
const URL = "/app.html";

/**
 * Every table locator is scoped to the candidate region, because the frame's host
 * strip below it contains a canary TABLE of its own. An unscoped `tbody tr` counts
 * the host's canary rows as well as the candidate's ten, and would quietly count
 * host rows as candidate rows rather than failing.
 */
const ROOT = "[data-candidate-root]";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Clicks a locale.
 *
 * `data-locale` rather than a role query: Carbon's `Switch` inside a
 * `ContentSwitcher` renders a `button[role="tab"]`, and targeting by visible text
 * would break on the Arabic pass for the same reason the kitchen sink's helper
 * exists.
 */
async function selectLocale(page: Page, code: LocaleCode): Promise<void> {
  await page.locator(`[data-locale="${code}"]`).click();
}

/**
 * Opens a Carbon `Dropdown` and picks an option.
 *
 * Carbon renders the menu INSIDE the ListBox element that carries the `id`, and
 * only while it is open, so both halves can be scoped to that id — no portal to
 * chase and no ambiguity with the other three dropdowns on the page.
 */
async function chooseOption(page: Page, dropdownId: string, option: string): Promise<void> {
  await page.locator(`#${dropdownId} button`).click();
  await page
    .locator(`#${dropdownId} li[role="option"]`)
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
}

/** Reads the watched computed styles for every canary currently in the DOM. */
async function snapshotCanaries(page: Page): Promise<CanarySnapshot> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page.evaluate(
    ({ selector, properties }) => {
      const result: Record<string, Record<string, string>> = {};
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const id = element.getAttribute("data-canary");
        if (!id) continue;
        const computed = window.getComputedStyle(element);
        const values: Record<string, string> = {};
        for (const property of properties) {
          values[property] = computed.getPropertyValue(property).trim();
        }
        result[id] = values;
      }
      return result;
    },
    { selector: ALL_CANARIES_SELECTOR, properties: [...WATCHED_PROPERTIES] },
  );
}

/** Carbon's Pagination reports "1–10 of 250 items" in this element. */
const PAGINATION_COUNT = `${ROOT} .cds--pagination__items-count`;

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
    await expect(page.locator(`${ROOT} .cds--pagination`)).toHaveCount(1);

    /*
     * STATUS PILLS: one per rendered row, each naming a real status, each carrying
     * the Tag colour class the status maps to. `.first()).toBeVisible()` was the
     * whole assertion here, and it passed on a single stray Tag anywhere in the
     * region — it could not tell a status column from a decoration, and it said
     * nothing about the status→colour mapping the two Carbon apps must agree on
     * (they did not: `pending` was "warm-gray" here and "blue" in mangrove-carbon).
     */
    const pills = page.locator(`${ROOT} tbody .cds--tag`);
    await expect(pills).toHaveCount(10);
    const pillState = await pills.evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: (node.textContent ?? "").trim(),
        // `cds--tag--sm` is the SIZE modifier and shares the prefix, so the size
        // names are excluded rather than taking the first match.
        colour:
          Array.from(node.classList)
            .filter((c) => c.startsWith("cds--tag--"))
            .map((c) => c.replace("cds--tag--", ""))
            .find((c) => !["sm", "md", "lg"].includes(c)) ?? "",
      })),
    );
    const EXPECTED_COLOUR: Record<string, string> = {
      verified: "green",
      pending: "warm-gray",
      disputed: "red",
      withdrawn: "gray",
    };
    for (const pill of pillState) {
      expect(Object.keys(EXPECTED_COLOUR), `unexpected status pill "${pill.text}"`).toContain(
        pill.text,
      );
      expect(pill.colour, `status "${pill.text}" is painted ${pill.colour}`).toBe(
        EXPECTED_COLOUR[pill.text],
      );
    }
    await expect(pills.first()).toBeVisible();

    await expect(deleteButton(page)).toBeVisible();

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

    // The Mangrove button in a Tailwind page must still be a Mangrove button: if
    // Carbon's component CSS had reached it, this is where it would show.
    await expect(page.locator('[data-frame-canary="frame-mangrove-in-delta"]')).toHaveClass(
      /mg-button/,
    );
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: URL });
    writeJson("test-results/app-leakage.json", result);

    // The count is load-bearing in this view: the frame retains a host strip below
    // the application region so all 14 canaries survive a layout the candidate
    // otherwise owns entirely. If this drops, the clean verdict below is measuring
    // nothing.
    expect(
      result.canariesChecked,
      "the host strip is gone, so this view's leakage result covers less than the kitchen sink's",
    ).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Carbon in the application frame:\n${JSON.stringify(
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

  test("measures what Carbon's prebuilt global stylesheet does to this layout", async ({
    page,
  }, testInfo) => {
    /*
     * The counterfactual, and the reason the clean result above is not the whole
     * story: delta-carbon leaks nothing only because `src/carbon.scss` composes
     * Carbon's component partials by hand and omits the Eric-Meyer reset that
     * `@carbon/styles/css/styles.css` opens with.
     *
     * `checkLeakage` CANNOT express this, and the trap is worth naming because it
     * produced a confident "0 differences" here first time: it toggles only
     * `candidate` and preserves every other query parameter, so `globalcss=on`
     * would be carried into BOTH snapshots and the reset would cancel out. The
     * kitchen sink's equivalent test hit the same wall. So the two snapshots are
     * taken here:
     *
     *   baseline  ?candidate=off              host only
     *   probe     ?candidate=on&globalcss=on  host + Carbon's prebuilt styles.css
     *
     * Asserted as a DEFECT rather than against zero: the point is to record what
     * the documented import costs in THIS layout, whose host markup (the
     * `mg-button` toolbar, the sidebar links, the host strip below the application
     * region) is not the kitchen sink's markup.
     */
    await page.goto(`${URL}?candidate=off`);
    const before = await snapshotCanaries(page);
    expect(Object.keys(before).length).toBe(CANARY_IDS.length);

    await page.goto(`${URL}?candidate=on&globalcss=on`);
    const after = await snapshotCanaries(page);

    const differences = diffSnapshots(before, after);
    const canariesAffected = [...new Set(differences.map((entry) => entry.canary))].sort();
    const propertiesAffected = [...new Set(differences.map((entry) => entry.property))].sort();

    const result = {
      view: "app.html",
      stylesheet: "@carbon/styles/css/styles.css",
      canariesChecked: Object.keys(before).length,
      canariesAffected,
      propertiesAffected,
      differenceCount: differences.length,
      differences,
    };

    writeJson("test-results/app-leakage-carbon-global-css.json", result);
    await testInfo.attach("app-leakage-carbon-global-css.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    // eslint-disable-next-line no-console
    console.log(
      `app carbon global css: ${differences.length} canary differences across ` +
        `${canariesAffected.length} of ${CANARY_IDS.length} canaries ` +
        `(the shipped scoped build: 0)`,
    );

    expect(
      differences.length,
      "Carbon's prebuilt styles.css no longer changes the host canaries in the " +
        "application layout — the reset finding in EVIDENCE.md needs revisiting",
    ).toBeGreaterThan(0);
  });

  test("collapses and expands the filter card", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const toggle = page.getByRole("button", { name: "Filter", exact: true });
    const panel = page.locator("#records-filters");

    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.click();
    // The panel leaves the DOM rather than merely hiding: Carbon has no Collapse
    // component, so the disclosure is a conditional render. Which is also why
    // `aria-controls` points at an element that may not exist.
    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("filters the table and reports the count in the page header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(ROOT)).toContainText("250 / 250");

    await chooseOption(page, "app-status", "disputed");

    // The header count and Carbon's own pagination count are driven by the same
    // filtered array and must agree.
    await expect(page.locator(ROOT)).toContainText("53 / 250");
    await expect(page.locator(PAGINATION_COUNT)).toContainText("53");

    // Clearing is a single control and must restore the full set.
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.locator(ROOT)).toContainText("250 / 250");
  });

  test("filters by event date through the flatpickr calendar", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const input = page.locator("#app-from-date");

    // The calendar must open INSIDE the candidate subtree. flatpickr appends to
    // document.body by default, which would put it outside `.undrr-tokens` where
    // every `var(--undrr-*)` resolves to nothing and Carbon's own
    // `var(--cds-x, #literal)` fallbacks paint IBM's stock white theme instead.
    //
    // Measured BEFORE anything is typed, because flatpickr closes on a committed
    // keyboard entry and does not reopen on the next click of the same input.
    await input.click();
    const calendar = page.locator(".flatpickr-calendar.open");
    await expect(calendar).toBeVisible();
    const placement = await calendar.evaluate((el) => ({
      insideCandidateRoot: el.closest("[data-candidate-root]") !== null,
      insideTokenScope: el.closest(".undrr-tokens") !== null,
      backgroundColor: getComputedStyle(el).backgroundColor,
    }));
    writeJson("test-results/app-datepicker-placement.json", placement);

    expect(placement.insideCandidateRoot).toBe(true);
    expect(placement.insideTokenScope).toBe(true);
    // Carbon's stock layer-01 grey. Seeing it here would mean the calendar lost
    // the token scope and is rendering off-brand rather than invisible.
    expect(placement.backgroundColor).not.toBe("rgb(244, 244, 244)");

    await page.keyboard.press("Escape");

    // Then the filter itself, typed rather than clicked: flatpickr's input format
    // is a printf-style pattern (`d/m/Y`), not an `Intl` format, so there is no way
    // to make it render "15 Jun 2026" in English and "15 juin 2026" in French —
    // you pick one pattern for every locale. Typing is also the path a keyboard
    // user takes.
    await input.fill("01/01/2024");
    await input.press("Enter");

    await expect(page.locator(ROOT)).not.toContainText("250 / 250");
    await expect(page.locator(ROOT)).toContainText("/ 250");

    // The exact boundary, in the runner's pinned UTC. 19 fixture rows have an
    // eventDate on or after 2026-01-01; 20 have one on or after 2025-12-31. The
    // non-UTC counterpart of this assertion is the describe block below, and the
    // difference between those two numbers is the whole bug it catches.
    await input.fill("01/01/2026");
    await input.press("Enter");
    await expect(page.locator(ROOT)).toContainText("19 / 250");
  });

  /**
   * THE TIMEZONE REGRESSION, which needs its own browser context.
   *
   * `packages/test-harness/src/playwright.config.ts` pins `timezoneId: "UTC"` for
   * every project, for good reasons — the fixture "today" is fixed and formatted
   * output must not depend on the runner. The side effect is that an entire class of
   * date bug is unreachable from this suite, and delta-carbon shipped one:
   * `AppView.tsx` read the date filter's boundary with
   * `fromDate.toISOString().slice(0, 10)`, and flatpickr hands back a LOCAL-midnight
   * `Date`, so at any positive UTC offset the boundary moved back one calendar day.
   * Invisible at UTC. Wrong for every user east of Greenwich.
   *
   * `test.use({ timezoneId })` overrides the context for this block only, so the
   * rest of the suite keeps its determinism. Australia/Sydney is UTC+10/+11 —
   * 1 January 2026 local midnight is 31 December 2025 13:00Z, which is exactly the
   * shift that produced the wrong answer.
   */
  test.describe("date filtering outside UTC", () => {
    test.use({ timezoneId: "Australia/Sydney" });

    test("uses the calendar day the user picked, not its UTC equivalent", async ({ page }) => {
      await page.goto(`${URL}?candidate=on`);

      const input = page.locator("#app-from-date");
      await input.fill("01/01/2026");
      await input.press("Enter");

      /*
       * 19 fixture rows have `eventDate >= "2026-01-01"`. 20 have
       * `eventDate >= "2025-12-31"`. The one row dated 2025-12-31 is the entire
       * discriminator: with the bug this reads "20 / 250", and Carbon's own
       * pagination footer agrees with it, so the screen is internally consistent and
       * quietly wrong.
       */
      await expect(page.locator(ROOT)).toContainText("19 / 250");
      await expect(page.locator(PAGINATION_COUNT)).toContainText("19");
    });
  });

  test("sorts by a column header", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const before = await firstCell.innerText();

    // The comparator is Carbon's, not ours — the counterpart of this test in the
    // MUI run exercises a hand-written comparator. Rows are handed to DataTable
    // holding RAW fixture values, which is what makes it correct.
    const header = page.locator(`${ROOT} thead th button`, { hasText: "Country" });
    await header.click();
    await expect(firstCell).toHaveText("Bangladesh");

    await header.click();
    await expect(firstCell).not.toHaveText("Bangladesh");

    writeJson("test-results/app-sort.json", { unsortedFirstCountry: before });
  });

  test("paginates the filtered result", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);
    await expect(page.locator(PAGINATION_COUNT)).toContainText("250");

    const firstCell = page.locator(`${ROOT} tbody tr td`).first();
    const firstOnPageOne = await firstCell.innerText();

    await page.locator(`${ROOT}`).getByRole("button", { name: "Next page" }).click();
    await expect(page.locator(`${ROOT} tbody tr`)).toHaveCount(10);
    expect(await firstCell.innerText(), "page two shows page one's first row").not.toBe(
      firstOnPageOne,
    );

    await page.locator(`${ROOT}`).getByRole("button", { name: "Previous page" }).click();
    await expect(firstCell).toHaveText(firstOnPageOne);
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
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator(".cds--modal.is-visible")).toHaveCount(0);
    await expect(page.locator(ROOT)).toContainText("250 / 250");

    // Confirming removes exactly one record.
    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(page.locator(".cds--modal.is-visible")).toHaveCount(0);
    await expect(page.locator(ROOT)).toContainText("249 / 250");
  });

  test("closes the delete dialog on Escape and restores focus", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);

    const trigger = deleteButton(page);
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".cds--modal.is-visible")).toHaveCount(0);
    // Restoration is opt-in via `launcherButtonRef`; this asserts we opted in. A
    // records screen full of row actions is where losing focus hurts most.
    await expect(trigger).toBeFocused();
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "ar");

    // The frame root is what carries it: the host chrome flips with the candidate
    // rather than the candidate flipping alone inside an LTR page. The candidate
    // wrapper deliberately does not repeat the attribute — Carbon is authored in
    // logical properties and inherits direction.
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    // Assert a Carbon component INTERNAL actually mirrored, not just the
    // container. Carbon's Pagination is a flex row whose `__left` block holds the
    // page-size select and the item count; in RTL that block belongs at the
    // physical right, and it gets there through logical properties alone — no
    // provider, no theme rebuild, no RTL plugin.
    const mirrored = await page.locator(`${ROOT} .cds--pagination__left`).first().evaluate((el) => {
      const parent = el.parentElement;
      if (!parent) return null;
      return {
        elementLeft: el.getBoundingClientRect().left,
        parentLeft: parent.getBoundingClientRect().left,
        parentRight: parent.getBoundingClientRect().right,
        elementRight: el.getBoundingClientRect().right,
      };
    });
    // In RTL the pagination's "left" block sits at the physical RIGHT of its row.
    expect(mirrored).not.toBeNull();
    if (mirrored) {
      expect(
        mirrored.parentRight - mirrored.elementRight,
        "Carbon's pagination row did not mirror",
      ).toBeLessThan(mirrored.elementLeft - mirrored.parentLeft);
    }
  });

  /**
   * The flatpickr RTL defect, measured rather than described.
   *
   * Carbon's own components mirror correctly because they are authored with
   * logical properties. `DatePicker` is the exception: it wraps flatpickr, a
   * third-party non-React widget, and Carbon's stylesheet declares
   *
   *     .flatpickr-calendar { direction: ltr; }
   *
   * unconditionally — not `dir`-scoped, not behind a flag. The month arrows carry a
   * `/*rtl: scale(-1,1)*\/` hint for the postcss RTL plugin Carbon uses to build a
   * mirrored stylesheet, but `@carbon/styles/css/` ships only `styles.css` and
   * `styles.min.css`: there is no RTL build to load.
   *
   * So in Arabic the whole screen mirrors and the date filter's calendar does not.
   * ASSERTED as a defect, deliberately, so the day Carbon fixes it this test fails
   * and the evidence gets revisited rather than quietly going stale.
   */
  test("RTL leaves the flatpickr calendar unmirrored", async ({ page }) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "ar");

    await page.locator("#app-from-date").click();
    const calendar = page.locator(".flatpickr-calendar.open");
    await expect(calendar).toBeVisible();

    const measurement = await calendar.evaluate((el) => {
      const prev = el.querySelector(".flatpickr-prev-month");
      const next = el.querySelector(".flatpickr-next-month");
      const host = el.closest("[data-candidate-root]");
      return {
        calendarDirection: getComputedStyle(el).direction,
        pageDirection: host ? getComputedStyle(host).direction : "",
        prevLeft: prev ? Math.round(prev.getBoundingClientRect().left) : null,
        nextLeft: next ? Math.round(next.getBoundingClientRect().left) : null,
      };
    });

    writeJson("test-results/app-rtl-flatpickr.json", {
      ...measurement,
      note:
        "Carbon's stylesheet sets `.flatpickr-calendar { direction: ltr }` " +
        "unconditionally and ships no RTL build, so the calendar keeps its LTR " +
        "layout inside an otherwise mirrored screen. Every Carbon-authored " +
        "component on this page mirrors correctly.",
    });

    expect(measurement.pageDirection, "the candidate region did not flip to RTL").toBe("rtl");
    expect(
      measurement.calendarDirection,
      "flatpickr's calendar now mirrors; re-measure and update evidence.json.rtl",
    ).toBe("ltr");
    // Previous-month arrow still on the physical left, i.e. unmirrored.
    expect(measurement.prevLeft).not.toBeNull();
    expect(measurement.nextLeft).not.toBeNull();
    if (measurement.prevLeft !== null && measurement.nextLeft !== null) {
      expect(measurement.prevLeft).toBeLessThan(measurement.nextLeft);
    }

    await page.keyboard.press("Escape");
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
        `[${scoped.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "none"}] | ` +
        `whole page: ${wholePage.counts.violations} violations ` +
        `[${wholePage.violations.map((v) => v.id).join(", ") || "none"}]`,
    );

    await testInfo.attach("axe-app-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });

    /*
     * The TOTAL is recorded, not asserted against zero: claiming conformance is
     * forbidden by the brief and the number is the output. But the total is written
     * to disk and to evidence.json, so `expect(total).toBeGreaterThanOrEqual(0)` —
     * which is what stood here — recorded nothing and could not fail.
     *
     * What IS asserted is the shape of the result, all three parts falsifiable:
     *   - the `include` selector matched something, because a scope that matches
     *     nothing produces a clean result and is the failure mode that makes an axe
     *     suite worthless. `AxeResult` carries no tested-node count, so this is
     *     asserted on the locator instead;
     *   - no CRITICAL violations in the candidate subtree, the same bar every
     *     sibling pairing's app spec holds;
     *   - none on the whole page either, so a violation cannot hide by sitting just
     *     outside the scope.
     */
    await expect(page.locator("[data-candidate-root]")).toHaveCount(1);
    expect(
      scoped.counts.critical,
      `CRITICAL axe violations in the application view: ${scoped.violations
        .filter((v) => v.impact === "critical")
        .map((v) => `${v.id} (${v.nodes.join(", ")})`)
        .join("; ")}`,
    ).toBe(0);
    expect(
      wholePage.counts.critical,
      `CRITICAL axe violations on the whole application page: ${wholePage.violations
        .filter((v) => v.impact === "critical")
        .map((v) => `${v.id} (${v.nodes.join(", ")})`)
        .join("; ")}`,
    ).toBe(0);
  });

  test("axe on the open delete dialog", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await deleteButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    /*
     * Carbon's Modal does NOT animate opacity on its container — it toggles
     * `is-visible` and transitions `opacity` on `.cds--modal` from 0 to 1 — so the
     * mid-transition contrast artefact the MUI run documented applies here too.
     * Waiting for the overlay's opacity to settle before scanning is what keeps
     * the measurement honest; without it axe blends the modal against the
     * translucent overlay and reports contrast failures that vanish on a rerun.
     */
    await expect(page.locator(".cds--modal.is-visible")).toHaveCSS("opacity", "1");

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
        `[${result.violations.map((v) => v.id).join(", ") || "none"}]`,
    );

    await testInfo.attach("axe-app-delete-dialog.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    /*
     * Same repair as above: `toBeGreaterThanOrEqual(0)` stood here and could not
     * fail. The dialog is the highest-stakes scan in the suite — it is modal, it
     * traps focus, and a critical violation in it makes the delete flow unusable —
     * so it gets the same zero-critical bar every sibling pairing asserts, plus a
     * check that the scope matched a dialog at all.
     */
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(
      result.counts.critical,
      `CRITICAL axe violations in the open delete dialog: ${result.violations
        .filter((v) => v.impact === "critical")
        .map((v) => `${v.id} (${v.nodes.join(", ")})`)
        .join("; ")}`,
    ).toBe(0);
  });

  test("screenshots", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await captureScreens(page, "app-00-full-page", testInfo);

    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-records", testInfo, { fullPage: false });

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(page.locator("#records-filters")).toHaveCount(0);
    await captureScreens(page, "app-02-filters-collapsed", testInfo, { fullPage: false });

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await deleteButton(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await captureScreens(page, "app-03-delete-dialog", testInfo, { fullPage: false });
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "ar");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "app-00-full-page", testInfo, { rtl: true });
    await page.locator(ROOT).scrollIntoViewIfNeeded();
    await captureScreens(page, "app-01-records", testInfo, { rtl: true, fullPage: false });

    // The unmirrored calendar, captured next to a mirrored screen.
    await page.locator("#app-from-date").click();
    await expect(page.locator(".flatpickr-calendar.open")).toBeVisible();
    await captureScreens(page, "app-02-calendar", testInfo, { rtl: true, fullPage: false });
    await page.keyboard.press("Escape");

    // `"ar"`, because the row actions' accessible names come from the fixture
    // labels and are localised with the rest of the screen.
    await deleteButton(page, "ar").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await captureScreens(page, "app-03-delete-dialog", testInfo, { rtl: true, fullPage: false });
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto(`${URL}?candidate=on`);
    await selectLocale(page, "de");

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
