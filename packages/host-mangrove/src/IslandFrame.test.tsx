/**
 * Renders the island frame and checks the contracts a demo relies on.
 *
 * The frame is import-only for a Brief 1 run, which means a run cannot fix it if
 * it drifts - so the drift has to fail here instead.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";
import { MANGROVE_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

import { IslandFrame } from "./IslandFrame.js";

function render(dir: "ltr" | "rtl" = "ltr"): string {
  return renderToStaticMarkup(
    <IslandFrame title="Loss records" dir={dir}>
      <p>candidate subtree</p>
    </IslandFrame>,
  );
}

describe("Mangrove IslandFrame", () => {
  const html = render();

  it("renders every host canary exactly once", () => {
    // The island reuses HostShell's canary block rather than inventing a second
    // leakage baseline, so the existing assertion keeps working unchanged.
    for (const id of CANARY_IDS) {
      const occurrences = html.split(`data-canary="${id}"`).length - 1;
      expect(occurrences, id).toBe(1);
    }
  });

  it("renders every frame canary exactly once", () => {
    for (const id of MANGROVE_FRAME_CANARY_IDS) {
      const occurrences = html.split(`data-frame-canary="${id}"`).length - 1;
      expect(occurrences, id).toBe(1);
    }
  });

  it("renders no frame canary belonging to the Delta frame", () => {
    // The two frames share one id union; each must render only its own subset.
    for (const id of ["frame-toolbar-button", "frame-mangrove-in-delta"]) {
      expect(html, id).not.toContain(`data-frame-canary="${id}"`);
    }
  });

  it("renders the candidate subtree inside the candidate root", () => {
    expect(html).toContain("data-candidate-root");
    expect(html).toContain("candidate subtree");
  });

  it("puts host prose both before and after the candidate region", () => {
    // The point of the island: boundaries on both sides, not just above.
    const before = html.indexOf('data-frame-canary="frame-prose-before"');
    const root = html.indexOf("data-candidate-root");
    const after = html.indexOf('data-frame-canary="frame-prose-after"');
    expect(before).toBeGreaterThan(-1);
    expect(before).toBeLessThan(root);
    expect(root).toBeLessThan(after);
  });

  it("applies the requested direction", () => {
    expect(render("rtl")).toContain('dir="rtl"');
    expect(render("ltr")).toContain('dir="ltr"');
  });

  it("uses the real published Mangrove page-frame classes", () => {
    // These come from shared-web-assets-files/projects/hips/index.html. A typo
    // here means the chrome renders unstyled and the frame stops being realistic.
    expect(html).toContain("mg-page-header mg-page-header--default");
    expect(html).toContain("mg-page-header__decoration");
    expect(html).toContain("mg-page-header__logo-img");
    expect(html).toContain("mg-mega-topbar");
    expect(html).toContain("mg-container mg-page-content--padded");
  });

  it("keeps the navigation's menubar semantics", () => {
    // Deliberately an adversary for the axe run: a candidate rendering its own
    // menu beside this either agrees on ARIA semantics or does not.
    expect(html).toContain('role="menubar"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('role="none"');
  });

  it("renders the title as the content region's h1", () => {
    expect(html).toContain('data-canary="heading-1">Loss records</h1>');
  });
});
