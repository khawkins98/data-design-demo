/**
 * The leakage canary contract.
 *
 * Both host shells render the same canary DOM with the same `data-canary`
 * attributes, differing only in the classes and CSS each host applies. That
 * sameness is what makes the leakage assertion meaningful: if a canary's
 * computed style changes after a candidate library mounts, the candidate
 * reached outside its own subtree.
 *
 * This module is the single source of truth for both hosts and the harness, so
 * a canary cannot be renamed in one place and silently missed in the other.
 */

/** Canary elements the brief requires every host shell to render. */
export const CANARY_IDS = Object.freeze([
  "heading-1",
  "heading-2",
  "heading-3",
  "paragraph",
  "link",
  "button-primary",
  "button-secondary",
  "button-disabled",
  "table",
  "table-cell",
  "card-first",
  "card-second",
  "nav",
  "nav-link",
] as const);

export type CanaryId = (typeof CANARY_IDS)[number];

/** Attribute selector for one canary. */
export function canarySelector(id: CanaryId): string {
  return `[data-canary="${id}"]`;
}

/** Attribute selector matching every canary at once. */
export const ALL_CANARIES_SELECTOR = "[data-canary]";

/**
 * Properties compared before and after the candidate subtree mounts.
 *
 * Deliberately narrow. Comparing the full computed style produces false
 * positives from scrollbar-driven width changes and font loading, which would
 * train people to ignore the assertion. These are the properties a leaking
 * stylesheet actually changes: a global `button {}` rule, a `* { box-sizing }`
 * reset, a body font override, a heading margin reset.
 */
export const WATCHED_PROPERTIES = Object.freeze([
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-decoration-line",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-top-style",
  "border-radius",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-bottom",
  "box-sizing",
  "text-align",
  "opacity",
  "box-shadow",
  "list-style-type",
] as const);

export type WatchedProperty = (typeof WATCHED_PROPERTIES)[number];

/** One canary's computed style, as captured either side of the mount. */
export type CanarySnapshot = Readonly<Record<string, Readonly<Record<string, string>>>>;

export interface CanaryDifference {
  readonly canary: string;
  readonly property: string;
  readonly before: string;
  readonly after: string;
}

/**
 * Compares two snapshots and returns every difference.
 *
 * Pure and dependency-free so it can be unit tested without a browser; the
 * Playwright helper only supplies the snapshots.
 */
export function diffSnapshots(
  before: CanarySnapshot,
  after: CanarySnapshot,
): CanaryDifference[] {
  const differences: CanaryDifference[] = [];

  for (const canary of Object.keys(before)) {
    const beforeProps = before[canary];
    const afterProps = after[canary];

    if (!beforeProps) continue;

    if (!afterProps) {
      differences.push({
        canary,
        property: "(element)",
        before: "present",
        after: "missing",
      });
      continue;
    }

    for (const property of Object.keys(beforeProps)) {
      const beforeValue = beforeProps[property] ?? "";
      const afterValue = afterProps[property] ?? "";
      if (beforeValue !== afterValue) {
        differences.push({ canary, property, before: beforeValue, after: afterValue });
      }
    }
  }

  // A canary that only appears after mounting is also a failure: it means the
  // host DOM changed, not just its styling.
  for (const canary of Object.keys(after)) {
    if (!(canary in before)) {
      differences.push({
        canary,
        property: "(element)",
        before: "missing",
        after: "present",
      });
    }
  }

  return differences;
}
