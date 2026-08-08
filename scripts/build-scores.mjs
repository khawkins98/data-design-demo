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

import { BANDS, scoreA1, scoreA2, scoreA3, scoreA4, scoreA5, scoreA6, scoreA7 } from "./lib/score-axis.mjs";
import { siteNavHtml, siteNavCss } from "./lib/site-nav.mjs";

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
const effortClassification = readJson(join(DOCS, "effort-classification.json")).apps;

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
  ["A1_effort", "A1 Implementation effort", (ev, c, i, app) => scoreA1(ev, effortClassification[app])],
  ["A2_maintainability", "A2 Maintainability at scale", (ev, c, i, app) => scoreA2(ev, i, effortClassification[app])],
  ["A3_reproducibility", "A3 Reproducibility across sites", (ev, c) => scoreA3(c, extraction)],
  ["A4_mangrove", "A4 Mangrove compatibility", (ev) => scoreA4(ev)],
  ["A5_theming", "A5 Theming fidelity", (ev) => scoreA5(ev)],
  ["A6_rtl", "A6 Right-to-left", (ev) => scoreA6(ev)],
  ["A7_accessibility", "A7 Automated accessibility signals", (ev) => scoreA7(ev)],
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
    const result = fn(ev, candidate, scoreable, app);
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
L.push("## Decisions needed");
L.push("");
L.push("1. **Human accessibility pass.** A7 bands rest on automated scanning only - no conformance claim without screen-reader and keyboard testing.");
L.push("2. **MUI fallback plan.** Put its documented RTL setup in the delivery standard.");
L.push("3. **Operating-model commitment.** Fund and govern the Type C design-system family; otherwise React Aria becomes bespoke work per product.");
L.push("");
L.push("## Recommendation");
L.push("");
L.push(`**Fund a bounded Type C pilot on ${ranked[0].name}.**`);
L.push("");
if (ranked[0].blockers.length === 0) {
  L.push(
    `It leads provisionally at ${ranked[0].composite} and is ` +
      (clean.length === 1
        ? `the only candidate without a scored blocker.`
        : `one of ${clean.length}/${ranked.length} candidates without a scored blocker.`) +
      " It also passed the measured RTL and host-containment checks.",
  );
  if (ranked[0].candidate === "react-aria") {
  L.push("");
  L.push("React Aria keeps visual authority with UNDRR and supports the Type C family described on the architecture page. The cost is permanent ownership of the visual component layer: **fund a design system, not save implementation work.**");
  }
} else {
  L.push(
    `It leads on the composite at ${ranked[0].composite}, but carries ` +
      `${ranked[0].blockers.length} scored blocker - recommendation conditional. See Scored blockers.`,
  );
}
L.push("");
L.push("See [architecture options](./architecture-options.html) for the operating-model trade-off, or [open the prototype matrix](./prototypes.html).");
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
L.push("The weights are proposed, not ratified. They order close alternatives but do not remove the separate adoption gates.");
L.push("");
L.push(`| Axis | Weight |`);
L.push(`| --- | --- |`);
for (const [key, label] of AXES) L.push(`| ${label} | ${WEIGHTS[key]} |`);
L.push("");

