/**
 * Evidence run for delta-mantine.
 *
 * Mirrors the mangrove-react-aria and delta-mui specs so the three are
 * comparable, and adds three assertions specific to what this pairing risks:
 *
 *   1. The native date-time RANGE picker really is one calendar with two time
 *      fields, not two pickers dressed up. The brief expected this requirement to
 *      be `composed`; it is `native` in @mantine/dates 9.5.1 and that claim has to
 *      be earned in the browser, not read off a type definition.
 *   2. Portalled overlays are actually styled AND can see the design tokens.
 *      Mantine's own theming survives portalling (its variables sit at `:root`);
 *      ours does not, unless the token scope class rides along on the portal.
 *   3. Leakage measured TWICE — with Mantine's per-component stylesheets, which
 *      is what this demo ships, and again with `?baseline=on`, which adds the
 *      `baseline.css` that the documented `@mantine/core/styles.css` import would
 *      have brought. The second number is the cost of the documented setup.
 *
 * Table behaviour is asserted in more detail here than in the sibling runs,
 * because in this one every bit of it is application code.
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

/**
 * Mantine's SegmentedControl hides its radio inputs (`opacity: 0; width: 0`), so
 * the label is the clickable target. Role-based targeting does not work here,
 * which is itself a small note about the component.
 */
async function selectLocale(page: Page, label: string): Promise<void> {
  await page
    .locator("label.mantine-SegmentedControl-label")
    .filter({ hasText: label })
    .click();
}

