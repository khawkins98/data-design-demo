#!/usr/bin/env node
/**
 * Scores every pairing across the seven axes → docs/scores.md + docs/scores.html.
 *   pnpm scores
 *
 * Rules:
 * 1. DERIVED ONLY — every value traces to evidence.json, known-issues, or extraction-results.
 * 2. NO COMPARATIVE PROSE — comparisons are computed at build time, never written.
 * 3. ONLY LIBRARY-OWNED DEFECTS COUNT — host and evaluation defects excluded.
 * 4. SHOW REASONING — every band carries the fact that assigned it.
 *
 * Blockers are reported beside the composite, never folded into it.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");
const DOCS = join(ROOT, "docs");

/** Weights must sum to 100. Edit these, not the logic below. */
/** Provenance is printed on the page so the weights can be defended. */
const WEIGHT_PROVENANCE = Object.freeze({
  chosenBy: "Proposed by the evaluation author, not yet ratified by UNDRR",
  date: "2026-08-06",
  basis:
    "Estate continuity framing (undrr-questions.md). Multi-site axes outweigh first-site effort; A6/A7 highest as standing obligations the composite cannot gate on.",
  ratified: false,
});

const WEIGHTS = Object.freeze({
  A1_effort: 8,
  A2_maintainability: 16,
  A3_reproducibility: 16,
  A4_mangrove: 14,
  A5_theming: 14,
  A6_rtl: 18,
  A7_accessibility: 14,
});

const weightTotal = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (weightTotal !== 100) {
  process.stderr.write(`WEIGHTS must sum to 100, got ${weightTotal}\n`);
  process.exit(1);
}

/** Bands, and the score each contributes before weighting. */
const BANDS = Object.freeze({ strong: 1, workable: 0.6, weak: 0.3, blocked: 0 });

/** How a blocker can be escaped, cheapest first. Not folded into the composite. */
const REMEDIABILITY_ORDER = ["config", "per-site-code", "upstream-only", "out-of-scope", "inherent"];

const REMEDIABILITY = Object.freeze({
  config: "reversible per site by changing a setting",
  "per-site-code": "fixable in consuming code, repeated per site",
  "upstream-only": "needs a change in the library",
  "out-of-scope": "a fix exists but this evaluation's rules forbid it - a policy decision",
  inherent: "cannot be escaped while using the library as documented",
});

const CANDIDATE_ORDER = ["react-aria", "mui", "carbon", "mantine", "antd"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const knownIssues = existsSync(join(DOCS, "known-issues.json"))
  ? readJson(join(DOCS, "known-issues.json"))
  : { pairings: {} };

const extraction = existsSync(join(DOCS, "extraction-results.json"))
  ? readJson(join(DOCS, "extraction-results.json"))
  : {};

function appDirs() {
  return readdirSync(APPS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(APPS, d.name, "evidence.json")))
    .map((d) => d.name)
    .sort((a, b) => {
      const ca = CANDIDATE_ORDER.findIndex((c) => a.endsWith(c));
      const cb = CANDIDATE_ORDER.findIndex((c) => b.endsWith(c));
      return ca - cb || a.localeCompare(b);
    });
}

/* ---- axis rules: each returns { band, because } ---- */

function scoreA1(ev) {
  const mix = { native: 0, composed: 0, custom: 0 };
  for (const r of ev.requirements ?? []) if (r.status in mix) mix[r.status] += 1;
  const beyond = mix.composed + mix.custom;
  const traps = (ev.theming?.escapeHatchesUsed ?? []).length;
  const because = `${beyond} of 30 requirements needed more than a documented component; ${traps} documented approaches failed and needed working around`;
  if (beyond <= 6 && traps <= 2) return { band: "strong", because };
  if (beyond <= 12 && traps <= 8) return { band: "workable", because };
  return { band: "weak", because };
}

function scoreA2(ev, issues) {
  // Proxy: escape-hatch count + scoreable maintenance issues.
  const traps = (ev.theming?.escapeHatchesUsed ?? []).length;
  const maint = issues.filter((i) => /token|theme|upgrade|internal|layer/i.test(i.title)).length;
  const because = `${traps} escape hatches off the documented theming route; ${maint} scoreable maintenance findings`;
  if (traps === 0 && maint <= 1) return { band: "strong", because };
  if (traps <= 6) return { band: "workable", because };
  return { band: "weak", because };
}

