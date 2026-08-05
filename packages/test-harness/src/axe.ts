/**
 * axe wrapper producing a stable JSON shape.
 *
 * The raw axe result is large and includes fields that change between runs
 * (element handles, ordering). Eight demos each dumping raw axe output would be
 * unusable as a comparison, so this narrows it to a fixed, sorted shape that
 * diffs cleanly.
 *
 * This deliberately does NOT assert zero violations. Brief 1 forbids claiming
 * accessibility conformance: the job is to record results verbatim and list
 * what still needs human review.
 */

import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** WCAG 2.2 AA, the level UN bodies are normally held to. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

export type AxeImpact = "minor" | "moderate" | "serious" | "critical";

export interface AxeViolation {
  readonly id: string;
  readonly impact: AxeImpact | null;
  readonly help: string;
  readonly helpUrl: string;
  /** Target selectors, sorted so the ordering is stable across runs. */
  readonly nodes: readonly string[];
}

export interface AxeResult {
  /** Page section this scan covered. */
  readonly section: string;
  readonly url: string;
  readonly tags: readonly string[];
  readonly violations: readonly AxeViolation[];
  readonly counts: {
    readonly violations: number;
    readonly serious: number;
    readonly critical: number;
    /** Checks axe could not decide automatically; these need human review. */
    readonly incomplete: number;
  };
  /** Rule ids axe flagged as incomplete, for the humanReviewRequired list. */
  readonly incompleteRuleIds: readonly string[];
}

export interface RunAxeOptions {
  /** Name recorded in the result, normally the kitchen-sink section. */
  readonly section: string;
  /** Restrict the scan, e.g. to the candidate subtree. Defaults to whole page. */
  readonly include?: string;
}

/**
 * Runs axe against the page and returns the narrowed result.
 *
 * Callers write this to `test-results/axe-<section>.json` and copy the counts
 * into evidence.json.
 */
export async function runAxe(page: Page, options: RunAxeOptions): Promise<AxeResult> {
  let builder = new AxeBuilder({ page }).withTags([...AXE_TAGS]);
  if (options.include) {
    builder = builder.include(options.include);
  }

  const raw = await builder.analyze();

  const violations: AxeViolation[] = raw.violations
    .map((violation) => ({
      id: violation.id,
      impact: (violation.impact ?? null) as AxeImpact | null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes
        .flatMap((node) => node.target.map((t) => String(t)))
        .sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const countImpact = (impact: AxeImpact) =>
    violations.filter((v) => v.impact === impact).length;

  return {
    section: options.section,
    url: page.url(),
    tags: [...AXE_TAGS],
    violations,
    counts: {
      violations: violations.length,
      serious: countImpact("serious"),
      critical: countImpact("critical"),
      incomplete: raw.incomplete.length,
    },
    incompleteRuleIds: raw.incomplete.map((i) => i.id).sort((a, b) => a.localeCompare(b)),
  };
}
