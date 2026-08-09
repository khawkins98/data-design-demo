import { expect, test } from "@playwright/test";

test("a widened column keeps its resize handle at the header edge", async ({ page }) => {
  await page.goto(process.env["RESIZE_TEST_URL"] ?? "/?candidate=on");

  const header = page.locator('th[data-key="eventDate"]');
  const resizer = header.locator(".demo-table__resizer");
  const initialHeader = await header.boundingBox();
  const initial = await resizer.boundingBox();
  expect(initialHeader).not.toBeNull();
  expect(initial).not.toBeNull();

  // Recreate the width React Aria assigns during a drag. Setting the inline
  // width keeps this geometry check independent of browser pointer capture.
  await header.evaluate((element) => {
    element.style.width = "280px";
  });

  const [headerBox, resizerBox] = await Promise.all([header.boundingBox(), resizer.boundingBox()]);
  expect(headerBox).not.toBeNull();
  expect(resizerBox).not.toBeNull();
  expect(headerBox!.width).toBeGreaterThan(initialHeader!.width);

  expect(headerBox!.x + headerBox!.width - (resizerBox!.x + resizerBox!.width)).toBeLessThanOrEqual(1);
});