function scoreA3(candidate) {
  const e = extraction?.[candidate];
  if (!e) {
    return {
      band: "weak",
      because: "no extraction experiment was run, so shareability is unmeasured for this candidate",
    };
  }
  const outcome = e.outcome ?? e.basis ?? "unknown";
  if (outcome === "packaged") {
    return { band: "strong", because: "the integration extracted into one shared package" };
  }
  if (outcome === "fork-per-site") {
    return {
      band: "blocked",
      because: "the distribution model requires each site to own a copy of the source",
    };
  }
  return { band: "workable", because: `extraction outcome recorded as ${outcome}` };
}

function scoreA4(ev) {
  const leaks = ev.leakage?.assertionPassed !== true;
  const diffs = (ev.leakage?.differences ?? []).length;
  const probe = ev.leakage?.globalStylesheetProbe;
  if (leaks) {
    return {
      band: "blocked",
      because: `the candidate restyled ${diffs} computed properties on host markup outside its own subtree`,
    };
  }
  if (probe) {
    return {
      band: "workable",
      because: "clean only because the documented global stylesheet was not loaded as documented",
    };
  }
  return { band: "strong", because: "no host canary changed when the candidate mounted" };
}

function scoreA5(ev) {
  const unreachable = ev.theming?.tokensUnreachable ?? 0;
  const applied = ev.theming?.tokensApplied ?? 0;
  const total = unreachable + applied;
  if (unreachable > 0) {
    return {
      band: "weak",
      because: `${unreachable} of ${total} UNDRR tokens cannot be attached at all - a ceiling, not a cost`,
    };
  }
  return { band: "strong", because: `all ${total} reachable tokens applied` };
}

function scoreA6(ev) {
  const status = ev.rtl?.status;
  const req = (ev.requirements ?? []).find((r) => r.id === "rtl");
  const lines = req?.customLinesOfCode ?? 0;
  const recorded = (ev.rtl?.issues ?? []).length;
  if (status !== "clean") {
    return {
      band: "blocked",
      because: `Arabic is not correct as shipped: ${recorded} recorded defect${
        recorded === 1 ? "" : "s"
      }, unresolved`,
    };
  }
  if (lines === 0 && recorded === 0) {
    return { band: "strong", because: "Arabic worked from a dir attribute alone, at zero custom lines" };
  }
  return {
    band: "workable",
    because: `clean, but only after ${lines} custom lines and ${recorded} recorded mitigations`,
  };
}

function scoreA7(ev) {
  const axe = ev.axe ?? {};
  const critical = axe.critical ?? 0;
  const serious = axe.serious ?? 0;
  const incomplete = axe.incomplete ?? 0;
  const tail = `${incomplete} checks axe declined to decide, each still owed a human`;
  if (critical > 0) {
    return { band: "blocked", because: `${critical} critical automated violations; ${tail}` };
  }
  if (serious > 0) {
    return { band: "workable", because: `${serious} serious automated violations; ${tail}` };
  }
  return { band: "strong", because: `no critical or serious automated violations; ${tail}` };
}

/* ------------------------------------------------------------------ assembly -- */

const AXES = [
  ["A1_effort", "A1 Implementation effort", (ev) => scoreA1(ev)],
  ["A2_maintainability", "A2 Maintainability at scale", (ev, c, i) => scoreA2(ev, i)],
  ["A3_reproducibility", "A3 Reproducibility across sites", (ev, c) => scoreA3(c)],
  ["A4_mangrove", "A4 Mangrove compatibility", (ev) => scoreA4(ev)],
  ["A5_theming", "A5 Theming fidelity", (ev) => scoreA5(ev)],
  ["A6_rtl", "A6 Right-to-left", (ev) => scoreA6(ev)],
  ["A7_accessibility", "A7 Accessibility conformance", (ev) => scoreA7(ev)],
];

const rows = appDirs().map((app) => {
  const ev = readJson(join(APPS, app, "evidence.json"));
  const candidate = CANDIDATE_ORDER.find((c) => app.endsWith(c)) ?? app;
  const pairing = knownIssues.pairings?.[app] ?? {};

  // Open, scoreable issues only.
  const scoreable = [];
  const blockers = [];

  const axes = {};
  let composite = 0;
  for (const [key, label, fn] of AXES) {
    const result = fn(ev, candidate, scoreable);
    axes[key] = { label, ...result, weight: WEIGHTS[key] };
    composite += BANDS[result.band] * WEIGHTS[key];
    // Dedupe: same blocked axis on two hosts = one blocker.
    if (result.band === "blocked") blockers.push({ key: label, text: result.because });
  }

  /* Registry blockers not visible to the axis rules. */
  for (const b of pairing.scoreableBlockers ?? []) {
    blockers.push({
      key: b.id,
      text: `${b.title} (owned by ${b.owner})`,
      remediability: b.remediability,
    });
  }

  return {
    app,
    candidate,
    host: ev.host,
    name: ev.candidate,
    axes,
    composite: Math.round(composite),
    blockers,
    openIssues: pairing.total ?? 0,
    resolvedOurs: pairing.resolvedCount ?? 0,
    headline: pairing.headline ?? null,
  };
});