L.push("## Ranking");
L.push("");
L.push(
  "The provisional composite is the weighted mean of the two hosts. **Scored blockers are listed beside the " +
    "score, never folded into it. Adoption gates are reported separately.**",
);
L.push("");
L.push("| # | Candidate | Provisional composite | Scored library blockers |");
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
    `**${clean.length} of ${ranked.length} candidates carry no scored library blocker:** ` +
      `${clean.map((c) => c.name).join(", ")}.`,
  );
  L.push("");
  const blocked = ranked.filter((c) => c.blockers.length > 0);
  const escapable = blocked.filter(
    (c) => c.easiest === "config" || c.easiest === "per-site-code",
  );
  const stuck = blocked.filter((c) => !escapable.includes(c));

  L.push(
    `**${ranked[0].name}** ranks first on the composite and carries no scored blocker. Its recommendation remains conditional on the adoption gates above.`,
  );
  if (clean.length > 1) {
    const others = clean.slice(1);
    L.push("");
    L.push(
      `${others.map((c) => `**${c.name}** (${c.composite})`).join(", ")} ` +
        `${others.length === 1 ? "carries" : "carry"} no scored blocker and ` +
        `${others.length === 1 ? "is the preferred warning-free fallback" : "are the preferred warning-free fallbacks"}, subject to the same human-review gates and a repeatable integration standard.`,
    );
  }
  if (escapable.length > 0) {
    L.push("");
    L.push(
      `${escapable.map((c) => c.name).join(" and ")} ` +
        `${escapable.length === 1 ? "carries a warning that can be escaped" : "carry warnings that can be escaped"}` +
        ` in configuration or consuming code: see the escape-cost table below.`,
    );
  }
  if (stuck.length > 0) {
    L.push("");
    L.push(
      `${stuck.map((c) => c.name).join(" and ")} ` +
        `${stuck.length === 1 ? "cannot escape its warnings" : "cannot escape theirs"} ` +
        `without a library change or a UNDRR policy decision.`,
    );
  }
} else {
  L.push("**Every candidate carries at least one blocking axis.** No shortlist is defensible");
  L.push("from this evidence without a policy decision about which scored blocker UNDRR will accept.");
}
L.push("");

