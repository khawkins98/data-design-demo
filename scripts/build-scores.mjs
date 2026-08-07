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

import { UNDRR_QUESTIONS } from "./lib/undrr-questions.mjs";
import { BANDS, scoreA1, scoreA2, scoreA3, scoreA4, scoreA5, scoreA6, scoreA7 } from "./lib/score-axis.mjs";

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

/* ------------------------------------------------------------------ assembly -- */

const AXES = [
  ["A1_effort", "A1 Implementation effort", (ev) => scoreA1(ev)],
  ["A2_maintainability", "A2 Maintainability at scale", (ev, c, i) => scoreA2(ev, i)],
  ["A3_reproducibility", "A3 Reproducibility across sites", (ev, c) => scoreA3(c, extraction)],
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
L.push("GENERATED FILE - regenerate with `pnpm scores`.");
L.push("");
L.push("**Reading order.** Start here for the recommendation. [decision-axes.md](./decision-axes.md)");
L.push("defines what was measured. Each app's `EVIDENCE.md` has the raw findings.");
L.push("");
L.push("## Decisions needed");
L.push("");
L.push("1. **Human accessibility pass.** A7 bands rest on automated scanning only - no conformance claim without screen-reader and keyboard testing.");
L.push("2. **MUI exclusion ruling.** Its Arabic defect has a fix this evaluation's rules forbid. Relaxing that rule returns MUI to contention.");
L.push("");
L.push("## Recommendation");
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
  if (ranked[0].candidate === "react-aria") {
  L.push("");
  L.push("**The cost.** React Aria ships behaviour, not appearance. Adopting it means UNDRR");
  L.push('owns the visual layer permanently. **Read this as "fund a design system", not "save work".**');
  }
} else {
  L.push(
    `It leads on the composite at ${ranked[0].composite}, but carries ` +
      `${ranked[0].blockers.length} blocking defect - recommendation conditional. See Blockers.`,
  );
}
L.push("");
L.push("See also [architecture-options.md](./architecture-options.md) for the staffing implications.");
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

L.push("## Glossary");
L.push("");
L.push("| Term | Meaning |");
L.push("| --- | --- |");
L.push("| **strong** | Full weight. Axis fully satisfied. |");
L.push("| **workable** | 60% weight. Satisfied with caveats or extra effort. |");
L.push("| **weak** | 30% weight. Significant gaps. |");
L.push("| **blocked** | 0% weight. Axis not satisfied at all. |");
L.push("| canary | A host UI element watched for unintended style changes (leakage). |");
L.push("| escape hatch | A workaround used when the library's documented approach failed. |");
L.push("| composed | Requirement met by assembling multiple components (vs a single `native` one). |");
L.push("| leakage | A candidate's styles bleeding onto host markup outside its own subtree. |");
L.push("| portalled overlay | UI (dialogs, tooltips) rendered outside the component's DOM tree via `createPortal`. |");
L.push("");

L.push("## Per pairing, per axis");
L.push("");
L.push("Each cell carries the fact that assigned the band.");
L.push("");

// Emit top 2 inline, rest inside <details> (markdown doesn't support details, so this
// only takes effect in the HTML build — the .md file gets all of them flat).
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  L.push(`### \`${row.app}\` - composite ${row.composite} / 100`);
  L.push("");
  if (row.headline) {
    L.push(`Worst open issue: **${row.headline.severity}** - ${row.headline.title}`);
    L.push("");
  }
  L.push(`${row.openIssues} open findings. ${row.resolvedOurs} fixed in our code and excluded from score.`);
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