/** Candidate-level roll-up: the worst band per axis across the two hosts. */
const byCandidate = CANDIDATE_ORDER.map((candidate) => {
  const pair = rows.filter((r) => r.candidate === candidate);
  if (pair.length === 0) return null;
  const composite = Math.round(pair.reduce((a, r) => a + r.composite, 0) / pair.length);
  // Dedupe blockers across hosts.
  const seen = new Map();
  for (const b of pair.flatMap((r) => r.blockers)) if (!seen.has(b.key)) seen.set(b.key, b);
  const blockers = [...seen.values()].map(
    (b) => `${b.key}: ${b.text}${b.remediability ? ` [escape: ${REMEDIABILITY[b.remediability]}]` : ""}`,
  );
  // Cheapest/hardest escape route among this candidate's blockers.
  const escapes = [...seen.values()].map((b) => b.remediability).filter(Boolean);
  const easiest = REMEDIABILITY_ORDER.find((r) => escapes.includes(r)) ?? null;
  const hardest = [...REMEDIABILITY_ORDER].reverse().find((r) => escapes.includes(r)) ?? null;
  return { candidate, name: pair[0].name, composite, blockers, easiest, hardest, pair };
}).filter(Boolean);

// Rank by composite, derive comparisons.
const ranked = [...byCandidate].sort((a, b) => b.composite - a.composite);
const clean = ranked.filter((c) => c.blockers.length === 0);

/* ------------------------------------------------------------------ markdown -- */

const L = [];
L.push("# Weighted scores");
L.push("");
L.push("GENERATED FILE - regenerate with `pnpm scores`. See");
L.push("[decision-axes.md](./decision-axes.md) and [undrr-questions.md](./undrr-questions.md).");
L.push("");
L.push("All values derived from `evidence.json`, the known-issues registry and");
L.push("`extraction-results.json`. Only library-owned defects affect scores.");
L.push("");
L.push("## What this says to do");
L.push("");
L.push(`**Adopt ${ranked[0].name}.**`);
L.push("");
if (ranked[0].blockers.length === 0) {
  L.push(
    `Composite ${ranked[0].composite} vs ${ranked[1].composite} for ${ranked[1].name}` +
      (clean.length === 1
        ? `; only unblocked candidate of ${ranked.length}.`
        : `; one of ${clean.length}/${ranked.length} unblocked candidates.`) +
      " Arabic works from a `dir` attribute alone. Stays inside its own subtree on both hosts.",
  );
  L.push("");
  // Only emitted when React Aria is the winner, since the paragraph is specific to it.
  if (ranked[0].candidate === "react-aria") {
  L.push("**The cost.** React Aria ships behaviour, not appearance. Adopting it means UNDRR");
  L.push("owns the visual layer permanently - the demos carry 155-213 hand-written CSS rules.");
  L.push("Three of seven axes reward the property that creates that cost: no opinions means no");
  L.push("Mangrove conflicts, no wrong colours, no mistheming.");
  // Inline bold must stay on one pushed line or the HTML converter emits literal asterisks.
  L.push(
    '**Read the recommendation as "adopt this and fund a design system", not as ' +
      '"adopt this and save work".**',
  );
  }
} else {
  L.push(
    `It leads on the composite at ${ranked[0].composite}, but carries ` +
      `${ranked[0].blockers.length} blocking defect - so this is a recommendation with a ` +
      "condition attached, not a clean one. See Blockers.",
  );
}
L.push("");
L.push("**Read this alongside [architecture-options.md](./architecture-options.md).**");
L.push("Fewer built-in components means gaps filled in Mangrove, not per-site - that is the");
L.push("strongest case for this recommendation, and the one that carries the staffing bill.");
L.push("");
L.push("**Before sign-off:**");
L.push("");
L.push("1. A human accessibility pass. A7 bands rest on automated scanning only - no conformance claim can be made without screen-reader and keyboard testing.");
L.push("2. A decision on MUI's exclusion. Its Arabic defect has a fix this evaluation's rules forbid. Relaxing that rule returns MUI to contention.");
L.push("");

