/**
 * Cross-host structural parity.
 *
 * The whole comparison rests on both host shells implementing the same canary
 * contract. Their surrounding chrome is deliberately different: Delta has an
 * application masthead and sidebar, while Mangrove now uses its real mega
 * topbar. Compare canaries by id instead of requiring the entire shells to have
 * the same document order and element skeleton.
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

/** Canary ids in the order they appear in the markup. */
function canaryOrder(html: string): string[] {
  return [...html.matchAll(/data-canary="([^"]+)"/g)].map((m) => m[1] ?? "");
}

/** The element type used for each canary, keyed independently of document order. */
function canaryTags(html: string): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [...html.matchAll(/<([a-z][a-z0-9]*)[^>]*data-canary="([^"]+)"[^>]*>/gi)].map(
      (match) => [match[2] ?? "", (match[1] ?? "").toLowerCase()],
    ),
  );
}

function canaryText(html: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<([a-z][a-z0-9]*)[^>]*data-canary="${escaped}"[^>]*>([\\s\\S]*?)</\\1>`,
      "i",
    ),
  );
  return (match?.[2] ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const delta = render(DeltaShell);
const mangrove = render(MangroveShell);

describe("host parity", () => {
  it("renders the same canary contract regardless of host-chrome order", () => {
    expect([...canaryOrder(delta)].sort()).toEqual([...canaryOrder(mangrove)].sort());
  });

  it("renders every canary the contract defines", () => {
    expect(canaryOrder(delta).sort()).toEqual([...CANARY_IDS].sort());
  });

  it("uses the same element type for every canary", () => {
    expect(canaryTags(delta)).toEqual(canaryTags(mangrove));
  });

  it("renders the same content canary text", () => {
    // Heading 1 and navigation are host chrome, not the shared leakage fixture.
    const contentIds = CANARY_IDS.filter(
      (id) => id !== "heading-1" && id !== "nav" && id !== "nav-link",
    );
    for (const id of contentIds) {
      expect(canaryText(delta, id), id).toBe(canaryText(mangrove, id));
    }
  });
});