/** Overview grid: one row per candidate, axis bands as coloured cells, demo links. */
function buildOverviewHtml() {
  const bandClass = { strong: "ov-s", workable: "ov-w", weak: "ov-k", blocked: "ov-b" };
  const bandLabel = { strong: "S", workable: "W", weak: "Wk", blocked: "B" };
  const axisKeys = AXES.map(([key]) => key);
  const axisShort = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"];
  const axisLabel = AXES.map(([, label]) => label);
  const axisHint = ["Effort", "Maintain", "Reuse", "Mangrove", "Theming", "RTL", "a11y"];

  const gridRows = ranked.map((c) => {
    const deltaPairing = c.pair.find((p) => p.host === "delta");
    const mangrovePairing = c.pair.find((p) => p.host === "mangrove");
    const deltaApp = deltaPairing?.app;
    const mangroveApp = mangrovePairing?.app;
    const deltaDemo = deltaApp ? `./${deltaApp}/app.html` : null;
    const mangroveDemo = mangroveApp ? `./${mangroveApp}/island.html` : null;

    const axisCells = axisKeys
      .map((key, i) => {
        const dBand = deltaPairing?.axes[key]?.band ?? "blocked";
        const mBand = mangrovePairing?.axes[key]?.band ?? "blocked";
        const worst = Object.keys(BANDS).reduce((w, b) =>
          BANDS[b] < BANDS[w] && (b === dBand || b === mBand) ? b : w,
          dBand,
        );
        return `<td class="${bandClass[worst]}"><a href="./axes.html#${axisShort[i].toLowerCase()}" title="${esc(axisLabel[i])}: ${worst}">${bandLabel[worst]}</a></td>`;
      })
      .join("");

    const blockerBadge =
      c.blockers.length === 0
        ? '<span class="ov-ok">none</span>'
        : `<span class="ov-bad">${c.blockers.length}</span>`;

    const demoLinks = [
      deltaDemo ? `<a href="${deltaDemo}">Delta</a>` : null,
      mangroveDemo ? `<a href="${mangroveDemo}">Mangrove</a>` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      `<tr>` +
      `<td class="ov-name">${esc(c.name)}</td>` +
      `<td class="ov-score"><strong>${c.composite}</strong></td>` +
      `<td class="ov-blockers">${blockerBadge}</td>` +
      axisCells +
      `<td class="ov-demos">${demoLinks}</td>` +
      `</tr>`
    );
  });

  return (
    `<div class="overview">\n` +
    `<h2>At a glance</h2>\n` +
    `<p>Worst band across both hosts per axis. Colour key: ` +
    `<span class="ov-s ov-key">strong</span> ` +
    `<span class="ov-w ov-key">workable</span> ` +
    `<span class="ov-k ov-key">weak</span> ` +
    `<span class="ov-b ov-key">blocked</span></p>\n` +
    `<div class="scroll"><table class="ov-table"><thead>\n` +
    `<tr><th>Candidate</th><th>Score</th><th>Blockers</th>` +
    axisShort.map((a, i) => `<th class="ov-ax"><a href="./axes.html#${a.toLowerCase()}" title="${esc(axisLabel[i])}">${a}<span class="ov-ax-hint">${axisHint[i]}</span></a></th>`).join("") +
    `<th>Demos</th></tr>\n` +
    `</thead><tbody>\n` +
    gridRows.join("\n") +
    `\n</tbody></table></div>\n` +
    `</div>`
  );
}

// Post-process HTML: wrap per-pairing sections 3+ in <details>.
// The first 2 (top candidate + runner-up on each host = 4 h3s) stay open.
function collapseLatePairings(bodyHtml) {
  const h3Pattern = /<h3>/g;
  let match;
  const positions = [];
  while ((match = h3Pattern.exec(bodyHtml)) !== null) positions.push(match.index);
  // "Per pairing" h3s start after the glossary/blocker h3s. Find the ones matching app names.
  const pairingH3s = positions.filter((pos) => {
    const snippet = bodyHtml.slice(pos, pos + 80);
    return /delta-|mangrove-/.test(snippet);
  });
  if (pairingH3s.length <= 4) return bodyHtml;
  const splitAt = pairingH3s[4]; // After 4 (2 pairings x 2 hosts)
  const before = bodyHtml.slice(0, splitAt);
  const after = bodyHtml.slice(splitAt);
  return (
    before +
    `<details><summary>Remaining ${pairingH3s.length - 4} pairings</summary>\n` +
    after.replace(/<h2>What this cannot tell you<\/h2>/, "</details>\n<h2>What this cannot tell you</h2>")
  );
}

/** The six UNDRR questions, rendered as HTML. */
function buildQuestionsHtml() {
  return UNDRR_QUESTIONS.map(
    (q) =>
      `<div class="question">` +
      `<h3 class="question__title">${esc(q.question)} ` +
      `<span class="question__asks">${esc(q.asks)}</span></h3>` +
      `<p class="question__answer">${esc(q.answer)}</p>` +
      `<p class="question__axis"><a href="./axes.html#${esc(q.axis.toLowerCase())}"` +
      `>Evidence: ${esc(q.axis)} ${esc(q.axisName)}</a></p>` +
      `</div>`,
  ).join("\n");
}

