/**
 * Evidence run for mangrove-mui.
 *
 * Mirrors apps/delta-mui/e2e/demo.spec.ts so the two MUI runs are directly
 * comparable, plus two Mangrove-specific assertions that the delta run does not
 * need:
 *
 *   - "the host does not defeat the hidden attribute": Mangrove's own `[hidden]`
 *     reset loses to its own `input[type=text] { display: block }` rule, so MUI's
 *     hidden picker helper inputs render as visible text boxes. The behavioural
 *     suite cannot see this — the picker works either way — so it is asserted on
 *     computed style. See src/demo.css HOST REPAIR 1.
 *   - "the host does not restyle candidate inputs": Mangrove's element-level
 *     input rules outrank MUI's slot classes and drew a 2px black box inside
 *     every field. Asserted on computed border width.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";

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

/** MUI's ToggleButton renders a real button, so role targeting works here. */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  test("renders the 250-row grid with pagination", async ({ page }) => {
    await page.goto("/?candidate=on");
    // DataGrid reports the total in its footer regardless of page size.
    await expect(page.locator("#section-6 .MuiTablePagination-displayedRows")).toContainText(
      "250",
    );
  });

  test("composes a date-time range from two pickers", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Three VISIBLE fields: one date picker plus TWO date-time pickers standing
    // in for a single range control. That count is the finding.
    //
    // `:visible` rather than a bare `input` count, unlike the delta run: on this
    // host the pickers' hidden helper inputs are in the DOM and were rendering
    // visibly until demo.css repaired the host's [hidden] specificity bug. A raw
    // count would pass whether or not the repair is in place.
    await expect(page.locator("#section-3 input:visible")).toHaveCount(3);
    await expect(page.locator("#section-3 input:visible").nth(1)).toHaveValue(/00:00/);
    await expect(page.locator("#section-3 input:visible").nth(2)).toHaveValue(/23:59/);

    // The derived range summary is application code, not library output: a native
    // range picker would render the span itself.
    await expect(page.locator('#section-3 [role="alert"]')).toContainText("days");
  });

  test("the host's [hidden] specificity bug does not reach this candidate", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Mangrove's `[hidden]` reset (0,1,0) loses to its own `input[type=text]
    // { display: block }` (0,1,1), so any library hiding a helper input with the
    // `hidden` attribute has it render as a visible text box. That is what hit
    // mangrove-react-aria. This test establishes whether it hits MUI.
    //
    // Measured answer: it does not. MUI 9.10.1 uses `aria-hidden="true"` plus a
    // 1px width from its own CSS, and its helper inputs carry no `type`
    // attribute at all, so neither Mangrove rule matches them. Recorded rather
    // than assumed, and recorded as a count so a future MUI version that starts
    // using `hidden` shows up here as a change.
    const survey = await page.evaluate(() => {
      const root = document.querySelector("[data-candidate-root]");
      const hidden = [...(root?.querySelectorAll("[hidden]") ?? [])];
      const helpers = [
        ...(root?.querySelectorAll(
          "input.MuiPickersInputBase-input, input.MuiSelect-nativeInput",
        ) ?? []),
      ];
      return {
        hiddenAttributeElements: hidden.length,
        visibleHiddenAttributeElements: hidden.filter(
          (el) => getComputedStyle(el).display !== "none",
        ).length,
        ariaHiddenHelperInputs: helpers.length,
        helperInputsWithTypeAttribute: helpers.filter((el) => el.hasAttribute("type")).length,
      };
    });

    writeJson("test-results/hidden-inputs.json", survey);

    // The real assertion: nothing the host made visible that should not be.
    expect(
      survey.visibleHiddenAttributeElements,
      "Mangrove's input[type] rule (0,1,1) is beating its own [hidden] reset (0,1,0)",
    ).toBe(0);
    // Guards the reasoning above: if MUI's helper inputs ever gain a `type`,
    // Mangrove's element rules start matching them and this pairing regresses.
    expect(
      survey.helperInputsWithTypeAttribute,
      "MUI helper inputs now carry a type attribute, so Mangrove's input[type] rules match them",
    ).toBe(0);
  });

  test("the host does not restyle candidate inputs", async ({ page }) => {
    await page.goto("/?candidate=on");

    // Mangrove sets `border: 2px solid #1a1a1a; height: 46px` on input[type=text]
    // at (0,1,1), beating MUI's .MuiOutlinedInput-input at (0,1,0). Unrepaired,
    // this draws a black box inside MUI's notched outline.
    const field = page.locator("#section-1 .MuiOutlinedInput-input").first();
    const styles = await field.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        borderTopWidth: cs.borderTopWidth,
        fontFamily: cs.fontFamily,
      };
    });

    writeJson("test-results/host-input-styling.json", styles);

    expect(styles.borderTopWidth, "the host's 2px input border is showing inside MUI").toBe(
      "0px",
    );
    // Mangrove's rule sets `font-family: Roboto, sans-serif`. The token stack
    // also starts with Roboto — `"Roboto", "Noto Sans Arabic", "Segoe UI",
    // system-ui, -apple-system, sans-serif` — so a `/^Roboto/` check is a false
    // alarm and was corrected rather than kept. The distinguishing part is the
    // fallback chain.
    expect(
      styles.fontFamily,
      "the host's two-entry Roboto stack is overriding the token font stack",
    ).not.toBe("Roboto, sans-serif");
    expect(styles.fontFamily, "the token font stack is not reaching the input").toContain(
      "Noto Sans Arabic",
    );
  });

  test("portalled overlays are actually styled", async ({ page }) => {
    // The theming trap from docs/requirements.md, verified rather than assumed.
    // MUI resolves tokens at build time, so its portalled overlays should carry
    // literal colours even though they sit outside the .undrr-tokens element.
    await page.goto("/?candidate=on");

    await page.getByRole("button", { name: "Open popover" }).click();
    const paper = page.locator(".MuiPopover-paper").first();
    await expect(paper).toBeVisible();

    const styles = await paper.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        tokenSeenInPortal: cs.getPropertyValue("--undrr-color-surface").trim(),
      };
    });

    writeJson("test-results/portal-styling.json", styles);

    expect(styles.background, "portalled popover is transparent").not.toBe("rgba(0, 0, 0, 0)");
    // Documented as the interesting half of the result: the token is NOT visible
    // in the portal, yet the overlay is styled anyway.
    expect(styles.tokenSeenInPortal, "tokens unexpectedly reach the portal").toBe("");
  });

  test("traps and restores focus in the dialog", async ({ page }) => {
    await page.goto("/?candidate=on");
    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });
    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting MUI:\n${JSON.stringify(result.differences, null, 2)}`,
    ).toEqual([]);

    await testInfo.attach("leakage.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  test("applies RTL for Arabic", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
  });

  /**
   * THIS TEST USED TO FAIL DELIBERATELY, AND THE FAILURE WAS OURS, NOT MUI'S.
   *
   * What it recorded: `MuiInputLabel-outlined` is positioned with a physical
   * `left: 0` plus `transform: translate(14px, -9px)`, so in Arabic the floating
   * label stayed pinned to the physical LEFT edge of a FormControl whose input had
   * moved to the logical start on the right. Measured at 1280px: FormControl 926px
   * wide at x=37, input at x=761, label at x=51 — 710px from the field it names.
   * It was recorded as a blocker: "RTL is not achievable in the MUI Community
   * tier", escapable only by a package the evaluation's rules forbid.
   *
   * WHY THAT WAS WRONG. MUI's RTL guide has THREE steps - `dir`, a theme with
   * `direction`, and an emotion cache carrying an RTL stylis plugin. This
   * evaluation did the first two. Step 3 is the one that flips emitted CSS, so
   * without it every physical offset MUI writes stays physical. The blocker
   * described the consequence of our omission and attributed it to the library.
   *
   * The rule was not the obstacle either. The forbidden package is the
   * `styled-components` community `stylis-plugin-rtl`, last published in 2021.
   * MUI now ships its own - `@mui/stylis-plugin-rtl`, in the `mui/material-ui`
   * monorepo, MIT, released in lockstep with `@mui/material` - which is
   * first-party and in the Community tier. See apps/mangrove-mui/src/direction.tsx.
   *
   * WHAT THE ASSERTION NOW MEASURES, AND WHY IT CHANGED SHAPE. The old one
   * compared `label.x` to `input.x` - physical LEFT edges - which is only the
   * right question in a left-to-right layout. Once the layout mirrors correctly
   * the label's left edge is SUPPOSED to be far from the input's left edge; the
   * old metric would have gone on failing against a correct render. So this
   * compares LOGICAL START edges: right edges under `rtl`, left edges under `ltr`.
   * That is a stricter test of the thing actually claimed, not a loosened one -
   * it would still catch the original defect, which put the label 710px from the
   * logical start.
   */
  test("RTL flips MUI's floating labels", async ({ page }) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");

    const measurement = await page.evaluate(() => {
      const control = document.querySelector("#section-1 form .MuiFormControl-root");
      const label = control?.querySelector("label");
      const input = control?.querySelector(".MuiInputBase-root");
      if (!control || !label || !input) throw new Error("field not found");
      const rtl = getComputedStyle(label).direction === "rtl";
      const l = label.getBoundingClientRect();
      const i = input.getBoundingClientRect();
      // The logical start edge: the right edge in RTL, the left edge in LTR.
      const labelStart = rtl ? l.right : l.x;
      const inputStart = rtl ? i.right : i.x;
      return {
        direction: rtl ? "rtl" : "ltr",
        labelLeft: Math.round(l.x),
        inputLeft: Math.round(i.x),
        labelStart: Math.round(labelStart),
        inputStart: Math.round(inputStart),
        startGapPx: Math.round(Math.abs(labelStart - inputStart)),
        labelCssLeft: getComputedStyle(label).left,
        labelCssRight: getComputedStyle(label).right,
      };
    });

    writeJson("test-results/rtl-label-offset.json", measurement);

    expect(measurement.direction, "the label must inherit RTL in Arabic").toBe("rtl");

    // 16px, because MUI reserves 14px for the outline notch and the label is
    // scaled to 0.75 when shrunk. Before step 3 was wired this measured 710.
    expect(
      measurement.startGapPx,
      "MUI's floating label must sit at the field's logical start; a physical " +
        "`left` that RTL never flipped is what put it 710px away",
    ).toBeLessThanOrEqual(16);
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

    // Whole page includes the Mangrove host's known `link-in-text-block` serious
    // violation on its canary paragraph. That is a host baseline, not ours: see
    // docs/requirements.md.
    const wholePage = await runAxe(page, { section: "whole-page" });
    writeJson("test-results/axe-whole-page.json", wholePage);

    // eslint-disable-next-line no-console
    console.log(
      `axe scoped: ${scoped.counts.violations} violations | ` +
        `whole page: ${wholePage.counts.violations} violations ` +
        `(rules: ${wholePage.violations.map((v) => v.id).join(", ") || "none"})`,
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
    await expect(page.locator('[dir="rtl"]')).toHaveCount(1);

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