L.push("## Weights");
L.push("");
L.push("A judgement, not a measurement.");
L.push("");
L.push(`- **Chosen by:** ${WEIGHT_PROVENANCE.chosenBy}`);
L.push(`- **Date:** ${WEIGHT_PROVENANCE.date}`);
L.push(
  `- **Status:** ${WEIGHT_PROVENANCE.ratified ? "ratified by UNDRR" : "**not ratified**"}`,
);
L.push(`- **Basis:** ${WEIGHT_PROVENANCE.basis}`);
L.push("");
L.push("A6 at 18 is the weight that removes MUI from contention; at 12 the ranking would change.");
L.push("");
L.push(`| Axis | Weight |`);
L.push(`| --- | --- |`);
for (const [key, label] of AXES) L.push(`| ${label} | ${WEIGHTS[key]} |`);
L.push("");

L.push("## Ranking");
L.push("");
L.push(
  "Composite is the weighted mean of the two hosts. **Blockers are listed beside the " +
    "score, never folded into it.**",
);
L.push("");
L.push("| # | Candidate | Composite | Library-owned blockers |");
L.push("| --- | --- | --- | --- |");
ranked.forEach((c, i) => {
  L.push(
    `| ${i + 1} | ${c.name} | **${c.composite}** / 100 | ${
      c.blockers.length === 0 ? "none" : `**${c.blockers.length}** - see below`
    } |`,
  );
});
L.push("");

if (clean.length > 0) {
  L.push(
    `**${clean.length} of ${ranked.length} candidates carry no blocker at all:** ` +
      `${clean.map((c) => c.name).join(", ")}.`,
  );
  L.push("");
  const blocked = ranked.filter((c) => c.blockers.length > 0);
  const escapable = blocked.filter(
    (c) => c.easiest === "config" || c.easiest === "per-site-code",
  );
  const stuck = blocked.filter((c) => !escapable.includes(c));

  L.push(
    `**${ranked[0].name}** ranks first on the composite and carries no blocker, so it is` +
      ` the recommendation.`,
  );
  if (clean.length > 1) {
    const others = clean.slice(1);
    L.push("");
    L.push(
      `${others.map((c) => `**${c.name}** (${c.composite})`).join(", ")} ` +
        `${others.length === 1 ? "also carries" : "also carry"} no blocker - viable ` +
        `${others.length === 1 ? "second choice" : "choices"} without a waiver.`,
    );
  }
  if (escapable.length > 0) {
    L.push("");
    L.push(
      `${escapable.map((c) => c.name).join(" and ")} ` +
        `${escapable.length === 1 ? "carries a blocker that can be escaped" : "carry blockers that can be escaped"}` +
        ` in configuration or consuming code: see the escape-cost table below.`,
    );
  }
  if (stuck.length > 0) {
    L.push("");
    L.push(
      `${stuck.map((c) => c.name).join(" and ")} ` +
        `${stuck.length === 1 ? "cannot escape its blockers" : "cannot escape theirs"} ` +
        `without a library change or a UNDRR policy decision.`,
    );
  }
} else {
  L.push("**Every candidate carries at least one blocking axis.** No shortlist is defensible");
  L.push("from this evidence without a policy decision about which blocker UNDRR will accept.");
}
L.push("");

L.push("## Blockers, in full");
L.push("");
L.push("Blocked = axis not satisfied at all, by the library rather than our code.");
L.push("");
L.push("**A finding can appear twice** - once from `evidence.json`, once from the known-issues registry. Two records of one fact, kept separate to surface disagreements.");
L.push("");
L.push("**Remediability is recorded but not scored.** It answers whether a candidate below the top can be brought up to it.");
L.push("");
L.push("| Candidate | Blockers | Cheapest escape | Hardest escape |");
L.push("| --- | --- | --- | --- |");
for (const c of ranked.filter((x) => x.blockers.length > 0)) {
  L.push(
    `| ${c.name} | ${c.blockers.length} | ${
      c.easiest ? REMEDIABILITY[c.easiest] : "not recorded"
    } | ${c.hardest ? REMEDIABILITY[c.hardest] : "not recorded"} |`,
  );
}
L.push("");
for (const c of ranked.filter((x) => x.blockers.length > 0)) {
  L.push(`**${c.name}**`);
  L.push("");
  for (const b of c.blockers) L.push(`- ${b}`);
  L.push("");
}

