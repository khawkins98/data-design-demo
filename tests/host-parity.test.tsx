/**
 * Cross-host structural parity.
 *
 * The whole comparison rests on the two host shells rendering *structurally
 * identical* canary DOM, differing only in styling. If Delta's canary table
 * gained a column or Mangrove's nav lost an item, a difference between two
 * demos could no longer be attributed to the candidate library, and nobody
 * would notice until the screenshots were being read side by side.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HostShell as DeltaShell } from "@undrr-eval/host-delta";
import { HostShell as MangroveShell } from "@undrr-eval/host-mangrove";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";

function render(Shell: typeof DeltaShell): string {
  return renderToStaticMarkup(
    <Shell title="Parity check">
      <p>candidate subtree</p>
    </Shell>,
  );
}

/** Strips attributes and whitespace, leaving only the tag skeleton. */
function skeleton(html: string): string[] {
  return (html.match(/<\/?[a-z][a-z0-9]*/gi) ?? []).map((tag) => tag.toLowerCase());
}

/** Canary ids in the order they appear in the markup. */
function canaryOrder(html: string): string[] {
  return [...html.matchAll(/data-canary="([^"]+)"/g)].map((m) => m[1] ?? "");
}

const delta = render(DeltaShell);
const mangrove = render(MangroveShell);

describe("host parity", () => {
  it("renders the same canaries in the same order", () => {
    expect(canaryOrder(delta)).toEqual(canaryOrder(mangrove));
  });

  it("renders every canary the contract defines", () => {
    expect(canaryOrder(delta).sort()).toEqual([...CANARY_IDS].sort());
  });

  it("renders the same element skeleton", () => {
    // Class names and attributes differ by design; tag structure must not.
    expect(skeleton(delta)).toEqual(skeleton(mangrove));
  });

  it("renders the same visible text", () => {
    const text = (html: string) =>
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    expect(text(delta)).toBe(text(mangrove));
  });
});
