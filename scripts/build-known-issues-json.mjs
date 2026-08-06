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

const { KNOWN_ISSUES, issuesFor } = await import(
  join(ROOT, "packages", "known-issues", "src", "issues.ts")
);

const CANDIDATES = ["react-aria", "mui", "carbon", "mantine", "antd"];
const HOSTS = ["delta", "mangrove"];

const byPairing = {};
for (const host of HOSTS) {
  for (const candidate of CANDIDATES) {
    const issues = issuesFor(candidate, host);
    const counts = {};
    for (const issue of issues) counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    byPairing[`${host}-${candidate}`] = {
      total: issues.length,
      counts,
      // Worst first, so a card can show the one that matters without logic.
      headline: issues[0] ? { severity: issues[0].severity, title: issues[0].title } : null,
    };
  }
}

writeFileSync(
  join(ROOT, "docs", "known-issues.json"),
  `${JSON.stringify(
    {
      $comment:
        "GENERATED from packages/known-issues/src/issues.ts by scripts/build-known-issues-json.mjs. Do not edit: add issues to the TypeScript registry, which the demo pages also import.",
      issueCount: KNOWN_ISSUES.length,
      pairings: byPairing,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `wrote docs/known-issues.json (${KNOWN_ISSUES.length} issues across ${Object.keys(byPairing).length} pairings)\n`,
);