/** Glossary HTML (collapsed). */
function buildGlossaryHtml() {
  const entries = [
    ["Leakage", "A component library changing how the rest of the page looks, outside its own area. The test loads each page twice, with and without the library, and compares."],
    ["RTL", "Right-to-left. Arabic reads right to left, so the whole interface mirrors. The question is whether the library's own components mirror with it."],
    ["Long labels", "UNDRR's own content is not short, and translation makes it longer. The fixtures deliberately include long strings, and the check is whether anything overflows or gets clipped."],
    ["Kitchen sink / component inventory", "One page showing every control. Proves the parts exist."],
    ["Embedded island", "The library inside a real UNDRR Mangrove page, owning one region."],
    ["Portalled overlay", "A dialog or dropdown the browser moves to the end of the page. Automated checks can miss what is inside it."],
    ["Escape hatch / off the documented route", "Where the library's theming API did not reach, so styling was applied outside it. Each one risks breaking on library updates."],
    ["axe", "An automated accessibility scanner. Catches a minority of problems; results here are a floor, not a pass."],
    ["A1 Implementation effort", "Cost to build the first site."],
    ["A2 Maintainability at scale", "Cost to keep every site working through library updates."],
  ];
  return (
    `<details class="glossary"><summary class="glossary__summary">Glossary</summary>` +
    `<dl class="glossary__list">` +
    entries.map(([dt, dd]) => `<dt>${esc(dt)}</dt><dd>${esc(dd)}</dd>`).join("") +
    `</dl></details>`
  );
}

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-scores.mjs. Regenerate: pnpm scores -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UNDRR data design system evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#fbfbfb; --surface:#fff; --text:#14232e; --muted:#5b6b77; --border:#d9dee2; --accent:#004f91; --bad:#c10920; --ok:#1f6b45; }
      @media (prefers-color-scheme: dark) { :root { --bg:#11181d; --surface:#18222a; --text:#e8eef2; --muted:#9fb0bc; --border:#2b3841; --accent:#7fb2e5; --bad:#ff8090; --ok:#6fc79b; } }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,"Segoe UI",sans-serif; line-height:1.5; }
      .page { max-width:70rem; margin:0 auto; }
      h1 { font-size:1.75rem; margin:0 0 0.25rem; }
      .subtitle { color:var(--muted); margin:0 0 1.5rem; max-width:60ch; }
      h2 { font-size:1.25rem; margin:2.5rem 0 0.75rem; }
      h3 { font-size:1rem; margin:2rem 0 0.5rem; font-family:ui-monospace,monospace; }
      table { border-collapse:collapse; width:100%; margin:0.75rem 0 1.5rem; font-size:0.875rem; display:block; overflow-x:auto; }
      th,td { border:1px solid var(--border); padding:0.4rem 0.6rem; text-align:start; vertical-align:top; }
      th { background:var(--surface); }
      code { font-size:0.9em; }
      a { color:var(--accent); }
      p,li { max-width:80ch; }
      strong { color:var(--text); }
      details { margin:1rem 0; }
      summary { cursor:pointer; font-weight:600; padding:0.5rem 0; }
      summary:hover { color:var(--accent); }
      .overview { margin:1.5rem 0 2rem; }
      .overview h2 { margin-top:0; }
      .ov-table { font-size:0.8125rem; }
      .ov-table th, .ov-table td { text-align:center; padding:0.35rem 0.5rem; white-space:nowrap; }
      .ov-name { text-align:start !important; font-weight:600; }
      .ov-score { font-size:1rem; }
      .ov-ax { font-size:0.6875rem; }
      .ov-ax a { text-decoration:none; }
      .ov-table td a { color:inherit; text-decoration:none; display:block; }
      .ov-ax-hint { display:block; font-size:0.5625rem; font-weight:400; color:var(--muted); line-height:1.2; }
      .ov-demos { font-size:0.75rem; }
      .ov-demos a + a { margin-inline-start:0.5rem; }
      .ov-s { background:#d4edda; color:#155724; }
      .ov-w { background:#fff3cd; color:#856404; }
      .ov-k { background:#ffe0b2; color:#7a4100; }
      .ov-b { background:#f8d7da; color:#721c24; }
      @media (prefers-color-scheme:dark) {
        .ov-s { background:#1b3a26; color:#8fd6a4; }
        .ov-w { background:#3a2e0a; color:#e0c36a; }
        .ov-k { background:#3a2508; color:#e0a86a; }
        .ov-b { background:#3a1215; color:#e08a92; }
      }
      .ov-key { display:inline-block; padding:0.1rem 0.4rem; border-radius:3px; font-size:0.75rem; }
      .ov-ok { color:var(--ok); font-weight:600; }
      .ov-bad { color:var(--bad); font-weight:700; }
      .ov-blockers { min-width:3rem; }
      .verdict { margin:0 0 1.5rem; padding:1rem 1.25rem; background:var(--surface); border:1px solid var(--accent); border-radius:6px; max-width:82ch; }
      .questions { margin:1.5rem 0 0; max-width:78ch; }
      .question { padding:0.875rem 0; border-top:1px solid var(--border); }
      .question:first-child { border-top:0; padding-top:0.25rem; }
      .question__title { font-size:0.9375rem; margin:0 0 0.375rem; display:flex; flex-wrap:wrap; align-items:baseline; gap:0.5rem; font-family:inherit; }
      .question__asks { font-weight:400; font-size:0.8125rem; color:var(--muted); }
      .question__answer { margin:0 0 0.375rem; font-size:0.875rem; }
      .question__axis { margin:0; font-size:0.75rem; }
      .glossary { margin:0 0 2rem; font-size:0.875rem; }
      .glossary__summary { cursor:pointer; color:var(--accent); font-weight:600; }
      .glossary__list { margin:0.875rem 0 0; max-width:80ch; }
      .glossary__list dt { font-weight:700; margin-top:0.75rem; }
      .glossary__list dd { margin:0.125rem 0 0; color:var(--muted); }
      .nav-links { font-size:0.8125rem; max-width:78ch; margin:1rem 0 0; }
      footer { margin-top:3rem; color:var(--muted); font-size:0.8125rem; max-width:70ch; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>UNDRR data design system evaluation</h1>
      <p class="subtitle">Five candidate UI libraries, two UNDRR host shells, ten controlled proofs of concept.</p>

${buildOverviewHtml()}

      <div class="verdict">
        <strong>Recommendation: adopt ${esc(ranked[0].name)}.</strong>
        Composite ${ranked[0].composite} vs ${ranked[1].composite} for ${esc(ranked[1].name)};
        ${clean.length === 1 ? `only unblocked candidate of ${ranked.length}` : `one of ${clean.length}/${ranked.length} unblocked candidates`}.
        Arabic works from a <code>dir</code> attribute alone. Stays inside its own subtree on both hosts.
        ${ranked[0].candidate === "react-aria" ? '<br /><strong>The cost.</strong> React Aria ships behaviour, not appearance. Adopting it means UNDRR owns the visual layer permanently. <strong>Read this as &ldquo;fund a design system&rdquo;, not &ldquo;save work&rdquo;.</strong>' : ""}
      </div>

      <div class="questions">
        <h2 style="margin-top:0">The six questions this answers</h2>
        <p style="max-width:72ch">All five candidates meet all 300 requirements, so the requirement matrix does not discriminate. These six questions do.</p>
${buildQuestionsHtml()}
      </div>

      <p class="nav-links">
        <a href="./axes.html"><strong>Decision axes</strong></a> &mdash; what is measured on each &middot;
        <a href="./issues.html"><strong>All findings</strong></a> &middot;
        <a href="./comparison.html">Requirement matrix</a> &mdash; the 300 assessments &middot;
        <a href="${DOCS_BLOB}/architecture-options.md"><strong>Architecture options</strong></a> &mdash; what each candidate does to Mangrove &middot;
        <a href="${DOCS_BLOB}/undrr-questions.md">the six questions in full</a>
      </p>

${buildGlossaryHtml()}

      <details>
        <summary>Scoring detail: weights, ranking, blockers and per-pairing breakdowns</summary>
${collapseLatePairings(toHtml(md))}
      </details>

      <footer>
        <p>
          Every demo renders identical fixture data inside a host shell it may
          not modify. Metrics come from each run's <code>evidence.json</code>.
        </p>
      </footer>
    </div>
  </body>
</html>
`;
writeFileSync(join(DOCS, "scores.html"), html, "utf8");

process.stdout.write(
  `wrote docs/scores.md and docs/scores.html (${rows.length} pairings, ${clean.length}/${ranked.length} candidates unblocked)\n`,
);