test.describe("kitchen sink", () => {
  test("renders every section", async ({ page }) => {
    await page.goto("/?candidate=on");
    for (const section of SECTIONS) {
      await expect(page.locator(`#${section.id}`), section.name).toHaveCount(1);
    }
  });

  test("renders an empty candidate subtree with ?candidate=off", async ({ page }) => {
    await page.goto("/?candidate=off");
    await expect(page.locator("[data-candidate-root]")).toHaveCount(1);
    await expect(page.locator("[data-candidate-root] .demo")).toHaveCount(0);
    // The host must still be intact, or the leakage baseline is meaningless.
    await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);
  });

  /* ------------------------------------------------------------------ table */

  test("renders all 250 rows when page size is All", async ({ page }) => {
    await page.goto("/?candidate=on");
    await expect(page.getByTestId("table-summary")).toContainText("250 / 250");

    // Default page size is 10.
    await expect(page.locator("#section-6 tbody tr")).toHaveCount(10);

    await page.getByTestId("page-size").click();
    await page.getByRole("option", { name: "All (250)" }).click();
    await expect(page.locator("#section-6 tbody tr")).toHaveCount(250);
  });

  test("sorts on a string column and a numeric column", async ({ page }) => {
    await page.goto("/?candidate=on");
    const firstCell = page.locator("#section-6 tbody tr").first().locator("td").nth(1);

    // Initial sort is eventDate desc, set in component state.
    await expect(page.locator('#section-6 th[aria-sort="descending"]')).toHaveCount(1);

    await page.getByTestId("sort-country").click();
    await expect(page.locator('#section-6 th[aria-sort="ascending"]')).toHaveCount(1);
    const ascFirst = await firstCell.textContent();

    await page.getByTestId("sort-country").click();
    await expect(page.locator('#section-6 th[aria-sort="descending"]')).toHaveCount(1);
    const descFirst = await firstCell.textContent();

    expect(ascFirst).not.toBe(descFirst);

    // Numeric column: string comparison would put 9 before 10.
    await page.getByTestId("sort-peopleAffected").click();
    const values = await page
      .locator("#section-6 tbody tr td:nth-child(6)")
      .allTextContents();
    const numbers = values.map((value) => Number(value.replace(/\D/g, "")));
    const sortedCopy = [...numbers].sort((a, b) => a - b);
    expect(numbers).toEqual(sortedCopy);
  });

  test("filters, and select-all covers the filtered page", async ({ page }) => {
    await page.goto("/?candidate=on");

    // data-testid lands on the <input> itself: Mantine's TextInput forwards
    // unknown props to the input, not to the wrapper.
    await page.getByTestId("filter-country").fill("Bangladesh");
    const summary = page.getByTestId("table-summary");
    await expect(summary).not.toContainText("250 / 250");

    await page.getByTestId("select-all").check();
    const rowCount = await page.locator("#section-6 tbody tr").count();
    await expect(summary).toContainText(`${rowCount} selected`);
    await expect(page.locator('#section-6 tbody tr[data-selected="true"]')).toHaveCount(
      rowCount,
    );
  });

  test("paginates", async ({ page }) => {
    await page.goto("/?candidate=on");
    const firstCell = page.locator("#section-6 tbody tr").first().locator("td").nth(1);
    const page1 = await firstCell.textContent();

    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    const page2 = await firstCell.textContent();
    expect(page1).not.toBe(page2);
  });

  test("resizes a column from the keyboard", async ({ page }) => {
    await page.goto("/?candidate=on");
    const handle = page.getByTestId("resize-country");
    const before = await handle.getAttribute("aria-valuenow");

    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const after = await handle.getAttribute("aria-valuenow");
    expect(Number(after)).toBeGreaterThan(Number(before));
  });

  /* ------------------------------------------------------------------ dates */

  test("the date-time range picker is one native range control", async ({ page }) => {
    await page.goto("/?candidate=on");

    // The fixture range renders as a single field with both endpoints.
    const trigger = page.getByTestId("datetime-range");
    await expect(trigger).toContainText("01/05/2026 00:00");
    await expect(trigger).toContainText("15/06/2026 23:59");

    await trigger.click();

    // ONE calendar, not two. This is the whole difference from the delta-mui
    // two-picker fallback.
    await expect(page.locator("table.mantine-DateTimePicker-month")).toHaveCount(1);

    // Two time fields, start and end, inside that one popover.
    await expect(page.locator(".mantine-DateTimePicker-rangeTimeInput")).toHaveCount(2);

    // The intervening days are marked as in-range by the library, not by us.
    const inRange = await page.locator('[data-in-range="true"]').count();
    expect(inRange).toBeGreaterThan(10);

    await page.keyboard.press("Escape");
  });

  /* --------------------------------------------------------------- overlays */

  test("traps and restores focus in the modal", async ({ page }) => {
    await page.goto("/?candidate=on");
    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("portalled overlays are styled and can see the tokens", async ({ page }, testInfo) => {
    // Behavioural tests cannot see this failure mode: the component works, the
    // suite passes, and the overlay renders transparent with no focus ring.
    await page.goto("/?candidate=on");

    const cases = [
      {
        name: "select dropdown",
        open: async () => {
          await page.locator("#section-2 input").first().click();
        },
        overlay: ".mantine-Select-dropdown",
      },
      {
        name: "popover",
        open: async () => {
          await page.getByRole("button", { name: "Open popover" }).click();
        },
        overlay: ".demo-popover",
      },
      {
        name: "modal",
        open: async () => {
          await page.getByRole("button", { name: "Open modal" }).click();
        },
        overlay: ".mantine-Modal-content",
      },
      {
        name: "date-time range dropdown",
        open: async () => {
          await page.getByTestId("datetime-range").click();
        },
        overlay: "[data-dates-dropdown]",
      },
    ];

    const measured: Record<string, unknown> = {};

    for (const { name, open, overlay } of cases) {
      await open();
      const element = page.locator(overlay).first();
      await expect(element, name).toBeVisible();

      const styles = await element.evaluate((el) => {
        const cs = getComputedStyle(el);
        const portal = el.closest("[data-portal]");
        return {
          background: cs.backgroundColor,
          inPortal: portal !== null,
          portalHasTokenClass: portal?.classList.contains("undrr-tokens") ?? false,
          // Mantine's own variables live at :root, so they reach a portal.
          mantineSurface: cs.getPropertyValue("--mantine-color-body").trim(),
          // Ours are class-scoped, so they only reach it via the portal class.
          undrrFocus: cs.getPropertyValue("--undrr-color-focus").trim(),
          direction: cs.direction,
        };
      });
      measured[name] = styles;

      expect(styles.background, `${name} background is transparent`).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
      expect(styles.inPortal, `${name} is not portalled`).toBe(true);
      expect(styles.mantineSurface, `${name} cannot see Mantine's variables`).not.toBe("");
      expect(styles.undrrFocus, `${name} cannot see the UNDRR tokens`).not.toBe("");

      await page.keyboard.press("Escape");
    }

    writeJson(`test-results/overlays-${testInfo.project.name}.json`, measured);
    await testInfo.attach("overlays.json", {
      body: JSON.stringify(measured, null, 2),
      contentType: "application/json",
    });
  });

  /* ---------------------------------------------------------------- leakage */

  test("passes the leakage assertion", async ({ page }, testInfo) => {
    const result = await checkLeakage(page, { url: "/" });
    writeJson("test-results/leakage.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);
    expect(
      result.differences,
      `host canaries changed after mounting Mantine:\n${JSON.stringify(
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

  test("records the leakage cost of Mantine's documented baseline.css", async ({
    page,
  }, testInfo) => {
    // NOT an assertion that it passes — it does not, and that is the point. This
    // measures what `import "@mantine/core/styles.css"` would have cost, so the
    // decision to import per-component stylesheets instead is evidenced rather
    // than asserted. See src/mantine-styles.css.
    const result = await checkLeakage(page, { url: "/?baseline=on" });
    writeJson("test-results/leakage-with-baseline.json", result);

    expect(result.canariesChecked).toBe(CANARY_IDS.length);

    // eslint-disable-next-line no-console
    console.log(
      `leakage with baseline.css: ${result.differences.length} differences across ` +
        `${new Set(result.differences.map((d) => d.canary)).size} canaries`,
    );

    await testInfo.attach("leakage-with-baseline.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });

  /* -------------------------------------------------------------------- RTL */

  test("applies RTL for Arabic", async ({ page }, testInfo) => {
    await page.goto("/?candidate=on");
    await selectLocale(page, "العربية");
    // The host wrapper is the only element the HOST sets dir on. Everything else
    // carrying dir="rtl" is one of this demo's own portal containers, stamped by
    // the effect in App.tsx — see src/overlay-class.ts for why that is needed.
    await expect(page.locator('#root > [dir="rtl"]')).toHaveCount(1);

    // Mantine's components use CSS logical properties, so this is about whether
    // the direction reaches them at all. The portal case is measured separately
    // below because Mantine's Portal does not forward `dir`.
    const inSubtree = await page
      .locator("#section-6 table")
      .evaluate((el) => getComputedStyle(el).direction);
    expect(inSubtree).toBe("rtl");

    await page.getByRole("button", { name: "Open popover" }).click();
    const portalDirection = await page
      .locator(".mantine-Popover-dropdown")
      .first()
      .evaluate((el) => ({
        direction: getComputedStyle(el).direction,
        portalDir: el.closest("[data-portal]")?.getAttribute("dir") ?? null,
      }));

    writeJson(`test-results/rtl-${testInfo.project.name}.json`, {
      subtreeDirection: inSubtree,
      portal: portalDirection,
    });

    expect(portalDirection.direction, "portalled overlay direction").toBe("rtl");
    expect(portalDirection.portalDir, "portal container dir attribute").toBe("rtl");

    // Every portal container this demo owns must have been reached.
    const unstamped = await page
      .locator('.demo-portal:not([dir="rtl"])')
      .count();
    expect(unstamped, "portal containers left in LTR after switching to Arabic").toBe(0);
  });

  /* -------------------------------------------------------------------- axe */

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

  /* ------------------------------------------------------------ screenshots */

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
    await expect(page.locator('#root > [dir="rtl"]')).toHaveCount(1);

    await captureScreens(page, "00-full-page", testInfo, { rtl: true });
    for (const section of SECTIONS) {
      await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
      await captureScreens(page, section.name, testInfo, { rtl: true, fullPage: false });
    }
  });

  /* ------------------------------------------------------------ long labels */

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
