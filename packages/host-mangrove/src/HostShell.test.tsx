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

  it("renders the page header above the body, outside the candidate root", () => {
    // Position is the reason this slot exists: passed as a child, the view switcher
    // rendered inside `main` BELOW the canary block, putting the navigation for the
    // page a screen down where it read as content within the page.
    const withHeader = renderToStaticMarkup(
      <HostShell title="Test page" pageHeader={<div id="page-header" />}>
        <p>candidate subtree</p>
      </HostShell>,
    );
    const header = withHeader.indexOf('id="page-header"');
    const canaries = withHeader.indexOf('data-canary="heading-2"');
    const root = withHeader.indexOf("data-candidate-root");
    expect(header).toBeGreaterThan(-1);
    expect(header, "the page header must precede the body").toBeLessThan(canaries);
    expect(header).toBeLessThan(root);
    expect(withHeader.slice(root)).not.toContain('id="page-header"');
  });

  it("uses genuine Mangrove class names", () => {
    // These come from the real compiled stylesheet, so a typo here means the
    // canary silently renders unstyled and the leakage baseline is wrong.
    expect(html).toContain("mg-button mg-button-primary");
    expect(html).toContain("mg-table mg-table--striped");
    expect(html).toContain("mg-card__content");
  });

  it("invents no mg- classes outside the mg-host namespace", () => {
    // An earlier version used mg-heading-1 and mg-link, neither of which exists
    // in Mangrove. They were inert, so nothing looked wrong, but they implied an
    // API the design system does not have. Classes we add are prefixed mg-host
    // so they stay distinguishable from genuine ones during review.
    const REAL_MANGROVE_CLASSES = new Set([
      "mg-button",
      "mg-button-primary",
      "mg-button-secondary",
      "mg-card",
      "mg-card__content",
      "mg-card__description",
      "mg-card__title",
      "mg-table",
      "mg-table--striped",
    ]);

    const used = new Set(html.match(/mg-[a-zA-Z0-9_-]+/g) ?? []);
    const unaccounted = [...used].filter(
      (cls) => !cls.startsWith("mg-host") && !REAL_MANGROVE_CLASSES.has(cls),
    );

    expect(
      unaccounted,
      "these mg- classes are neither real Mangrove classes nor marked as ours",
    ).toEqual([]);
  });
});
