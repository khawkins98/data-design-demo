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

  it("renders notices outside the candidate root", () => {
    // The known-issues box must not be restylable by the candidate, and must not
    // appear inside the subtree the `?candidate=off` baseline requires to be empty.
    const withNotices = renderToStaticMarkup(
      <IslandFrame title="Loss records" notices={<div id="notice-box" />}>
        <p>candidate subtree</p>
      </IslandFrame>,
    );
    const notice = withNotices.indexOf('id="notice-box"');
    const root = withNotices.indexOf("data-candidate-root");
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(root);
  });

  it("renders the page header above the content region, outside the candidate root", () => {
    // Position is the reason this slot exists. Rendered as a child instead, the
    // view switcher landed below the page title and the canary block, so the
    // navigation FOR the page read as content WITHIN it.
    const withHeader = renderToStaticMarkup(
      <IslandFrame title="Loss records" pageHeader={<div id="page-header" />}>
        <p>candidate subtree</p>
      </IslandFrame>,
    );
    const header = withHeader.indexOf('id="page-header"');
    const title = withHeader.indexOf('data-canary="heading-1"');
    const root = withHeader.indexOf("data-candidate-root");
    expect(header).toBeGreaterThan(-1);
    expect(header, "the page header must precede the content region").toBeLessThan(title);
    expect(header).toBeLessThan(root);
    expect(withHeader.slice(root)).not.toContain('id="page-header"');
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
