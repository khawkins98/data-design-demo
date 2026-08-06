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

  it("renders application chrome the candidate does not own", () => {
    expect(html).toContain('aria-label="Application"');
    expect(html).toContain("Disaster events");
  });

  it("applies the requested direction", () => {
    expect(render("rtl")).toContain('dir="rtl"');
    expect(render("ltr")).toContain('dir="ltr"');
  });

  it("uses logical properties for the sidebar edge", () => {
    // `border-e`/`border-s` rather than `border-r`/`border-l`, so the frame does
    // not become the reason a candidate's RTL result looks wrong. A6 is measuring
    // the candidate, not the scaffold.
    expect(html).toMatch(/class="border-e /);
    expect(html).not.toMatch(/class="[^"]*\bborder-r\b/);
  });
});
