/**
 * Renders the shell and checks the canary contract holds.
 *
 * The cross-host structural comparison lives in
 * packages/test-harness/src/host-parity.test.tsx, which is where it can see
 * both shells at once.
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

describe("Mangrove HostShell", () => {
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
    expect(html.indexOf('data-canary="heading-2"')).toBeLessThan(
      html.indexOf("data-candidate-root"),
    );
  });

  it("uses genuine Mangrove class names", () => {
    // These come from the real compiled stylesheet, so a typo here means the
    // canary silently renders unstyled and the leakage baseline is wrong.
    expect(html).toContain("mg-button mg-button-primary");
    expect(html).toContain("mg-table mg-table--striped");
    expect(html).toContain("mg-card__content");
  });
});