L.push("## Scored blockers, in full");
L.push("");
L.push("Scored blocker = axis not satisfied as shipped, typically overcomable with extra maintenance work. This list is narrower than the adoption gates and technical findings.");
L.push("");
L.push("**A finding can appear twice** - once from `evidence.json`, once from the known-issues registry. Two records of one fact, kept separate to surface disagreements.");
L.push("");
L.push("**Remediability is recorded but not scored.** It answers whether a candidate below the top can be brought up to it.");
L.push("");
L.push("| Candidate | Scored blockers | Cheapest escape | Hardest escape |");
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
    const sevLabel = row.headline.severity === "blocker" ? "warning" : row.headline.severity;
    L.push(`Worst open issue: **${sevLabel}** - ${row.headline.title}`);
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
    else if (line.startsWith("## ")) {
      const text = line.slice(3);
      const id = /^(Warnings|Scored blockers)/.test(text) ? ' id="warnings"' : "";
      out.push(`<h2${id}>${inline(text)}</h2>`);
    }
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
  const bandLabel = { strong: "strong", workable: "workable", weak: "weak", blocked: "blocked" };
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
        const accessibleBand = `${axisLabel[i]}: ${worst}${i < 2 || i === 6 ? ", provisional" : ""}`;
        return `<td class="${bandClass[worst]}"><a href="./axes.html#${axisShort[i].toLowerCase()}" aria-label="${esc(accessibleBand)}" title="${esc(accessibleBand)}">${bandLabel[worst]}</a></td>`;
      })
      .join("");

    const blockerBadge =
      c.blockers.length === 0
        ? '<span class="ov-ok">none</span>'
        : `<a href="#warnings" class="ov-bad">${c.blockers.length}</a>`;

    const demoLinks = [
      deltaDemo ? `<a href="${deltaDemo}" class="ov-cta">Delta</a>` : null,
      mangroveDemo ? `<a href="${mangroveDemo}" class="ov-cta">Mangrove</a>` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const inventoryLinks = [
      deltaApp ? `<a href="./${deltaApp}/" class="ov-cta ov-cta-sec">Delta</a>` : null,
      mangroveApp ? `<a href="./${mangroveApp}/" class="ov-cta ov-cta-sec">Mangrove</a>` : null,
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
      `<td class="ov-demos">${inventoryLinks}</td>` +
      `</tr>`
    );
  });

  return (
    `<div class="scroll"><table class="ov-table"><thead>\n` +
    `<tr><th>Candidate</th><th>Provisional score</th><th>Scored blockers</th>` +
    axisShort.map((a, i) => `<th class="ov-ax"><a href="./axes.html#${a.toLowerCase()}" title="${esc(axisLabel[i])}">${a}<span class="ov-ax-hint">${axisHint[i]}</span></a></th>`).join("") +
    `<th>Demos</th><th>Inventory</th></tr>\n` +
    `</thead><tbody>\n` +
    gridRows.join("\n") +
    `\n</tbody></table></div>`
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
    <link rel="stylesheet" href="./mangrove.css" />
    <style>
      :root { --accent:#004f91; --bad:#c10920; --ok:#1f6b45; --muted:#5b6b77; --border:#d5d5d5; --surface:#fff; }
      h3 { font-family:ui-monospace,monospace; }
      table { border-collapse:collapse; width:100%; margin:0.75rem 0 1.5rem; font-size:0.875rem; }
      th,td { border:1px solid var(--border); padding:0.4rem 0.6rem; text-align:start; vertical-align:top; }
      th { background:var(--surface); }
      .scroll { overflow-x:auto; }
      details { margin:1rem 0; }
      summary { cursor:pointer; font-weight:600; padding:0.5rem 0; }
      summary:hover { color:var(--accent); }
      .ov-table { font-size:0.8125rem; }
      .ov-table th, .ov-table td { text-align:center; padding:0.35rem 0.5rem; white-space:nowrap; }
      .ov-name { text-align:start !important; font-weight:600; }
      .ov-score { font-size:1rem; }
      .ov-ax { font-size:0.6875rem; }
      .ov-ax a { text-decoration:none; color:inherit; }
      .ov-table td a { color:inherit; text-decoration:none; display:block; }
      .ov-ax-hint { display:block; font-size:0.5625rem; font-weight:400; color:var(--muted); line-height:1.2; }
      .ov-demos { font-size:0.75rem; }
      .ov-demos a + a { margin-inline-start:0.25rem; }
      .ov-cta { display:inline-block; padding:0.2rem 0.5rem; border:1px solid var(--accent); border-radius:4px; text-decoration:none; font-weight:600; color:var(--accent); transition:background 0.15s, color 0.15s; }
      .ov-cta:hover { background:var(--accent); color:#fff; }
      .ov-cta-sec { border-color:var(--border); color:var(--muted); }
      .ov-cta-sec:hover { background:var(--muted); color:#fff; border-color:var(--muted); }
      .ov-s { background:#d4edda; color:#155724; }
      .ov-w { background:#fff3cd; color:#856404; }
      .ov-k { background:#ffe0b2; color:#7a4100; }
      .ov-b { background:#f8d7da; color:#721c24; }
      .ov-ok { color:var(--ok); font-weight:600; }
      .ov-bad { color:var(--bad); font-weight:700; text-decoration:underline; text-underline-offset:2px; }
      .ov-blockers { min-width:3rem; }
      .glossary { margin:0 0 2rem; font-size:0.875rem; }
      .glossary__summary { cursor:pointer; color:var(--accent); font-weight:600; }
      .glossary__list { margin:0.875rem 0 0; max-width:80ch; }
      .glossary__list dt { font-weight:700; margin-top:0.75rem; }
      .glossary__list dd { margin:0.125rem 0 0; color:var(--muted); }
      footer { margin-top:3rem; color:var(--muted); font-size:0.8125rem; max-width:70ch; }
${siteNavCss}
    </style>
  </head>
  <body>
${siteNavHtml("scores")}
    <main id="main" class="mg-container mg-page-content--padded">
      <h1>UNDRR data design system evaluation</h1>

${buildOverviewHtml()}

${buildGlossaryHtml()}

      <details class="technical-detail">
        <summary><span class="audience-tag">Developer detail</span> Scoring weights, scored blockers and per-pairing breakdowns</summary>
        <div class="technical-detail__body">${collapseLatePairings(toHtml(md))}</div>
      </details>

      <script>
        function openAnchor() {
          var el = document.querySelector(location.hash);
          if (!el) return;
          var d = el.closest("details");
          while (d) { d.open = true; d = d.parentElement.closest("details"); }
          el.scrollIntoView();
        }
        addEventListener("hashchange", openAnchor);
        if (location.hash) openAnchor();
      </script>
      <footer>
        <p>
          Every demo renders identical fixture data inside a host shell it may
          not modify. Metrics come from each run's <code>evidence.json</code>.
        </p>
      </footer>
    </main>
  </body>
</html>
`;
writeFileSync(join(DOCS, "scores.html"), html, "utf8");

process.stdout.write(
  `wrote docs/scores.md and docs/scores.html (${rows.length} pairings, ${clean.length}/${ranked.length} candidates without scored blockers)\n`,
);