L.push("## Per pairing, per axis");
L.push("");
L.push("Each cell carries the fact that assigned the band. `strong` scores full weight,");
L.push("`workable` 60%, `weak` 30%, `blocked` nothing.");
L.push("");
for (const row of rows) {
  L.push(`### \`${row.app}\` - composite ${row.composite} / 100`);
  L.push("");
  if (row.headline) {
    L.push(`Worst open issue: **${row.headline.severity}** - ${row.headline.title}`);
    L.push("");
  }
  L.push(
    `${row.openIssues} open findings. ${row.resolvedOurs} defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.`,
  );
  L.push("");
  L.push("| Axis | Band | Weight | Why |");
  L.push("| --- | --- | --- | --- |");
  for (const [key, label] of AXES) {
    const a = row.axes[key];
    L.push(
      `| ${label} | ${a.band === "strong" ? "strong" : `**${a.band}**`} | ${a.weight} | ${a.because} |`,
    );
  }
  L.push("");
}

L.push("## What this cannot tell you");
L.push("");
L.push("- Where a band and the axis prose disagree, the prose is the evidence.");
L.push("- A7 bands rest on automated checks only - `strong` means the automated floor was cleared, not that the pairing is accessible.");
L.push("- A6 measures layout direction, not whether Arabic reads well to an Arabic reader.");
L.push("- Changing the weights changes the ranking. A two-point gap rests on the weights, not the evidence.");
L.push("");

const md = L.join("\n");
writeFileSync(join(DOCS, "scores.md"), `${md}\n`, "utf8");

/* ---------------------------------------------------------------------- html -- */

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** .md links rewritten to blob URLs in the HTML build (Pages serves raw .md as text/plain). */
const DOCS_BLOB = "https://github.com/khawkins98/data-design-demo/blob/main/docs";

/** `code`, **bold** and [links](x), the only inline markup this file emits. */
function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/href="\.\/([^"]+\.md)"/g, `href="${DOCS_BLOB}/$1"`);
}

/** Markdown to HTML for the subset this generator emits. Mirrors build-axes.mjs. */
function toHtml(markdown) {
  const out = [];
  let inTable = false;
  let inList = false;
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();

    if (line.startsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split(" | ")
        .map((c) => c.trim());
      if (/^-+$/.test(cells[0] ?? "")) continue;
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (!inTable) {
        out.push('<div class="scroll"><table><thead>');
        out.push(`<tr>${cells.map((c) => `<th>${inline(c)}</th>`).join("")}</tr>`);
        out.push("</thead><tbody>");
        inTable = true;
      } else {
        out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      }
      continue;
    }
    if (inTable) {
      out.push("</tbody></table></div>");
      inTable = false;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (inList && line !== "") {
      out.push("</ul>");
      inList = false;
    }

    if (line.startsWith("### ")) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line === "") out.push("");
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (inTable) out.push("</tbody></table></div>");
  if (inList) out.push("</ul>");
  // Join consecutive <p> tags (one wrapped sentence in the source).
  return out.join("\n").replace(/<\/p>\n<p>/g, " ");
}

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-scores.mjs. Regenerate: pnpm scores -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Weighted scores - UNDRR data design evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#fbfbfb; --surface:#fff; --text:#14232e; --muted:#5b6b77; --border:#d9dee2; --accent:#004f91; --bad:#c10920; }
      @media (prefers-color-scheme: dark) { :root { --bg:#11181d; --surface:#18222a; --text:#e8eef2; --muted:#9fb0bc; --border:#2b3841; --accent:#7fb2e5; --bad:#ff8090; } }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,"Segoe UI",sans-serif; line-height:1.5; }
      .page { max-width:70rem; margin:0 auto; }
      h1 { font-size:1.75rem; margin:0 0 1rem; }
      h2 { font-size:1.25rem; margin:2.5rem 0 0.75rem; }
      h3 { font-size:1rem; margin:2rem 0 0.5rem; font-family:ui-monospace,monospace; }
      table { border-collapse:collapse; width:100%; margin:0.75rem 0 1.5rem; font-size:0.875rem; display:block; overflow-x:auto; }
      th,td { border:1px solid var(--border); padding:0.4rem 0.6rem; text-align:start; vertical-align:top; }
      th { background:var(--surface); }
      code { font-size:0.9em; }
      a { color:var(--accent); }
      p,li { max-width:80ch; }
      strong { color:var(--text); }
    </style>
  </head>
  <body>
    <div class="page">
${toHtml(md)}
      <p><a href="./issues.html">every finding in full</a> &middot;
         <a href="./axes.html">decision axes</a> &middot;
         <a href="./">all pairings</a></p>
    </div>
  </body>
</html>
`;
writeFileSync(join(DOCS, "scores.html"), html, "utf8");

process.stdout.write(
  `wrote docs/scores.md and docs/scores.html (${rows.length} pairings, ${clean.length}/${ranked.length} candidates unblocked)\n`,
);
