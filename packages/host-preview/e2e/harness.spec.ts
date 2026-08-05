/**
 * Exercises the harness end to end against a known-good control.
 *
 * The preview's candidate subtree uses no component library, so every
 * assertion here must pass. That makes this a test *of the harness*: a failure
 * means the leakage assertion, the axe wrapper or the screenshot helper is
 * broken, not that a candidate misbehaved.
 *
 * Running this before any Brief 1 run means eight agents do not each discover
 * the same harness bug independently.
 */

import { expect, test } from "@playwright/test";

import { CANARY_IDS, captureScreens, checkLeakage, runAxe } from "@undrr-eval/test-harness";

const HOSTS = ["mangrove", "delta"] as const;

for (const host of HOSTS) {
  test.describe(`${host} host`, () => {
    test("renders every canary", async ({ page }) => {
      await page.goto(`/?host=${host}&candidate=on`);

      for (const id of CANARY_IDS) {
        await expect(
          page.locator(`[data-canary="${id}"]`),
          `canary ${id} on ${host}`,
        ).toHaveCount(1);
      }
    });

    test("honours the candidate query parameter", async ({ page }) => {
      await page.goto(`/?host=${host}&candidate=on`);
      await expect(page.locator("[data-candidate-root]")).toContainText("Scaffold preview");

      await page.goto(`/?host=${host}&candidate=off`);
      await expect(page.locator("[data-candidate-root]")).toBeEmpty();
      // Canaries must survive the candidate being switched off.
      await expect(page.locator("[data-canary]")).toHaveCount(CANARY_IDS.length);
    });

    test("passes the leakage assertion with no candidate library", async ({ page }) => {
      const result = await checkLeakage(page, { url: `/?host=${host}` });

      expect(
        result.canariesChecked,
        "baseline snapshot found no canaries, so the assertion would pass vacuously",
      ).toBe(CANARY_IDS.length);

      expect(
        result.differences,
        `leakage detected with no component library present, so the harness is wrong:\n${JSON.stringify(
          result.differences,
          null,
          2,
        )}`,
      ).toEqual([]);
      expect(result.assertionPassed).toBe(true);
    });

    test("applies RTL for Arabic", async ({ page }) => {
      await page.goto(`/?host=${host}&candidate=on`);
      // Scoped to the toolbar: the host canaries include buttons too, and an
      // unscoped name match is ambiguous.
      await page
        .locator(".preview__toolbar")
        .getByRole("button", { name: "ar", exact: true })
        .click();

      await expect(page.locator("[data-candidate-root]")).toHaveCount(1);
      await expect(page.locator('[dir="rtl"]')).toHaveCount(1);
    });

    test("produces an axe result in the documented shape", async ({ page }, testInfo) => {
      await page.goto(`/?host=${host}&candidate=on`);
      const result = await runAxe(page, { section: `preview-${host}` });

      // Not asserting zero violations: the brief forbids claiming conformance.
      // This asserts the wrapper works and the shape is stable.
      expect(result.section).toBe(`preview-${host}`);
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.counts).toHaveProperty("violations");
      expect(result.counts).toHaveProperty("incomplete");
      expect(Array.isArray(result.violations)).toBe(true);

      await testInfo.attach(`axe-${host}.json`, {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });

      // Surfaced in the run log so a real problem in the scaffold is visible
      // rather than buried in an attachment.
      // eslint-disable-next-line no-console
      console.log(
        `axe ${host}: ${result.counts.violations} violations ` +
          `(${result.counts.critical} critical, ${result.counts.serious} serious), ` +
          `${result.counts.incomplete} incomplete`,
      );
    });

    test("captures screenshots at the documented path", async ({ page }, testInfo) => {
      await page.goto(`/?host=${host}&candidate=on`);
      const path = await captureScreens(page, `preview-${host}`, testInfo);
      expect(path).toMatch(/^screenshots\/(mobile|tablet|desktop)\/preview-/);
    });
  });
}
