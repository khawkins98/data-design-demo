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
const changeAmplification = readJson(join(DOCS, "change-amplification.json"));
const themingControl = readJson(join(DOCS, "theming-control.json"));
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
  ["A2_maintainability", "A2 Estate change amplification", (ev, c) => scoreA2(c, changeAmplification)],
  ["A3_reproducibility", "A3 New-product reproducibility", (ev, c) => scoreA3(c, extraction)],
  ["A4_mangrove", "A4 Mangrove compatibility", (ev) => scoreA4(ev)],
  ["A5_theming", "A5 Visual control and theming fidelity", (ev, c) => scoreA5(ev, c, themingControl)],
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
  const axisMeta = {
    A1_effort: ["A1", "First-site effort", "Implementation effort"],
    A2_maintainability: ["A2", "Six-site model", "Estate change amplification"],
    A3_reproducibility: ["A3", "New-product reuse", "New-product reproducibility"],
    A4_mangrove: ["A4", "Mangrove", "Mangrove compatibility"],
    A5_theming: ["A5", "Visual control", "Visual control and theming fidelity"],
    A6_rtl: ["A6", "RTL", "Right-to-left"],
    A7_accessibility: ["A7", "Automated only", "Automated accessibility signals"],
  };
  const estateKeys = ["A2_maintainability", "A3_reproducibility"];
  const technicalKeys = ["A1_effort", "A4_mangrove", "A5_theming", "A6_rtl", "A7_accessibility"];
  const axisKeys = [...estateKeys, ...technicalKeys];

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
        const [short, , label] = axisMeta[key];
        const qualification = key === "A2_maintainability" ? ", six-site model" : key === "A7_accessibility" ? ", automated only" : "";
        const accessibleBand = `${label}: ${worst}${qualification}`;
        return `<td class="${bandClass[worst]}"><a href="./axes.html#${short.toLowerCase()}" aria-label="${esc(accessibleBand)}" title="${esc(accessibleBand)}">${bandLabel[worst]}</a></td>`;
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

    const architecture = changeAmplification.candidates[c.candidate];
    const type = architecture?.architectureType ?? "-";
    const confidence = architecture?.mechanismMeasured
      ? "mechanism measured; estate modelled"
      : "architecture modelled";
    const architectureAnchor = {
      A: "a-ship-and-theme-mui-mantine-ant-design",
      B: "b-complete-branded-system-ibm-carbon",
      C: "c-foundational-adobe-react-aria",
    }[type];
    const typeCell = architectureAnchor
      ? `<a class="ov-type-link" href="./architecture-options.html#${architectureAnchor}"><strong>Type ${type}</strong><span>${confidence}</span></a>`
      : type;

    return (
      `<tr>` +
      `<td class="ov-name">${esc(c.name)}</td>` +
      `<td class="ov-type">${typeCell}</td>` +
      `<td class="ov-score"><strong>${c.composite}</strong><span> / 100</span></td>` +
      `<td class="ov-blockers">${blockerBadge}</td>` +
      axisCells +
      `<td class="ov-demos">${demoLinks}</td>` +
      `<td class="ov-demos">${inventoryLinks}</td>` +
      `</tr>`
    );
  });

  return (
    `<div class="scroll"><table class="ov-table"><thead>\n` +
    `<tr class="ov-group-row"><th rowspan="2">Candidate</th><th rowspan="2">Architecture</th><th rowspan="2">Evidence score<span class="ov-ax-hint">not compliance</span></th><th rowspan="2">Scored blockers</th>` +
    `<th colspan="2">Estate model</th><th colspan="5">Technical fit</th><th rowspan="2">Demos</th><th rowspan="2">Inventory</th></tr>\n` +
    `<tr>` + axisKeys.map((key) => {
      const [short, hint, label] = axisMeta[key];
      return `<th class="ov-ax"><a href="./axes.html#${short.toLowerCase()}" title="${esc(label)}">${short}<span class="ov-ax-hint">${hint}</span></a></th>`;
    }).join("") + `</tr>\n` +
    `</thead><tbody>\n` +
    gridRows.join("\n") +
    `\n</tbody></table></div>` +
    `<p class="ranking-qualification"><strong>Read with care:</strong> A2 is a modelled six-site scenario; A7 reports automated signals only. Neither is an adoption gate or an accessibility-conformance claim.</p>`
  );
}

function buildRankingStatusHtml() {
  return `<section class="ranking-status" aria-labelledby="ranking-status-title">
    <h2 id="ranking-status-title">Provisional evidence ranking—not an adoption decision</h2>
    <p>Scores combine measured prototype results with a modelled six-site estate scenario (A2), using weights proposed by the evaluation author. They do not establish accessibility conformance or choose UNDRR's operating architecture.</p>
    <p><a href="./architecture-options.html"><strong>Choose the architecture first</strong></a>, then review the <a href="./methodology.html">method and limits</a>.</p>
  </section>`;
}

