/**
 * Evidence run for delta-carbon.
 *
 * Mirrors the mangrove-react-aria and delta-mui specs so the three are
 * comparable, and adds one measurement neither of them needs: the
 * `globalCssLeakage` test loads Carbon's PREBUILT global stylesheet and diffs
 * the host canaries against it. That is the central finding of this pairing, and
 * describing it from reading the CSS would not have been evidence.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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

const SECTIONS = [
  { id: "section-1", name: "01-forms" },
  { id: "section-2", name: "02-selection" },
  { id: "section-3", name: "03-dates" },
  { id: "section-4", name: "04-overlays" },
  { id: "section-5", name: "05-chrome" },
  { id: "section-6", name: "06-data-table" },
  { id: "section-7", name: "07-states" },
  { id: "section-9", name: "09-side-by-side" },
] as const;

/** The UNDRR surface token, which every themed Carbon overlay must resolve to. */
const TOKEN_SURFACE = "rgb(255, 255, 255)";
/** Carbon's own white-theme field grey, i.e. what an UNTHEMED overlay shows. */
const CARBON_DEFAULT_FIELD = "rgb(244, 244, 244)";
/** --undrr-color-text-primary, which the theme maps onto --cds-background-inverse. */
const TOKEN_INVERSE_SURFACE = "rgb(20, 35, 46)";
/** Carbon's stock white-theme background-inverse. */
const CARBON_DEFAULT_INVERSE = "rgb(57, 57, 57)";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Carbon's ContentSwitcher renders each Switch as a button; `data-locale` is
 * passed through, which is more stable than matching the Arabic label text.
 */
