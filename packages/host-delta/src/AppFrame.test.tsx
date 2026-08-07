/**
 * Renders the Delta application frame and checks the contracts a demo relies on.
 *
 * The Mangrove-class assertions matter most. The frame's reason for existing is
 * that real DELTA runs Tailwind and Mangrove in the same markup, and a candidate
 * has to survive both cascades at once. If those classes are dropped, the frame
 * silently becomes another Tailwind-only view and stops testing what it claims.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";
import { DELTA_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

import { AppFrame } from "./AppFrame.js";

function render(dir: "ltr" | "rtl" = "ltr"): string {
  return renderToStaticMarkup(
    <AppFrame title="Disaster events" dir={dir}>
      <p>candidate subtree</p>
    </AppFrame>,
  );
}

describe("Delta AppFrame", () => {
  const html = render();

  it("renders every host canary exactly once", () => {
    // Retained so the leakage assertion still has host markup to compare, even
    // though the candidate owns the viewport. See the note in AppFrame.tsx.
    for (const id of CANARY_IDS) {
      const occurrences = html.split(`data-canary="${id}"`).length - 1;
      expect(occurrences, id).toBe(1);
    }
  });

  it("renders every frame canary exactly once", () => {
    for (const id of DELTA_FRAME_CANARY_IDS) {
      const occurrences = html.split(`data-frame-canary="${id}"`).length - 1;
      expect(occurrences, id).toBe(1);
    }
  });

  it("renders no frame canary belonging to the Mangrove frame", () => {
    for (const id of ["frame-decoration", "frame-logo"]) {
      expect(html, id).not.toContain(`data-frame-canary="${id}"`);
    }
  });

  it("carries genuine Mangrove classes alongside Tailwind utilities", () => {
    // The whole point of this frame. Measured in real DELTA: mg-button x72,
    // mg-grid x68, mg-container x14. See docs/host-derivation.md.
    expect(html).toContain("mg-button mg-button-primary");
    expect(html).toContain("mg-container");
    // And Tailwind, in the same document.
    expect(html).toMatch(/class="[^"]*\bbg-slate-50\b/);
  });

  it("renders the candidate subtree inside the candidate root", () => {
    expect(html).toContain("data-candidate-root");
    expect(html).toContain("candidate subtree");
  });

  it("puts the host strip after the candidate region", () => {
    // Host markup sits below the application region, where a real DELTA page
    // carries footer content - not above it as in the kitchen sink.
    const root = html.indexOf("data-candidate-root");
    const strip = html.indexOf('data-frame-canary="frame-prose-after"');
    expect(root).toBeGreaterThan(-1);
    expect(root).toBeLessThan(strip);
  });

  it("renders DELTA's own menu bar, not a generic application shell", () => {
    /*
     * These are the specifics that make the screen read as DELTA rather than as a
     * plausible admin layout, and they are exactly what the first version of this
     * frame got wrong: it had a UNDRR wordmark and a sidebar, and DELTA has
     * neither. Asserted rather than left to review, because the difference is
     * invisible in a diff and obvious to anyone who uses DELTA.
     */
    expect(html).toContain("DELTA");
    expect(html).toContain("Resilience");
    expect(html).toContain('aria-label="Sections"');
    for (const label of ["Data", "Analysis", "About", "Settings"]) {
      expect(html, label).toContain(`>${label}`);
    }
    // The site switcher, and the page title passed in.
    expect(html).toContain("Yemen");
    expect(html).toContain("Disaster events");
    // No sidebar: the candidate gets the full width, as it does in DELTA.
    expect(html).not.toContain('aria-label="Application"');
  });

  it("renders notices outside the candidate root", () => {
    // The known-issues box must not be restylable by the candidate, and must not
    // appear inside the subtree the `?candidate=off` baseline requires to be empty.
    const withNotices = renderToStaticMarkup(
      <AppFrame title="Disaster events" notices={<div id="notice-box" />}>
        <p>candidate subtree</p>
      </AppFrame>,
    );
    const notice = withNotices.indexOf('id="notice-box"');
    const root = withNotices.indexOf("data-candidate-root");
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(root);
  });

  it("renders the page header above the body, outside the candidate root", () => {
    // Position is the reason this slot exists. Rendered as a child instead, the
    // view switcher landed inside `main` beside the content, so the navigation FOR
    // the page read as content WITHIN it.
    const withHeader = renderToStaticMarkup(
      <AppFrame title="Disaster events" pageHeader={<div id="page-header" />}>
        <p>candidate subtree</p>
      </AppFrame>,
    );
    const header = withHeader.indexOf('id="page-header"');
    const title = withHeader.indexOf('data-canary="heading-1"');
    const root = withHeader.indexOf("data-candidate-root");
    expect(header).toBeGreaterThan(-1);
    expect(header, "the page header must precede the page title").toBeLessThan(title);
    expect(header).toBeLessThan(root);
    expect(withHeader.slice(root)).not.toContain('id="page-header"');
  });

  it("applies the requested direction", () => {
    expect(render("rtl")).toContain('dir="rtl"');
    expect(render("ltr")).toContain('dir="ltr"');
  });

  it("uses no physical directional utilities", () => {
    /*
     * `ms-`/`me-`/`ps-`/`border-s` rather than `ml-`/`mr-`/`pl-`/`border-l`, so the
     * frame does not become the reason a candidate's RTL result looks wrong. A6 is
     * measuring the candidate, not the scaffold.
     *
     * The sidebar's `border-e` used to be the one case; the sidebar is gone, so this
     * now guards the whole bar - the nav is pushed to the end with `ms-auto`, and an
     * `ml-auto` there would pin it to the left in Arabic.
     */
    /*
     * Scoped to the frame's OWN chrome, everything before the candidate region.
     * Widening it to the whole render fails on `HostCanaries`, which uses `pr-4`
     * on its table cells - shared with the kitchen sink, pinned by
     * tests/host-parity.test.tsx, and left alone deliberately rather than changed
     * from under nine other pairings. It is a real latent RTL flaw in host chrome
     * and it is recorded here rather than silently fixed.
     */
    const chrome = html.slice(0, html.indexOf("data-candidate-root"));
    expect(chrome).toContain("ms-auto");
    expect(chrome).not.toMatch(/class="[^"]*\b(ml|mr|pl|pr)-/);
    expect(chrome).not.toMatch(/class="[^"]*\bborder-(l|r)\b/);
  });
});
