/**
 * Evidence run for mangrove-carbon.
 *
 * Produces the artefacts Brief 1 requires: per-section axe JSON, screenshots at
 * three viewports plus an RTL set, and the leakage result. It deliberately does
 * NOT assert zero axe violations, because claiming conformance is forbidden and
 * the numbers are the output rather than the pass criterion.
 *
 * This pairing carries two extra measurements the other runs did not need,
 * because it is the only one where the host and the candidate both ship a large
 * global stylesheet:
 *
 *   1. Leakage is measured TWICE — once with Carbon's documented global
 *      stylesheet and once with the scoped-CSS experiment — so the cost of
 *      containment is a number rather than an opinion.
 *   2. Collisions are measured in the OTHER direction as well: which of the
 *      host's element-level rules land on Carbon-rendered elements. The leakage
 *      assertion is blind to that, and it is half the story here.
 *
 * The global-CSS leakage assertion FAILS. It is left failing on purpose. See
 * EVIDENCE.md.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";

/** Kitchen-sink sections, in the fixed order the brief mandates. */
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

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Clicks a locale.
 *
 * Carbon's `RadioButton` renders a real `<input type="radio">` visually hidden
 * behind a `<label for=...>`, so the label is the reliable click target: a forced
 * click on the input itself lands on whatever covers it, which worked at 1440px
 * and silently did nothing at 390px. Same class of testing-ergonomics cost the
 * React Aria run recorded for its own radio group.
 */
