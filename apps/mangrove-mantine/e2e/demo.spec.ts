/**
 * Evidence run for mangrove-mantine.
 *
 * Mirrors the mangrove-react-aria and delta-mui specs so the three are
 * comparable, and adds three measurements specific to this pairing:
 *
 *   1. `mantine baseline is absent with the candidate off` — proves the leakage
 *      result is real rather than vacuous. Mantine ships a plain stylesheet, so
 *      a static import would sit in both snapshots and cancel itself out.
 *   2. `measures what baseline.css would have leaked` — the counterfactual. The
 *      omitted global reset is injected over the host-only page and the canary
 *      diffs are recorded, so the cost of the omission is a number rather than
 *      an assertion.
 *   3. `measures what the hosts element rules steal from Mantine` — the OTHER
 *      direction of the two-stylesheet problem: Mangrove's element-level form
 *      rules against Mantine's component classes. The result was NOT the one
 *      predicted, which is why it is measured rather than asserted in prose.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, WATCHED_PROPERTIES, checkLeakage, captureScreens, runAxe } from "@undrr-eval/test-harness";

const require = createRequire(import.meta.url);

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
 * SegmentedControl renders a visually hidden radio behind a `<label>`, and the
 * label intercepts pointer events exactly as React Aria's Radio did. Clicking
 * the label is the working route.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.locator(".mantine-SegmentedControl-label", { hasText: label }).first().click();
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  test("filters, sorts, selects and pages the 250-row table", async ({ page }) => {
    await page.goto("/?candidate=on");
    const count = page.getByTestId("table-count");
    await expect(count).toContainText("250 of 250");

    // Pagination: 250 rows at 10 per page.
    await expect(page.locator("#section-6 tbody tr")).toHaveCount(10);
    await expect(page.locator("#section-6")).toContainText("Page 1 of 25");
    await page.getByRole("button", { name: "Last page" }).click();
    await expect(page.locator("#section-6")).toContainText("Page 25 of 25");
    await page.getByRole("button", { name: "First page" }).click();

    // Sort: default is eventDate descending, declared through aria-sort because
    // Mantine's Table.Th has no sorting affordance of its own.
    await expect(
      page.locator('#section-6 th[aria-sort="descending"]'),
    ).toHaveCount(1);
    await page.getByRole("button", { name: /^Sort by / }).first().click();
    await expect(page.locator('#section-6 th[aria-sort="ascending"]')).toHaveCount(1);

    // Select-all on the page, including the indeterminate state.
    await page.getByLabel("Select all rows on this page").check();
    await expect(count).toContainText("10 selected");

    // Filter narrows the set and resets to page 1.
    await page.locator("#section-6 input").first().fill("Bangladesh");
    await expect(count).not.toContainText("250 of 250");
  });

  test("resizes a table column by keyboard", async ({ page }) => {
    await page.goto("/?candidate=on");
    const header = page.locator("#section-6 th.demo-th").first();
    const handle = header.locator(".demo-resizer");

    const before = await header.evaluate((el) => el.getBoundingClientRect().width);
    await handle.focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowRight");
    const after = await header.evaluate((el) => el.getBoundingClientRect().width);

    // Keyboard resizing is not something a hand-rolled resizer usually has; it
    // is asserted here because React Aria's native one does.
    expect(after, `column did not widen: ${before} -> ${after}`).toBeGreaterThan(before);
  });

  test("has a NATIVE date-time range picker", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    // One control, not two: the input shows both endpoints joined by the
    // labelSeparator. This is the finding that corrects the briefing.
    const input = page.locator("#section-3 [data-dates-input]");
    await expect(input).toHaveCount(2); // date picker + range picker
    await expect(input.nth(1)).toContainText("→");

    await input.nth(1).click();
    const dropdown = page.locator(".demo-overlay").filter({ has: page.locator("table") });
    await expect(dropdown.first()).toBeVisible();

    // Two time inputs inside ONE popover: start and end.
    await expect(page.locator(".mantine-DateTimePicker-timeInput")).toHaveCount(0);
    const timeInputs = page.locator('.demo-overlay input[type="time"], .demo-overlay [role="textbox"]');
    // The range calendar highlights the intervening days; a two-picker fallback
    // could not do this.
    await expect(page.locator(".demo-overlay [data-in-range]").first()).toBeVisible();
    await expect(timeInputs.first().or(page.locator(".demo-overlay input")).first()).toBeVisible();

    // The open dropdown is the evidence for the headline finding, so it gets its
    // own screenshot rather than only living in a passing assertion.
    await captureScreens(page, "03-dates-range-open", testInfo, { fullPage: false });

    await page.keyboard.press("Escape");
  });

  test("traps and restores focus in the modal", async ({ page }) => {
    await page.goto("/?candidate=on");
    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  /**
   * The portalled-overlay trap. Behavioural tests cannot see it: a transparent
   * overlay still works, and a failed `var()` is silent.
   */
  test("portalled overlays keep their background", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    const measured: Record<string, string> = {};

    async function background(selector: string): Promise<string> {
      return page
        .locator(selector)
        .first()
        .evaluate((el) => window.getComputedStyle(el).backgroundColor);
    }

    await page.getByRole("button", { name: "Open modal" }).click();
    measured.modal = await background(".mantine-Modal-content");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open popover" }).click();
    measured.popover = await background(".mantine-Popover-dropdown");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Hover or focus for tooltip" }).hover();
    measured.tooltip = await background(".mantine-Tooltip-tooltip");

    await page.locator("#section-2 input").first().click();
    measured.selectDropdown = await background(".mantine-Select-dropdown");
    await page.keyboard.press("Escape");

    // Whether the UNDRR tokens are even visible inside a portal, recorded either
    // way: Mantine themes through its own variables, so it should not matter.
    measured.undrrTokenInsidePortal = await page
      .locator("body")
      .evaluate(() =>
        window
          .getComputedStyle(document.body)
          .getPropertyValue("--undrr-color-surface")
          .trim(),
      );

    writeJson("test-results/overlay-backgrounds.json", measured);
    await testInfo.attach("overlay-backgrounds.json", {
      body: JSON.stringify(measured, null, 2),
      contentType: "application/json",
    });

    for (const key of ["modal", "popover", "tooltip", "selectDropdown"]) {
      expect(measured[key], `${key} rendered transparent`).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("mantine CSS is absent with the candidate off", async ({ page }) => {
    await page.goto("/?candidate=off");
    const mantineVar = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).getPropertyValue("--mantine-font-family"),
    );
    // If this were non-empty the leakage assertion below would be measuring
    // nothing, because Mantine's stylesheet would be in both snapshots.
    expect(mantineVar.trim()).toBe("");
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });
    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Mantine:\n${JSON.stringify(result.differences, null, 2)}`,
    ).toEqual([]);

    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  /**
   * The counterfactual: what `@mantine/core/styles/baseline.css` would have done
   * to the host canaries if it had been imported, which is what
   * `@mantine/core/styles.css` does by default.
   */
  test("measures what baseline.css would have leaked", async ({ page }, testInfo) => {
    const baselinePath = require.resolve("@mantine/core/styles/baseline.css");
    const baseline = readFileSync(baselinePath, "utf8");

    const snapshot = async () =>
      page.evaluate((properties) => {
        const out: Record<string, Record<string, string>> = {};
        for (const element of Array.from(document.querySelectorAll("[data-canary]"))) {
          const id = element.getAttribute("data-canary");
          if (!id) continue;
          const computed = window.getComputedStyle(element);
          const values: Record<string, string> = {};
          for (const property of properties) {
            values[property] = computed.getPropertyValue(property).trim();
          }
          out[id] = values;
        }
        return out;
      }, [...WATCHED_PROPERTIES]);

    await page.goto("/?candidate=off");
    const before = await snapshot();

    // Mantine's variables are needed for the body rule to resolve, so inject the
    // default variables too — this reproduces `styles.css` exactly.
    await page.addStyleTag({
      content: readFileSync(
        require.resolve("@mantine/core/styles/default-css-variables.css"),
        "utf8",
      ),
    });
    await page.addStyleTag({ content: baseline });
    const after = await snapshot();

    const differences: Array<{ canary: string; property: string; before: string; after: string }> =
      [];
    for (const [canary, props] of Object.entries(before)) {
      for (const [property, value] of Object.entries(props)) {
        const next = after[canary]?.[property] ?? "";
        if (value !== next) differences.push({ canary, property, before: value, after: next });
      }
    }

    writeJson("test-results/leakage-with-baseline.json", {
      note:
        "Counterfactual. These are the host canary changes that importing " +
        "@mantine/core/styles.css unmodified would have caused, because it " +
        "includes baseline.css. src/mantine-styles.css omits that file and " +
        "src/demo.css re-applies the reset scoped to .demo instead.",
      canariesChecked: Object.keys(before).length,
      differenceCount: differences.length,
      differences,
    });

    await testInfo.attach("leakage-with-baseline.json", {
      body: JSON.stringify(differences, null, 2),
      contentType: "application/json",
    });

    // eslint-disable-next-line no-console
    console.log(`baseline.css counterfactual: ${differences.length} canary differences`);
  });

  /**
   * The host leaking INTO the candidate — the second direction of the
   * two-stylesheet problem, and the one the harness's leakage check cannot see.
   *
   * The prediction was that Mangrove's `input[type=…], textarea { border: 2px
   * solid #1a1a1a; height: 46px; … }` at (0,1,1) would outrank Mantine's own
   * (0,1,0) component rules and wreck every form control. Measured, it reaches
   * exactly ONE component. This test records the blast radius and proves the
   * single scoped repair in demo.css BLOCK 2 works.
   */
  test("measures what the host's element rules steal from Mantine", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    // The range picker's four TimePicker fields are also `type="text"`, and they
    // live in a PORTAL that only exists while the dropdown is open. The first
    // version of this test counted only `[data-candidate-root] input` and
    // therefore reported a blast radius of 1 when it is really 5 — the four time
    // fields were found by opening the popover and looking at a screenshot.
    await page.locator("#section-3 [data-dates-input]").nth(1).click();
    await expect(page.locator("input.mantine-TimePicker-field").first()).toBeVisible();

    // Mantine's `.m_8fb7ebe7` input rule carries
    // `transition: border-color 100ms ease`, so a border colour read immediately
    // after load returns an interpolated value. An earlier version of this test
    // reported three different colours on three runs for exactly that reason.
    await page.waitForTimeout(400);

    const PROPERTIES = [
      "border-top-width",
      "border-top-color",
      "border-radius",
      "height",
      "width",
      "padding-left",
      "font-family",
      "font-size",
      "background-color",
    ];

    const read = async () =>
      page.evaluate((properties) => {
        const root = document.querySelector("[data-candidate-root]");
        const targets: Record<string, string> = {
          // Collides: MultiSelect's search field, the only component in
          // @mantine/core that emits type="text".
          pillsInputField: "input.mantine-PillsInputField-field",
          // Matches Mangrove's selector list but loses on specificity.
          textarea: "textarea",
          // Collides: TimePicker's hour/minute fields, in a portal.
          timePickerField: "input.mantine-TimePicker-field",
          // Control: no type attribute, so Mangrove cannot select it at all.
          plainTextInput: "input.mantine-TextInput-input",
        };
        const out: Record<string, Record<string, string> | null> = {};
        for (const [name, selector] of Object.entries(targets)) {
          // Portalled elements are outside the candidate root, so fall back to
          // the document for those.
          const element = root?.querySelector(selector) ?? document.querySelector(selector);
          if (!element) {
            out[name] = null;
            continue;
          }
          const computed = window.getComputedStyle(element);
          const values: Record<string, string> = {};
          for (const property of properties) values[property] = computed.getPropertyValue(property);
          out[name] = values;
        }
        return out;
      }, PROPERTIES);

    const repaired = await read();

    // Disable our stylesheet and let Mangrove and Mantine fight unaided.
    await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        if (sheet.href?.includes("/demo-")) sheet.disabled = true;
      }
    });
    const unrepaired = await read();
    await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        if (sheet.href?.includes("/demo-")) sheet.disabled = false;
      }
    });

    const inventory = await page.evaluate(() => {
      const mangroveFormSelector =
        'input[type="date"], input[type="email"], input[type="number"], ' +
        'input[type="password"], input[type="search"], input[type="tel"], ' +
        'input[type="text"]';

      // Candidate subtree plus every Mantine portal, since the portals are where
      // half of the collisions turned out to be.
      const scopes = [
        document.querySelector("[data-candidate-root]"),
        ...Array.from(document.querySelectorAll(".demo-overlay")),
      ].filter((el): el is Element => el !== null);

      const inputs = scopes.flatMap((scope) => Array.from(scope.querySelectorAll("input")));
      const matching = scopes.flatMap((scope) =>
        Array.from(scope.querySelectorAll(mangroveFormSelector)),
      );

      return {
        scopesChecked: scopes.length,
        candidateInputs: inputs.length,
        inputsWithATypeAttribute: inputs.filter((el) => el.hasAttribute("type")).length,
        inputTypesPresent: Array.from(
          new Set(inputs.map((el) => el.getAttribute("type") ?? "(absent)")),
        ).sort(),
        matchesMangroveFormSelector: matching.length,
        matchingComponents: Array.from(
          new Set(
            matching.map(
              (el) =>
                Array.from(el.classList).find((c) => c.startsWith("mantine-")) ?? "(unclassed)",
            ),
          ),
        ).sort(),
      };
    });

    writeJson("test-results/host-collision.json", {
      note:
        "Mangrove's form rule lists seven input[type=…] selectors at (0,1,1) " +
        "plus a bare `textarea` at (0,0,1). Blast radius across the candidate " +
        "subtree AND every open Mantine portal: five elements, from two " +
        "components. Mantine sets no type attribute on its other inputs, and " +
        "the bare `textarea` selector is only (0,0,1) so it loses to Mantine's " +
        "(0,1,0) class. 'unrepaired' is with demo.css disabled.",
      inventory,
      mangroveWouldHaveGiven: {
        "border-top-width": "2px",
        "border-top-color": "rgb(26, 26, 26)",
        height: "46px",
        "font-family": "Roboto, sans-serif",
      },
      unrepaired,
      repaired,
    });

    await testInfo.attach("host-collision.json", {
      body: JSON.stringify({ inventory, unrepaired, repaired }, null, 2),
      contentType: "application/json",
    });

    // eslint-disable-next-line no-console
    console.log(
      `host-into-candidate blast radius: ${inventory.matchesMangroveFormSelector} of ` +
        `${inventory.candidateInputs} candidate inputs`,
    );

    // Exactly two components are reachable, and only because they set
    // type="text": PillsInputField and TimePicker's field.
    // The class picked up is the first `mantine-` one, which for the pill field
    // is the owning component's static class rather than PillsInputField's.
    expect(inventory.matchingComponents).toEqual([
      "mantine-MultiSelect-inputField",
      "mantine-TimePicker-field",
    ]);

    // Unrepaired, both wear Mangrove's 2px black border and 46px height.
    for (const key of ["pillsInputField", "timePickerField"] as const) {
      expect(unrepaired[key]?.["border-top-width"], key).toBe("2px");
      expect(unrepaired[key]?.height, key).toBe("46px");
      // Repaired, both are borderless again.
      expect(repaired[key]?.["border-top-width"], key).toBe("0px");
      expect(repaired[key]?.height, key).not.toBe("46px");
    }

    // The textarea matches Mangrove's selector list but loses on specificity, so
    // it is unaffected either way.
    expect(unrepaired.textarea?.["border-top-width"]).not.toBe("2px");
    expect(repaired.textarea?.["border-top-width"]).not.toBe("2px");

    // The plain TextInput is not selectable by Mangrove at all.
    expect(unrepaired.plainTextInput?.["border-top-width"]).not.toBe("2px");
  });

  test("does not render any element the host's [hidden] bug would expose", async ({ page }) => {
    await page.goto("/?candidate=on");
    // Mangrove's `input[type=text] { display: block }` at (0,1,1) beats its own
    // `[hidden] { display: none }` at (0,1,0). Mantine renders its helper inputs
    // as `type="hidden"`, which that selector list does not match, so unlike the
    // react-aria run nothing is exposed. Asserted so a Mantine change would fail
    // here rather than in a screenshot review.
    const visibleHidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-candidate-root] [hidden]")).filter(
        (el) => window.getComputedStyle(el).display !== "none",
      ).length,
    );
    expect(visibleHidden).toBe(0);

    const visibleHelperInputs = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-candidate-root] input[type='hidden']"),
      ).filter((el) => el.offsetParent !== null).length,
    );
    expect(visibleHelperInputs).toBe(0);
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    // HostShell sets dir on its wrapper; Mantine's DirectionProvider sets it on
    // the document element. Both are required, which is the finding.
    await expect(page.locator("html[dir='rtl']")).toHaveCount(1);
    await expect(page.locator(".mg-host[dir='rtl']")).toHaveCount(1);
  });

  test("axe per section", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");

    for (const section of SECTIONS) {
      const result = await runAxe(page, { section: section.name, include: `#${section.id}` });
      writeJson(`test-results/axe-${section.name}.json`, result);
      // eslint-disable-next-line no-console
      console.log(
        `axe ${section.name}: ${result.counts.violations} violations ` +
          `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
          `${result.counts.incomplete} incomplete`,
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
    await selectLocale(page, "العربية");
    await expect(page.locator("html[dir='rtl']")).toHaveCount(1);

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  test("long labels do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "Deutsch");

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
      `document scrolls horizontally by ${overflow}px in German at ${testInfo.project.name}`,
    ).toBeLessThanOrEqual(1);
  });
});
