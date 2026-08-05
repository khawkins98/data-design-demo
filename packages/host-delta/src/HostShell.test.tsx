/**
 * Renders the shell and checks the canary contract holds.
 *
 * Typechecking proves the component compiles, not that it emits every canary
 * the harness will look for. If a canary is missing, the leakage assertion
 * silently checks fewer elements and a leaking library could pass.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";

import { HostShell } from "./HostShell.js";

function render(dir: "ltr" | "rtl" = "ltr"): string {
  return renderToStaticMarkup(
    <HostShell title="Test page" dir={dir}>
      <p>candidate subtree</p>
    </HostShell>,
  );
}

describe("Delta HostShell", () => {
  const html = render();

  it("renders every canary exactly once", () => {
    for (const id of CANARY_IDS) {
      const occurrences = html.split(`data-canary="${id}"`).length - 1;
      expect(occurrences, id).toBe(1);
    }
  });

  it("renders the candidate subtree inside the candidate root", () => {
    expect(html).toContain("data-candidate-root");
    expect(html).toContain("candidate subtree");
  });

  it("applies the requested direction", () => {
    expect(render("rtl")).toContain('dir="rtl"');
    expect(render("ltr")).toContain('dir="ltr"');
  });

  it("puts the canaries before the candidate subtree in document order", () => {
    // The harness screenshots the canaries; burying them below a 250-row table
    // would push them off every screenshot.
    expect(html.indexOf('data-canary="heading-2"')).toBeLessThan(
      html.indexOf("data-candidate-root"),
    );
  });

  it("uses Tailwind utility classes, as Delta does", () => {
    expect(html).toMatch(/class="[^"]*\b(flex|grid|border|text-)/);
  });
});