async function selectLocale(page: Page, code: string): Promise<void> {
  const label = page.locator(`label[for="locale-${code}"]`);
  await label.scrollIntoViewIfNeeded();
  await label.click();
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  /**
   * The accessibility patches this demo adds ON TOP of Carbon, asserted one by one.
   *
   * Every item is a place where Carbon renders something that looks right and is not
   * announced, and where the patch is a single attribute that is easy to lose in a
   * refactor and impossible to see in a screenshot. Two of them HAD been lost in the
   * delta-carbon twin — `aria-current` on one of its two `SideNav`s, and the
   * skeleton's `aria-label` here — which is why they are asserted directly rather
   * than left to the axe totals.
   */
  test("carries the accessibility patches Carbon does not supply", async ({ page }) => {
    await page.goto("/?candidate=on");

    // 1. `aria-describedby` on every invalid field. Carbon sets `aria-errormessage`
    //    at a div with no announcement technique and offers no prop for this.
    for (const id of ["forms-required", "forms-format", "forms-range"]) {
      await expect(page.locator(`#${id}`)).toHaveAttribute(
        "aria-describedby",
        `${id}-error-msg`,
      );
    }

    // 2. `aria-current` on the active SideNavLink. Carbon's `isActive` only paints a
    //    class — `SideNavLink.js` emits no `aria-current` at all.
    await expect(page.locator('#section-5 a[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('#section-9 a[aria-current="page"]')).toHaveCount(1);

    // 3. `aria-pressed` on the state-toggle groups. Carbon's `kind` swap is colour
    //    only; nothing else says which of the four buttons is active.
    await expect(page.locator('#section-7 button[aria-pressed="true"]')).toHaveCount(2);
    await expect(page.locator('#section-7 button[aria-pressed="false"]')).toHaveCount(6);

    // 4. The loading skeleton is named. Carbon renders an unnamed block of grey bars.
    //    `...rest` lands on the inner `<table>` (DataTableSkeleton.js:51-53), not on
    //    the container, so the label names the table — which is what you want, but
    //    the selector has to know.
    await page.locator("#section-7 button", { hasText: "table: loading" }).click();
    await expect(page.locator("#section-7 table.cds--skeleton")).toHaveAttribute(
      "aria-label",
      "Loading records",
    );
  });

  test("renders all 250 fixture rows behind Carbon's pagination", async ({ page }) => {
    await page.goto("/?candidate=on");
    // TableContainer's description reports the filtered total.
    await expect(page.locator("#section-6 .cds--data-table-header__description")).toContainText(
      "250 / 250",
    );
    // Carbon's Pagination reports the range it is showing out of the total.
    await expect(page.locator("#section-6 .cds--pagination__items-count")).toContainText("250");
  });

  test("sorts, filters and selects in the data table", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Filter: Carbon's own predicate over every cell value. TableToolbarSearch
    // renders input[type=search], not text.
    const search = page.locator("#section-6 input[type='search']").first();
    await search.fill("Bangladesh");
    await expect(
      page.locator("#section-6 .cds--data-table-header__description"),
    ).not.toContainText("250 / 250");
    await search.fill("");

    // Sort: Carbon's comparator, over RAW fixture values.
    const numericHeader = page.locator("#section-6 th button", {
      hasText: "People affected",
    });
    await numericHeader.click();
    const firstAsc = await page
      .locator("#section-6 tbody tr td")
      .nth(4)
      .innerText();
    await numericHeader.click();
    const firstDesc = await page
      .locator("#section-6 tbody tr td")
      .nth(4)
      .innerText();
    expect(firstAsc, "ascending and descending produced the same first row").not.toBe(
      firstDesc,
    );

    // Select all: covers every filtered row, not just the visible page. Carbon's
    // checkbox input is visually hidden behind its label, so click it forcibly
    // rather than using `check()`, which refuses invisible elements.
    await page.locator("#section-6 thead input[type='checkbox']").first().click({ force: true });
    await expect(
      page.locator("#section-6 .cds--data-table-header__description"),
    ).toContainText("250 selected");
  });

  test("reorders columns with the keyboard", async ({ page }) => {
    // Custom behaviour: Carbon ships neither column resize nor reorder.
    await page.goto("/?candidate=on");

    const headers = page.locator("#section-6 thead th");
    const before = await headers.nth(2).innerText();

    await headers.nth(1).locator("button").focus();
    await page.keyboard.press("Control+Shift+ArrowRight");

    await expect(headers.nth(2)).toHaveText(before.trim() === "" ? /./ : /.+/);
    const after = await headers.nth(2).innerText();
    expect(after, "column order did not change").not.toBe(before);
  });

  test("composes a date-time range from a range calendar plus two time fields", async ({
    page,
  }) => {
    await page.goto("/?candidate=on");

    // Two date inputs from ONE native range calendar, plus two separate
    // TimePickers. That shape is the finding: Carbon has no date-time range.
    await expect(page.locator("#section-3 .cds--date-picker__input")).toHaveCount(3);
    await expect(page.locator("#section-3 #range-start-time")).toHaveValue("00:00");
    await expect(page.locator("#section-3 #range-end-time")).toHaveValue("23:59");

    // The derived duration is application code; a native range component would
    // have produced it.
    await expect(page.locator("#section-3 #range-summary")).toContainText("45 days");
  });

  test("the native date range highlights the intervening days", async ({ page }) => {
    await page.goto("/?candidate=on");

    await page.locator("#range-start-date").click();
    await page
      .locator(
        ".flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)",
        { hasText: /^20$/ },
      )
      .first()
      .click();

    // One calendar, both endpoints, days between them marked. This is what MUI's
    // community tier cannot do without a paid licence, and Carbon can.
    await expect(page.locator("#range-start-date")).toHaveValue("2026-05-20");
    await expect(page.locator("#range-end-date")).toHaveValue("2026-06-15");
    expect(
      await page.locator(".flatpickr-day.inRange").count(),
      "no intervening days highlighted",
    ).toBeGreaterThan(0);
  });

  /**
   * THE TIMEZONE REGRESSION, which needs its own browser context.
   *
   * `packages/test-harness/src/playwright.config.ts` pins `timezoneId: "UTC"` for
   * every project, for good reasons — the fixture "today" is fixed and formatted
   * output must not depend on the runner. The side effect is that an entire class of
   * date bug is unreachable from this suite, and this section shipped one:
   * `SectionDates.tsx` read flatpickr's chosen dates with
   * `.toISOString().slice(0, 10)`, and flatpickr builds every date it reports at
   * LOCAL midnight, so at any positive UTC offset the stored day was one behind the
   * day the user clicked. Invisible at UTC. Wrong for every user east of Greenwich.
   *
   * The tell is that the two halves DISAGREE: flatpickr formats the input itself, so
   * the input showed the right date while the derived summary — and the
   * end-before-start comparison — used the wrong one. Both are asserted below, and
   * the input assertion is what makes the failure diagnosable rather than mysterious.
   *
   * `test.use({ timezoneId })` scopes the override to this block, so the rest of the
   * suite keeps its determinism.
   */
  test.describe("date selection outside UTC", () => {
    test.use({ timezoneId: "Australia/Sydney" });

    test("derives the range from the calendar day the user clicked", async ({ page }) => {
      await page.goto("/?candidate=on");

      await page.locator("#range-start-date").click();
      await page
        .locator(
          ".flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)",
          { hasText: /^20$/ },
        )
        .first()
        .click();

      // flatpickr's own formatting, which was never wrong.
      await expect(page.locator("#range-start-date")).toHaveValue("2026-05-20");

      // Our derived value, which was. With the bug this reads "19 May 2026".
      await expect(page.locator("#section-3 #range-summary")).toContainText("20 May 2026");
      await expect(page.locator("#section-3 #range-summary")).not.toContainText("19 May 2026");
    });
  });

  test("validates an inverted range with the VALIDATION_CASES treatment", async ({ page }) => {
    await page.goto("/?candidate=on");

    // flatpickr will not let the calendar produce an end before a start, so the
    // only way to invert is through the times — which is exactly the gap a real
    // date-time range component would close. Collapse to a single day first.
    await page.locator("#range-start-date").click();
    const next = page.locator(".flatpickr-calendar.open .flatpickr-next-month");
    await next.click();
    await next.click();
    await page
      .locator(
        ".flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)",
        { hasText: /^10$/ },
      )
      .first()
      .click();
    await expect(page.locator("#range-start-date")).toHaveValue("2026-07-10");
    await expect(page.locator("#range-end-date")).toHaveValue("2026-07-10");

    await page.locator("#range-start-time").fill("18:00");
    await page.locator("#range-end-time").fill("06:00");

    await expect(page.locator("#section-3 .cds--inline-notification--error")).toBeVisible();
  });

  test("opens the range calendar inside the candidate subtree", async ({ page }) => {
    // flatpickr appends to document.body by default. `appendTo` keeps it inside
    // .demo, which is what makes the tokens reach it.
    await page.goto("/?candidate=on");

    await page.locator("#range-start-date").click();
    const calendar = page.locator(".flatpickr-calendar.open");
    await expect(calendar).toBeVisible();

    const inside = await calendar.evaluate(
      (el) => el.closest("[data-candidate-root]") !== null,
    );
    expect(inside, "the calendar was appended outside the candidate subtree").toBe(true);

    await page.keyboard.press("Escape");
  });

  test("the popover dismisses on an outside click", async ({ page }) => {
    // The requirement is "click triggered, dismiss on outside click". Carbon's
    // Popover is a lower-level primitive than React Aria's DialogTrigger: `open`
    // is the consumer's state, and dismissal arrives as an `onRequestClose`
    // callback that Carbon fires from its own outside-click and Escape handling
    // when `isTabTip` is set. Asserted because "composed" here rests on Carbon
    // detecting the outside click, not on us writing a document listener.
    await page.goto("/?candidate=on");

    const trigger = page.getByRole("button", { name: "Open popover" });
    await trigger.click();
    await expect(page.locator(".demo-popover .cds--popover-content")).toBeVisible();

    // Somewhere unambiguously outside the popover and its trigger.
    await page.locator("#section-6 .cds--data-table-header__description").click();
    await expect(page.locator(".demo-popover .cds--popover-content")).toBeHidden();
  });

  test("traps and restores focus in the modal", async ({ page }) => {
    await page.goto("/?candidate=on");

    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".cds--modal.is-visible")).toHaveCount(0);
    // Restoration is opt-in via launcherButtonRef; this asserts we opted in.
    await expect(trigger).toBeFocused();
  });

  test("overlays: portalling and token reach, measured per type", async ({ page }) => {
    /*
     * The trap in docs/requirements.md, stated correctly: what matters is not how
     * a library is themed, it is whether any declaration that renders inside the
     * overlay resolves a `var()` declared OUTSIDE the overlay's ancestor chain.
     * Tokens here are scoped to `.undrr-tokens` on the candidate wrapper, so an
     * overlay appended to document.body leaves that chain.
     *
     * Carbon has two independent reasons it might survive, and they protect
     * against different things, so both are measured per overlay type:
     *
     *   1. Placement. Modal, Tooltip, Popover, Dropdown/ComboBox/MultiSelect
     *      menus and the Accordion all render in place — no createPortal
     *      anywhere in those components. flatpickr, which backs DatePicker, does
     *      append its calendar to document.body unless given `appendTo`.
     *   2. Fallbacks. Every colour in Carbon's stylesheet is written
     *      `var(--cds-x, #literal)`, so a Carbon overlay that DID escape the scope
     *      would still paint — it would just paint IBM's defaults instead of the
     *      UNDRR tokens, because the `--cds-*` overrides live on `.demo`. That is
     *      a silent theming failure rather than a silent invisibility failure, and
     *      the last case below demonstrates it by force.
     */
    await page.goto("/?candidate=on");

    type Measurement = {
      overlay: string;
      insideCandidateRoot: boolean;
      insideTokenScope: boolean;
      backgroundColor: string;
      undrrTokenResolves: boolean;
      cdsLayerResolves: boolean;
    };

    const measure = async (selector: string, label: string): Promise<Measurement> => {
      const overlay = page.locator(selector).first();
      await expect(overlay, label).toBeVisible();
      const result = await overlay.evaluate((el, name) => {
        const cs = getComputedStyle(el);
        return {
          overlay: name,
          insideCandidateRoot: el.closest("[data-candidate-root]") !== null,
          insideTokenScope: el.closest(".undrr-tokens") !== null,
          backgroundColor: cs.backgroundColor,
          undrrTokenResolves: cs.getPropertyValue("--undrr-color-surface").trim() !== "",
          cdsLayerResolves: cs.getPropertyValue("--cds-layer").trim() !== "",
        };
      }, label);
      return result;
    };

    const measurements: Measurement[] = [];

    await page.getByRole("button", { name: "Open popover" }).click();
    measurements.push(await measure(".demo-popover .cds--popover-content", "popover"));
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open modal" }).click();
    measurements.push(await measure(".cds--modal-container", "modal"));
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Hover or focus for tooltip" }).hover();
    measurements.push(await measure(".demo-tooltip .cds--popover-content", "tooltip"));
    await page.keyboard.press("Escape");

    // Every list box renders its <ul> up front and toggles `hidden`, so the
    // seven closed menus in this section all match the class. `:visible` picks
    // the one that is actually open.
    await page.locator("#section-2 #select-small").click();
    measurements.push(await measure("#section-2 .cds--list-box__menu:visible", "dropdown menu"));
    await page.keyboard.press("Escape");

    await page.locator("#section-2 #combobox-small").click();
    measurements.push(await measure("#section-2 .cds--list-box__menu:visible", "combobox menu"));
    await page.keyboard.press("Escape");

    await page.locator("#range-start-date").click();
    measurements.push(await measure(".flatpickr-calendar.open", "range calendar (appendTo)"));

    /*
     * The counterfactual, measured rather than argued: move the open calendar to
     * document.body, which is where flatpickr would have put it without
     * `appendTo`, and read it again. This is what a consumer who did not know
     * about `appendTo` would ship.
     */
    const portalled = await page.evaluate(() => {
      const calendar = document.querySelector(".flatpickr-calendar.open");
      if (!calendar) return null;
      document.body.append(calendar);
      const cs = getComputedStyle(calendar);
      return {
        overlay: "range calendar (forced onto document.body)",
        insideCandidateRoot: calendar.closest("[data-candidate-root]") !== null,
        insideTokenScope: calendar.closest(".undrr-tokens") !== null,
        backgroundColor: cs.backgroundColor,
        undrrTokenResolves: cs.getPropertyValue("--undrr-color-surface").trim() !== "",
        cdsLayerResolves: cs.getPropertyValue("--cds-layer").trim() !== "",
      };
    });
    if (portalled) measurements.push(portalled);

    writeJson("test-results/overlays.json", measurements);
    for (const m of measurements) {
      // eslint-disable-next-line no-console
      console.log(
        `overlay ${m.overlay}: inCandidate=${m.insideCandidateRoot} ` +
          `inTokenScope=${m.insideTokenScope} bg=${m.backgroundColor} ` +
          `undrrToken=${m.undrrTokenResolves} cdsLayer=${m.cdsLayerResolves}`,
      );
    }

    // Every overlay Carbon actually renders must be opaque and must sit inside
    // the token scope. The final forced case is evidence, not a requirement, so
    // it is excluded from the assertion.
    for (const m of measurements.filter((x) => !x.overlay.includes("forced"))) {
      expect(m.backgroundColor, `${m.overlay} background is transparent`).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
      expect(m.insideTokenScope, `${m.overlay} rendered outside the token scope`).toBe(true);
    }

    /*
     * The stronger assertion, and the one this pairing exists to make.
     *
     * "Not transparent" is the wrong test for Carbon. Because every declaration
     * is a fallback chain — `var(--cds-layer, #f4f4f4)` — an overlay that escapes
     * the token scope still paints. It paints IBM's stock White theme: grey
     * #f4f4f4 surfaces, IBM blue #0f62fe accents, square corners. Fully visible,
     * fully usable, silently off-brand, and much harder to notice than the
     * transparent popovers React Aria produced.
     *
     * The forced measurement above shows it: rgb(244, 244, 244) once outside
     * `.undrr-tokens`. So the contained calendar must be neither transparent NOR
     * that grey.
     */
    const contained = measurements.find((m) => m.overlay === "range calendar (appendTo)");
    expect(contained, "range calendar was not measured").toBeDefined();
    expect(
      contained?.backgroundColor,
      "the range calendar is painting Carbon's stock layer-01 grey, which means " +
        "it lost the token scope and is rendering off-brand rather than invisible",
    ).not.toBe("rgb(244, 244, 244)");
    expect(contained?.undrrTokenResolves, "range calendar cannot see the UNDRR tokens").toBe(
      true,
    );

    const escaped = measurements.find((m) => m.overlay.includes("forced"));
    // Documents the counterfactual rather than asserting a requirement: if a
    // future Carbon stops portalling, this stops being true and the note in
    // EVIDENCE.md needs revisiting.
    expect(escaped?.insideTokenScope, "forced portal was still inside the scope").toBe(false);
  });

  /* ---------------------------------------------------------------- *
   * Leakage: Carbon -> host. Measured twice.
   * ---------------------------------------------------------------- */

  test("leakage with Carbon's documented global stylesheet", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });

    writeJson("test-results/leakage.json", result);
    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.canariesChecked).toBe(CANARY_IDS.length);

    // THIS ASSERTION FAILS AND IS LEFT FAILING.
    //
    // @carbon/styles/css/styles.css opens with a global reset over html, body,
    // h1-h6, p, a, table, button, ul, ol and more, sets body font-family to IBM
    // Plex Sans, and restyles every heading and paragraph at element level. It is
    // not containable: restyling the document is what it is for.
    //
    // Weakening this to pass would make the single most important result in this
    // pairing invisible. The diff is in test-results/leakage.json and is
    // summarised in evidence.json and EVIDENCE.md.
    expect(
      result.differences,
      `Carbon's global stylesheet changed ${result.differences.length} computed ` +
        `properties on the host's canaries. Expected: this is the finding, not a ` +
        `flake. Recorded in evidence.json.leakage.\n${JSON.stringify(
          result.differences,
          null,
          2,
        )}`,
    ).toEqual([]);
  });

  test("leakage with the scoped-CSS containment experiment", async ({ page }, testInfo) => {
    // Same measurement, Carbon compiled inside a `.demo { }` block. Recorded
    // separately so the cost of containment is a number. Not asserted against
    // zero: it is an experiment, and its own result is the evidence.
    const result = await checkLeakage(page, { url: "/?carbonCss=scoped" });

    writeJson("test-results/leakage-scoped.json", result);
    await testInfo.attach("leakage-scoped.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    expect(result.canariesChecked).toBe(CANARY_IDS.length);

    // eslint-disable-next-line no-console
    console.log(
      `leakage scoped: ${result.differences.length} differences ` +
        `(global build measured separately)`,
    );
  });

  /* ---------------------------------------------------------------- *
   * Collisions: host -> Carbon. The direction leakage cannot see.
   * ---------------------------------------------------------------- */

  test("measures style collisions in both directions", async ({ page }) => {
    await page.goto("/?candidate=on");
    await expect(page.locator("#section-6")).toHaveCount(1);
    await page.waitForLoadState("networkidle");

    const report = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      const canaries = Array.from(document.querySelectorAll("[data-canary]"));
      if (!root) throw new Error("no candidate root");

      /**
       * Rules are attributed by which stylesheet they came from, which works
       * because main.tsx imports Carbon's CSS dynamically: Vite emits it as its
       * own asset (`styles-*.css`) rather than folding it into the main bundle
       * (`index-*.css`, which carries Mangrove and the host shell).
       */
      type Hit = {
        selector: string;
        matches: number;
        declarations: string;
      };
      const hostIntoCandidate: Hit[] = [];
      const carbonOntoCanaries: Hit[] = [];

      const classify = (href: string): "carbon" | "host" | "ours" | "unknown" => {
        if (/styles-|carbon-scoped/.test(href)) return "carbon";
        if (/tokens-|theme-/.test(href)) return "ours";
        if (/index-/.test(href)) return "host";
        return "unknown";
      };

      for (const sheet of Array.from(document.styleSheets)) {
        const origin = classify(sheet.href ?? "");
        if (origin !== "carbon" && origin !== "host") continue;

        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin
        }

        const walk = (list: CSSRuleList): void => {
          for (const rule of Array.from(list)) {
            if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
              walk(rule.cssRules);
              continue;
            }
            if (!(rule instanceof CSSStyleRule)) continue;
            const selector = rule.selectorText;
            if (!selector) continue;

            const declarations = rule.style.cssText.slice(0, 160);

            if (origin === "host") {
              // Skip the shell's own layout classes; they are not the design
              // system reaching into the candidate.
              if (/mg-host/.test(selector)) continue;
              let matched: Element[] = [];
              try {
                matched = Array.from(root.querySelectorAll(selector));
              } catch {
                continue;
              }
              if (matched.length > 0) {
                hostIntoCandidate.push({ selector, matches: matched.length, declarations });
              }
            } else {
              const matched = canaries.filter((el) => {
                try {
                  return el.matches(selector);
                } catch {
                  return false;
                }
              });
              if (matched.length > 0) {
                carbonOntoCanaries.push({ selector, matches: matched.length, declarations });
              }
            }
          }
        };

        walk(rules);
      }

      const summarise = (hits: Hit[]) => {
        hits.sort((a, b) => b.matches - a.matches);
        return {
          totalRules: hits.length,
          totalMatchedElements: hits.reduce((sum, hit) => sum + hit.matches, 0),
          rules: hits.slice(0, 30),
        };
      };

      return {
        /** Mangrove's element-level rules restyling Carbon components. */
        hostIntoCandidate: summarise(hostIntoCandidate),
        /** Carbon's rules that match a host canary: the leakage, by selector. */
        carbonOntoCanaries: summarise(carbonOntoCanaries),
        canariesFound: canaries.length,
      };
    });

    writeJson("test-results/collisions.json", report);

    // eslint-disable-next-line no-console
    console.log(
      `host -> candidate: ${report.hostIntoCandidate.totalRules} Mangrove rules match ` +
        `${report.hostIntoCandidate.totalMatchedElements} Carbon-rendered elements\n` +
        `candidate -> host: ${report.carbonOntoCanaries.totalRules} Carbon rules match ` +
        `${report.carbonOntoCanaries.totalMatchedElements} canary elements`,
    );

    // Recorded, not asserted against zero: the counts are the evidence. The
    // computed-style consequence is the leakage assertion above.
    expect(report.canariesFound).toBe(CANARY_IDS.length);
  });

  test("the host does not defeat the hidden attribute inside the demo", async ({ page }) => {
    /*
     * MANGROVE DEFECT, checked and found inert against Carbon. No workaround is
     * shipped; see the comment block at the end of src/theme.css.
     *
     * Mangrove's `input[type=*], textarea { display: block }` at (0,1,1) outranks
     * its own `[hidden] { display: none }` at (0,1,0), so any hidden INPUT renders
     * visibly on this host. Carbon puts `hidden` only on `<ul
     * class="cds--list-box__menu">`, which that selector cannot reach. This
     * assertion is the regression guard on that claim: if a future Carbon version
     * hides a helper input, it fails here rather than in a screenshot nobody
     * looks at.
     */
    await page.goto("/?candidate=on");
    // The app mounts after two dynamic imports, so wait for the tree.
    await expect(page.locator("#section-6")).toHaveCount(1);

    const visibleHidden = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      if (!root) return -1;
      return Array.from(root.querySelectorAll("[hidden]")).filter(
        (el) => getComputedStyle(el).display !== "none",
      ).length;
    });

    expect(
      visibleHidden,
      "elements with the hidden attribute are rendering visibly; " +
        "Mangrove's input rule is outranking its own [hidden] reset",
    ).toBe(0);
  });

  /* ---------------------------------------------------------------- *
   * Locale, RTL, long labels
   * ---------------------------------------------------------------- */

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "ar");
    await expect(page.locator('.demo[dir="rtl"]')).toHaveCount(1);
    await expect(page.locator('.mg-host[dir="rtl"]')).toHaveCount(1);
  });

  test("cycles all four locales", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const [code, expected] of [
      ["fr", "Examen des données de pertes"],
      ["de", "Überprüfung der Schadensdaten"],
      ["ar", "مراجعة بيانات الخسائر"],
      ["en", "Disaster loss data review"],
    ] as const) {
      await selectLocale(page, code);
      await expect(page.locator("h1")).toContainText(expected);
    }
  });

  test("axe per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    for (const section of SECTIONS) {
      const result = await runAxe(page, {
        section: section.name,
        include: `#${section.id}`,
      });
      writeJson(`test-results/axe-${section.name}.json`, result);
      // eslint-disable-next-line no-console
      console.log(
        `axe ${section.name}: ${result.counts.violations} violations ` +
          `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
          `${result.counts.incomplete} incomplete`,
      );
    }

    // Scoped to the candidate subtree: the Mangrove host contributes a known
    // link-in-text-block violation that is not ours. See docs/requirements.md.
    const scoped = await runAxe(page, {
      section: "candidate-subtree",
      include: "[data-candidate-root]",
    });
    writeJson("test-results/axe-candidate-subtree.json", scoped);

    const wholePage = await runAxe(page, { section: "whole-page" });
    writeJson("test-results/axe-whole-page.json", wholePage);

    /*
     * Whole page again, with Carbon contained. This is not padding: the
     * documented host baseline is one serious `link-in-text-block` on the
     * canary paragraph, and the global build does not report it. Measuring the
     * scoped build shows whether Carbon's leakage happens to mask the host's own
     * WCAG failure, which is worth knowing in both directions.
     */
    await page.goto("/?candidate=on&carbonCss=scoped");
    await expect(page.locator("#section-6")).toHaveCount(1);
    const scopedBuild = await runAxe(page, { section: "whole-page-scoped-css" });
    writeJson("test-results/axe-whole-page-scoped-css.json", scopedBuild);
    // eslint-disable-next-line no-console
    console.log(
      `axe whole page, Carbon contained: ${scopedBuild.counts.violations} violations ` +
        `[${scopedBuild.violations.map((v) => v.id).join(", ")}]`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `axe scoped: ${scoped.counts.violations} violations | ` +
        `whole page: ${wholePage.counts.violations} violations`,
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
    await expect(page.locator('.demo[dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "de");

    // German is the long-compound-noun locale. A horizontal scrollbar on the
    // document means a component could not cope with the fixture labels.
    const measurement = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = measurement.scrollWidth - measurement.clientWidth;

    // Written before the assertion so the evidence exists even when this fails.
    writeJson(`test-results/long-labels-${testInfo.project.name}.json`, {
      viewport: testInfo.project.name,
      locale: "de",
      ...measurement,
      overflowPx: overflow,
      passes: overflow <= 1,
    });

    expect(
      overflow,
      `document scrolls horizontally by ${overflow}px in German at ` +
        `${testInfo.project.name}. Not weakened to pass: recorded in ` +
        `evidence.json.longLabels.`,
    ).toBeLessThanOrEqual(1);
  });
});
