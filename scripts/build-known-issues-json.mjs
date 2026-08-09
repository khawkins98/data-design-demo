#!/usr/bin/env node
/**
 * Emits docs/known-issues.json from the TypeScript registry.
 *
 * The registry lives in `packages/known-issues/src/issues.ts` because the demo
 * pages import it directly and it should be typed. The landing-page generator is
 * plain Node and cannot import TypeScript, so rather than keep a second copy of
 * the issues - which would drift, and drift silently - this transcribes the one
 * source into JSON at build time.
 *
 *   pnpm known-issues:json
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const { KNOWN_ISSUES, SCOREABLE_OWNERS, issuesFor, openIssuesFor } = await import(
  join(ROOT, "packages", "known-issues", "src", "issues.ts")
);

const CANDIDATES = ["react-aria", "mui", "carbon", "mantine", "antd"];
const HOSTS = ["delta", "mangrove"];

const byPairing = {};
for (const host of HOSTS) {
  for (const candidate of CANDIDATES) {
    /*
     * OPEN issues drive the cards. A finding we fixed must not become a card's
     * headline: several of the resolved entries are blockers by severity, and a
     * card reading "Blocker: sort state was shown without being announced" about a
     * bug that no longer exists would be worse than showing nothing.
     *
     * `resolvedCount` is still reported, because the number of defects this
     * evaluation found in its own code is a fact about the evaluation's rigour and
     * belongs on the record rather than in a footnote.
     */
    const issues = openIssuesFor(candidate, host);
    const resolved = issuesFor(candidate, host).filter((issue) => issue.resolved);

    /*
     * Open blockers that belong to the thing being chosen.
     *
     * Emitted for the scoring layer, which cannot otherwise see them. Its axis
     * bands are derived from evidence.json fields, and some blocking defects do not
     * show up in any of those fields: antd's Select rendering its value invisible on
     * the Mangrove host is a blocker, but leakage passes and axe is clean, so every
     * A4 signal reads fine. Without this, antd scored as unblocked and would have
     * been shortlisted on the strength of a defect nobody could see in the numbers.
     */
    const scoreableBlockers = openIssuesFor(candidate, host)
      .filter((issue) => issue.severity === "blocker" && SCOREABLE_OWNERS.includes(issue.owner))
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        owner: issue.owner,
        remediability: issue.remediability ?? null,
      }));
    const counts = {};
    for (const issue of issues) counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    byPairing[`${host}-${candidate}`] = {
      total: issues.length,
      counts,
      resolvedCount: resolved.length,
      scoreableBlockers,
      // Worst first, so a card can show the one that matters without logic.
      headline: issues[0] ? { severity: issues[0].severity, title: issues[0].title } : null,
    };
  }
}

/*
 * Candidate-level totals, unioned across both hosts.
 *
 * The cards previously said "and 3 more" from a PAIRING count while linking to the
 * register, which groups by CANDIDATE and therefore showed 8. A reader who followed
 * the link found a different number than the one they clicked. Both were correct
 * about different things, which is the worst kind of inconsistency: nothing is wrong
 * and nobody can tell.
 */
const byCandidate = {};
for (const candidate of CANDIDATES) {
  const ids = new Set();
  let resolved = 0;
  for (const host of HOSTS) {
    for (const issue of openIssuesFor(candidate, host)) ids.add(issue.id);
    for (const issue of issuesFor(candidate, host)) if (issue.resolved) ids.add(`r:${issue.id}`);
  }
  resolved = [...ids].filter((id) => id.startsWith("r:")).length;
  byCandidate[candidate] = { open: [...ids].filter((id) => !id.startsWith("r:")).length, resolved };
}

writeFileSync(
  join(ROOT, "docs", "known-issues.json"),
  `${JSON.stringify(
    {
      $comment:
        "GENERATED from packages/known-issues/src/issues.ts by scripts/build-known-issues-json.mjs. Do not edit: add issues to the TypeScript registry, which the demo pages also import.",
      issueCount: KNOWN_ISSUES.length,
      pairings: byPairing,
      candidates: byCandidate,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `wrote docs/known-issues.json (${KNOWN_ISSUES.length} issues across ${Object.keys(byPairing).length} pairings)\n`,
);