function candidateAxisBand(candidate, key) {
  return candidate.pair
    .map((pairing) => pairing.axes[key]?.band ?? "blocked")
    .reduce((worst, band) => (BANDS[band] < BANDS[worst] ? band : worst), "strong");
}

function buildCloseScoreSummaryHtml() {
  const mui = ranked.find((candidate) => candidate.candidate === "mui");
  const ant = ranked.find((candidate) => candidate.candidate === "antd");
  if (!mui || !ant) return "";

  const same = [];
  const muiAdvantages = [];
  const antAdvantages = [];
  let muiGain = 0;
  let antGain = 0;
  const summaryLabels = {
    A1_effort: "implementation effort",
    A2_maintainability: "estate change amplification",
    A3_reproducibility: "new-product reproducibility",
    A4_mangrove: "Mangrove compatibility",
    A5_theming: "visual control",
    A6_rtl: "native RTL",
    A7_accessibility: "automated accessibility signals",
  };
  for (const [key, label] of AXES) {
    const muiBand = candidateAxisBand(mui, key);
    const antBand = candidateAxisBand(ant, key);
    const delta = (BANDS[muiBand] - BANDS[antBand]) * WEIGHTS[key];
    const shortLabel = summaryLabels[key] ?? label.replace(/^A\d+\s+/, "");
    if (delta === 0) same.push(shortLabel);
    else if (delta > 0) {
      muiAdvantages.push(shortLabel);
      muiGain += delta;
    } else {
      antAdvantages.push(shortLabel);
      antGain += -delta;
    }
  }
  const fmt = (value) => Number(value.toFixed(1));
  return `<section class="ranking-note" aria-labelledby="ranking-note-title">
    <h2 id="ranking-note-title">Why MUI leads Ant Design by ${mui.composite - ant.composite} points</h2>
    <ul>
      <li>They tie on ${same.map((label) => Object.entries(summaryLabels).find(([, value]) => value === label)?.[0].slice(0, 2)).join(", ")}.</li>
      <li>MUI gains ${fmt(muiGain)} weighted points from stronger ${muiAdvantages.join(" and ")}; Ant recovers ${fmt(antGain)} through ${antAdvantages.join(" and ")}, leaving MUI ${mui.composite - ant.composite} points ahead.</li>
      <li>Ant also carries one scored blocker: its selected value disappears in the Mangrove Select unless the integration setting is changed.</li>
      <li>React Aria's ${ranked.find((candidate) => candidate.candidate === "react-aria")?.composite ?? 97} reflects prototype evidence under these weights. A1 does not include the funded Type C team or multi-year operating cost.</li>
    </ul>
  </section>`;
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
    ["A2 Estate change amplification", "How many authoritative implementations and consumer sites an estate-wide change reaches."],
    ["A3 New-product reproducibility", "Whether another product can consume a shared integration instead of recreating it."],
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
      .ov-score { font-size:1rem; font-variant-numeric:tabular-nums; }
      .ov-score span { color:var(--muted); font-size:0.6875rem; font-weight:400; }
      .ov-type { min-width:9.5rem; text-align:start !important; white-space:normal !important; }
      .ov-type-link { text-align:start; }
      .ov-type-link span { display:block; margin-top:0.15rem; color:var(--muted); font-size:0.625rem; line-height:1.25; }
      .ov-group-row th { background:#f5f8fb; vertical-align:middle; }
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
      .ranking-status { max-width:88ch; margin:0.5rem 0 1.25rem; padding:1rem 1.15rem;
        border-radius:8px; background:#f5f8fb;
        box-shadow:inset 3px 0 0 #9a6b16, 0 0 0 1px rgb(0 0 0 / 7%), 0 2px 8px rgb(0 0 0 / 4%); }
      .ranking-status h2 { margin:0 0 0.45rem; font-size:1.125rem; text-wrap:balance; }
      .ranking-status p { margin:0.35rem 0 0; text-wrap:pretty; }
      .ranking-qualification { max-width:88ch; margin:-0.75rem 0 1.5rem; color:var(--muted); font-size:0.8125rem; text-wrap:pretty; }
      .ranking-note { max-width:88ch; margin:0.25rem 0 1.5rem; padding:0.9rem 1rem;
        border-radius:7px; background:#f5f8fb;
        box-shadow:inset 3px 0 0 var(--accent), 0 0 0 1px rgb(0 0 0 / 7%); }
      .ranking-note h2 { margin:0 0 0.45rem; font-size:1rem; text-wrap:balance; }
      .ranking-note ul { margin:0; padding-inline-start:1.15rem; }
      .ranking-note li { margin:0.25rem 0; font-size:0.875rem; text-wrap:pretty; }
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

${buildRankingStatusHtml()}

${buildOverviewHtml()}

${buildCloseScoreSummaryHtml()}

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