async function selectLocale(page: Page, code: string): Promise<void> {
  await page.locator(`[data-locale="${code}"]`).click();
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

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  /**
   * Guards a trap that silently blanked this section once already: Carbon's
   * `useNormalizedInputProps` computes `invalid: !readOnly && !disabled && invalid`,
   * so `readOnly` suppresses both `invalid` and `warn` with no warning. Asserting
   * the rendered messages rather than the props means a regression fails here.
   */
  test("renders all four validation states with visible messages", async ({ page }) => {
    await page.goto("/?candidate=on");

    await expect(page.locator("#form-required-error-msg")).toHaveText("This field is required");
    await expect(page.locator("#form-format-error-msg")).toHaveText(
      "Enter a valid ISO 8601 date",
    );
    // The out-of-range case uses Carbon's second `warn` tier, not `invalid`.
    await expect(page.locator("#form-range-warn-msg")).toHaveText(
      "Enter a value between 0 and 1,000,000",
    );

    // server-rejected: our state, surfaced through Carbon's invalid channel plus
    // an InlineNotification.
    await expect(page.locator("#form-server-error-msg")).toHaveCount(0);
    await page.locator("#server-form button[type=submit]").click();
    await expect(page.locator("#form-server-error-msg")).toHaveText(
      "The server rejected this submission",
    );
    await expect(page.locator("#server-form .cds--inline-notification--error")).toBeVisible();
  });

  test("renders the 250-row table with pagination and a page-size control", async ({
    page,
  }, testInfo) => {
    await page.goto("/?candidate=on");

    // Carbon's Pagination reports the range and the total.
    await expect(page.locator("#section-6 .cds--pagination")).toContainText("250");
    // Ten rows on the first page: the slice is ours, so assert it worked.
    await expect(page.locator("#section-6 .cds--data-table tbody tr")).toHaveCount(10);
    // The page-size select is Carbon's own and is always in the DOM.
    const pageSizeSelect = page.locator("#section-6 .cds--pagination select").first();
    await expect(pageSizeSelect).toHaveCount(1);

    // FINDING, asserted rather than described: Carbon HIDES the items-per-page
    // control on a narrow container. `@container pagination (max-width: 42rem)`
    // sets `display: none` on `.cds--pagination__left > *`, so at the 390px
    // viewport the user cannot change the page size at all. That is Carbon's
    // deliberate responsive behaviour, not a defect in this demo, and it is a
    // real accessibility/usability consideration for a mobile data review tool.
    const visible = await pageSizeSelect.isVisible();
    if (testInfo.project.name === "mobile") {
      expect(visible, "Carbon still hides the page-size control at 390px").toBe(false);
    } else {
      expect(visible).toBe(true);
    }
  });

  test("sorts, filters and select-alls the table", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Sort on the integer column: Carbon's default comparator, not ours.
    const header = page.locator("#section-6 th.cds--table-sort__header button").nth(4);
    await header.click();
    await expect(page.locator("#section-6 th[aria-sort='ascending']")).toHaveCount(1);

    // Filter: TableToolbarSearch + onInputChange.
    await page.locator("#section-6 .cds--search-input").fill("Flood");
    await expect(page.locator("#section-6 .cds--pagination")).not.toContainText("250");

    // Select-all in the header selects every filtered row, including rows on
    // pages that are not rendered — so compare against the rendered row count.
    await page.locator("#section-6 th .cds--checkbox-label").first().click();
    const rowCount = await page.locator("#section-6 .cds--data-table tbody tr").count();
    expect(rowCount).toBeGreaterThan(0);
    await expect(page.locator("#section-6 tbody input[type=checkbox]:checked")).toHaveCount(
      rowCount,
    );
    // Carbon's own batch-action bar appears with the selection count.
    await expect(page.locator("#section-6 .cds--batch-actions--active")).toBeVisible();
  });

  test("reorders a table column, which Carbon cannot do natively", async ({ page }) => {
    await page.goto("/?candidate=on");

    const firstHeader = page.locator("#section-6 .cds--data-table thead th").nth(1);
    const before = (await firstHeader.textContent())?.trim();

    await page.getByRole("button", { name: /^Move Hazard type earlier$/ }).click();

    const after = (await firstHeader.textContent())?.trim();
    expect(after).not.toBe(before);
    // textContent includes Carbon's screen-reader-only sort instruction, so
    // match on containment rather than equality.
    expect(after).toContain("Hazard type");
    expect(before).toContain("Country");
  });

  test("composes a date-time range from a range DatePicker and two TimePickers", async ({
    page,
  }) => {
    await page.goto("/?candidate=on");

    // Five text inputs in section 3: one single date, two range dates, two
    // times. That count IS the finding: Carbon gives a native date RANGE but no
    // date-time range, so time arrives as two unrelated fields.
    // (`input[type=text]` excludes flatpickr's year spinners, which are
    // `type=number` and live inside the calendars.)
    await expect(page.locator("#section-3 input[type=text]")).toHaveCount(5);
    await expect(page.locator("#section-3 #range-start-time")).toHaveValue("00:00");
    await expect(page.locator("#section-3 #range-end-time")).toHaveValue("23:59");

    // The derived summary is application code: Carbon renders no range summary.
    await expect(page.locator("#section-3 .cds--inline-notification")).toContainText("days");

    // An end time before the start time on the same day is caught by OUR check,
    // not by the library: flatpickr's minDate only guards the DATE.
    await page.locator("#section-3 #range-start-time").fill("bad");
    await expect(page.locator("#section-3 .cds--inline-notification--error")).toHaveCount(1);
  });

  test("keeps the flatpickr calendar inside the token scope and themed", async ({ page }) => {
    await page.goto("/?candidate=on");

    await page.locator("#event-date").click();
    const calendar = page.locator(".flatpickr-calendar.open");
    await expect(calendar).toBeVisible();

    // Carbon's DatePicker appends flatpickr's calendar to document.body unless
    // `appendTo` says otherwise. Assert the reparenting worked.
    const inSubtree = await calendar.evaluate(
      (element) => element.closest("[data-candidate-root]") !== null,
    );
    expect(inSubtree, "flatpickr calendar escaped the candidate subtree").toBe(true);

    // And that it therefore sees the tokens rather than Carbon's defaults.
    const day = calendar.locator(".flatpickr-day.selected").first();
    const dayColour = await day.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(dayColour).not.toBe("rgba(0, 0, 0, 0)");
    // Carbon's untouched white theme would paint the field grey here.
    expect(dayColour).not.toBe(CARBON_DEFAULT_FIELD);
  });

  test("traps and restores focus in the modal, and the modal is themed", async ({ page }) => {
    await page.goto("/?candidate=on");

    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();

    const dialog = page.locator(".cds--modal-container");
    await expect(dialog).toBeVisible();

    // Carbon renders the modal in place rather than portalling, so the token
    // scope reaches it by inheritance. Assert appearance, not just behaviour.
    const background = await dialog.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(background).toBe(TOKEN_SURFACE);

    await page.keyboard.press("Escape");
    await expect(page.locator(".cds--modal.is-visible")).toHaveCount(0);
    // launcherButtonRef restores focus to the trigger.
    await expect(trigger).toBeFocused();
  });

  test("opens the toggletip on click and it is themed", async ({ page }) => {
    await page.goto("/?candidate=on");

    await page.getByRole("button", { name: "Open popover" }).click();
    // The painted surface is `.cds--popover-content`; `.cds--toggletip-content`
    // is a transparent inner wrapper.
    const content = page.locator("#section-4 .cds--toggletip .cds--popover-content");
    await expect(content).toBeVisible();

    // Carbon's Toggletip is high-contrast by default, so this must resolve to the
    // token INVERSE surface. Both halves matter: not transparent (the React Aria
    // failure mode) and not Carbon's stock grey (the unthemed failure mode).
    const background = await content.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
    expect(background).not.toBe(CARBON_DEFAULT_INVERSE);
    expect(background).toBe(TOKEN_INVERSE_SURFACE);

    // Dismiss on outside click, which Carbon's Toggletip owns.
    await page.locator("#section-4 h3").click();
    await expect(content).toBeHidden();
  });

  test("shows the tooltip on keyboard focus", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Targeted by test id, not by accessible name: Carbon's Tooltip `label` prop
    // sets `aria-labelledby` on the trigger, which REPLACES the trigger's own
    // accessible name with the tooltip text. Recorded in EVIDENCE.md.
    const trigger = page.getByTestId("tooltip-trigger");
    await expect(trigger).toHaveAttribute("aria-labelledby", /tooltip-/);
    await trigger.focus();
    await expect(page.locator("#section-4 .cds--tooltip.cds--popover--open")).toHaveCount(1);
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });
    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Carbon:\n${JSON.stringify(
        result.differences,
        null,
        2,
      )}`,
    ).toEqual([]);

    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  /**
   * THE CENTRAL MEASUREMENT OF THIS RUN.
   *
   * `checkLeakage` cannot express this, because it toggles only `candidate` and
   * would carry `globalcss` into both snapshots, where the stylesheet would
   * cancel out. So the two snapshots are taken here:
   *
   *   baseline  ?candidate=off              host only
   *   probe     ?candidate=on&globalcss=on  host + Carbon's prebuilt styles.css
   *
   * The differences are written to test-results/leakage-carbon-global-css.json
   * and reproduced in EVIDENCE.md. This test does NOT assert zero differences:
   * it asserts that there ARE differences, because the whole point is to record
   * how much the documented import costs. If a future Carbon release drops the
   * reset, this test fails loudly and the finding gets revisited.
   */
  test("measures what Carbon's prebuilt global stylesheet does to the host", async ({
    page,
  }, testInfo) => {
    await page.goto("/?candidate=off");
    const before = await snapshotCanaries(page);
    expect(Object.keys(before).length).toBe(CANARY_IDS.length);

    await page.goto("/?candidate=on&globalcss=on");
    const after = await snapshotCanaries(page);

    const differences = diffSnapshots(before, after);
    const canariesAffected = [...new Set(differences.map((entry) => entry.canary))].sort();
    const propertiesAffected = [...new Set(differences.map((entry) => entry.property))].sort();

    const result = {
      stylesheet: "@carbon/styles/css/styles.css",
      canariesChecked: Object.keys(before).length,
      canariesAffected,
      propertiesAffected,
      differenceCount: differences.length,
      differences,
    };

    writeJson("test-results/leakage-carbon-global-css.json", result);
    await testInfo.attach("leakage-carbon-global-css.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    // eslint-disable-next-line no-console
    console.log(
      `carbon global css: ${String(differences.length)} canary differences across ` +
        `${String(canariesAffected.length)} of ${String(CANARY_IDS.length)} canaries`,
    );

    expect(
      differences.length,
      "Carbon's prebuilt styles.css no longer changes the host canaries — " +
        "the reset finding in EVIDENCE.md needs revisiting",
    ).toBeGreaterThan(0);
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "ar");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    // Carbon is authored with logical properties, so its own internals flip with
    // the ancestor `dir` alone — no provider, no theme rebuild, no RTL plugin,
    // no stylis plugin. Assert a component INTERNAL actually mirrored: the
    // accordion heading's chevron padding is `padding-inline-end`.
    const rtlPadding = await page
      .locator("#section-4 .cds--accordion__heading")
      .first()
      .evaluate((el) => {
        const style = window.getComputedStyle(el);
        return { left: style.paddingLeft, right: style.paddingRight };
      });
    expect(rtlPadding.left).toBe("16px");
    expect(rtlPadding.right).toBe("0px");

    await page.goto("/?candidate=on");
    const ltrPadding = await page
      .locator("#section-4 .cds--accordion__heading")
      .first()
      .evaluate((el) => {
        const style = window.getComputedStyle(el);
        return { left: style.paddingLeft, right: style.paddingRight };
      });
    expect(ltrPadding.left).toBe("0px");
    expect(ltrPadding.right).toBe("16px");
  });

  test("axe per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    for (const section of SECTIONS) {
      const result = await runAxe(page, { section: section.name, include: `#${section.id}` });
      writeJson(`test-results/axe-${section.name}.json`, result);
      // eslint-disable-next-line no-console
      console.log(
        `axe ${section.name}: ${String(result.counts.violations)} violations ` +
          `(${String(result.counts.critical)} critical, ${String(result.counts.serious)} serious), ` +
          `${String(result.counts.incomplete)} incomplete`,
      );
    }

    const scoped = await runAxe(page, {
      section: "candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-candidate-subtree.json", scoped);

    const wholePage = await runAxe(page, { section: "whole-page" });
    writeJson("test-results/axe-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe scoped: ${String(scoped.counts.violations)} violations | ` +
        `whole page: ${String(wholePage.counts.violations)} violations`,
    );

    await testInfo.attach("axe-summary.json", {
      body: JSON.stringify({ scoped, wholePage }, null, 2),
      contentType: "application/json",
    });
  });

  test("screenshots per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await captureScreens(page, "00-full-page", testInfo);
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { fullPage: false });
    }
  });

  test("screenshots in RTL", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "ar");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "de");

    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    writeJson(`test-results/long-labels-${testInfo.project.name}.json`, {
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${String(overflow)}px in German at ${
        testInfo.project.name
      }`,
    ).toBeLessThanOrEqual(1);
  });
});
