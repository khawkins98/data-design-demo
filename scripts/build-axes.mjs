#!/usr/bin/env node
/**
 * Scores every pairing on seven decision axes; writes docs/axes.md and
 * docs/axes.html. Axis definitions: docs/decision-axes.md.
 *
 *   pnpm axes
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { axisPreamble } from "./lib/undrr-questions.mjs";
import { scoreA1, scoreA2, scoreA3, scoreA4, scoreA5, scoreA6, scoreA7 } from "./lib/score-axis.mjs";
import { siteNavHtml, siteNavCss } from "./lib/site-nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");
const DOCS = join(ROOT, "docs");

/**
 * Styling hooks, classified by the library's documented promise:
 * - contract: documented styling API (Mantine static classes, MUI globals)
 * - convention: stable but off the documented theming route (Carbon BEM, Ant BEM)
 * - generated: hashed internal classes (Mantine CSS-module, Emotion)
 */
const HOOK_TIERS = [
  {
    tier: "contract",
    label: "documented styling API",
    patterns: [
      /\.mantine-[A-Z][A-Za-z]*(?:-[a-zA-Z]+)?/g, // Mantine static classes
      /\.mantine-focus-[a-z]+/g, // Mantine documented focus utilities
      /\.Mui[A-Z][A-Za-z]+(?:-[a-zA-Z]+)?/g, // MUI documented global classes
    ],
  },
  {
    tier: "convention",
    label: "off the documented theming route",
    patterns: [
      /\.cds--[a-z0-9-]+/g, // Carbon BEM, prefix configurable
      /\.ant-[a-z0-9-]+/g, // Ant Design BEM
    ],
  },
  {
    tier: "generated",
    label: "hashed internal class",
    patterns: [
      /\.m_[a-f0-9]{6,}/g, // Mantine CSS-module hashes
      /\.css-[a-z0-9]{6,}/g, // Emotion hashes
    ],
  },
];

/** Attribute selectors (`data-*`, `slot`) that survive DOM restructuring. */
const ATTRIBUTE_HOOK_PATTERN = /\[(?:data-[a-z-]+|slot)(?:[~^$*|]?=[^\]]*)?\]/g;

/** Candidate id -> display name, in the order the comparison uses. */
const CANDIDATE_ORDER = ["react-aria", "mui", "carbon", "mantine", "antd", "shadcn"];

function appDirs() {
  if (!existsSync(APPS)) return [];
  return readdirSync(APPS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(APPS, d.name, "evidence.json")))
    .map((d) => d.name)
    .sort((a, b) => {
      const ca = CANDIDATE_ORDER.findIndex((c) => a.endsWith(c));
      const cb = CANDIDATE_ORDER.findIndex((c) => b.endsWith(c));
      return ca - cb || a.localeCompare(b);
    });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Concatenates every stylesheet a demo authors itself. */
function ownStylesheets(app) {
  const src = join(APPS, app, "src");
  if (!existsSync(src)) return "";
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = join(dir, d.name);
      if (d.isDirectory()) return walk(p);
      return d.name.endsWith(".css") || d.name.endsWith(".scss") ? [p] : [];
    });
  const paths = walk(src);
  // Shared integration CSS remains part of each product's styling surface even
  // after extraction. Omitting it would make packaging look like CSS vanished.
  if (app.endsWith("react-aria")) {
    paths.push(join(ROOT, "packages", "integration-react-aria", "src", "records.css"));
  }
  return paths
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
}

/** Strips CSS comments so class names mentioned in prose are not counted as hooks. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** A2: classifies each distinct styling hook by the promise behind it. */
function stylingHooks(rawCss) {
  const css = stripComments(rawCss);

  const byTier = { contract: new Set(), convention: new Set(), generated: new Set() };
  for (const { tier, patterns } of HOOK_TIERS) {
    for (const pattern of patterns) {
      for (const m of css.matchAll(pattern)) byTier[tier].add(m[0]);
    }
  }
  // A hook matched by a more specific tier must not also count in a looser one.
  // `.mantine-focus-auto` matches the static-class pattern too; keep it once.
  for (const name of byTier.generated) byTier.contract.delete(name);

  const attributes = new Set();
  for (const m of css.matchAll(ATTRIBUTE_HOOK_PATTERN)) attributes.add(m[0]);

  // Rule count is deliberately crude; it is a supporting figure only.
  const rules = (css.match(/^\s*[.[#a-zA-Z*:][^{}]*\{/gm) ?? []).length;

  return {
    attributes: attributes.size,
    contract: byTier.contract.size,
    convention: byTier.convention.size,
    generated: byTier.generated.size,
    offRoute: byTier.convention.size + byTier.generated.size,
    names: {
      contract: [...byTier.contract].sort(),
      convention: [...byTier.convention].sort(),
      generated: [...byTier.generated].sort(),
    },
    rules,
  };
}

/**
 * A5: how a Mangrove token change reaches a built site.
 * `var(--undrr-*)` in shipped CSS = stylesheet swap; baked values = rebuild per site.
 */
function propagation(app) {
  const dist = join(APPS, app, "dist", "assets");
  if (!existsSync(dist)) return { model: "unknown", cssVarRefs: null };
  const css = readdirSync(dist)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(dist, f), "utf8"))
    .join("\n");
  const cssVarRefs = (css.match(/var\(--undrr-/g) ?? []).length;
  // The split is stark in practice (0-6 versus 157-257), so a low threshold is
  // safe. Anything ambiguous should be read as ambiguous, not rounded.
  let model;
  if (cssVarRefs >= 50) model = "stylesheet-swap";
  else if (cssVarRefs === 0) model = "rebuild-per-site";
  else model = "mostly-rebuild";
  return { model, cssVarRefs };
}

/** A1: requirement mix. */
function requirementMix(evidence) {
  const mix = { native: 0, composed: 0, custom: 0, unsupported: 0 };
  for (const r of evidence.requirements ?? []) {
    const status = typeof r === "string" ? r : r.status;
    if (status in mix) mix[status] += 1;
  }
  return mix;
}

/** A3: read the extraction experiment's output if it has been run. */
function extraction() {
  const path = join(DOCS, "extraction-results.json");
  return existsSync(path) ? readJson(path) : null;
}

const extractionResults = extraction();
const changeAmplification = readJson(join(DOCS, "change-amplification.json"));

/**
 * Production dependency counts measured by one method for all apps (`pnpm deps:count`).
 * Per-run self-reported counts disagree and reorder candidates; both are shown.
 */
const dependencyCounts = existsSync(join(DOCS, "dependency-counts.json"))
  ? readJson(join(DOCS, "dependency-counts.json")).apps
  : {};
const effortClassification = readJson(join(DOCS, "effort-classification.json")).apps;

const rows = appDirs().map((app) => {
  const evidence = readJson(join(APPS, app, "evidence.json"));
  const hooks = stylingHooks(ownStylesheets(app));
  const mix = requirementMix(evidence);
  const prop = propagation(app);
  const candidate = CANDIDATE_ORDER.find((c) => app.endsWith(c)) ?? app;
  const effort = effortClassification[app];
  const allEffortIndexes = Object.values(effort).flat();
  const noteCount = (evidence.theming?.escapeHatchesUsed ?? []).length;
  if (new Set(allEffortIndexes).size !== noteCount || allEffortIndexes.some((i) => i < 1 || i > noteCount)) {
    throw new Error(`effort-classification.json is not exhaustive and disjoint for ${app}`);
  }

  return {
    app,
    candidate,
    host: evidence.host,
    name: evidence.candidate,
    evidence,
    mix,
    beyondNative: mix.composed + mix.custom,
    wrappers: evidence.wrappers ?? {},
    effort,
    escapeHatches: effort.offRouteOverrides.length,
    escapeHatchText: effort.offRouteOverrides.map((i) => evidence.theming.escapeHatchesUsed[i - 1]),
    humanReview: (evidence.humanReviewRequired ?? []).length,
    hooks,
    declaredOverridesInternals: evidence.customCss?.overridesLibraryInternals ?? null,
    cssLines: evidence.customCss?.lines ?? null,
    tokensApplied: evidence.theming?.tokensApplied ?? null,
    tokensUnreachable: evidence.theming?.tokensUnreachable ?? null,
    propagation: prop,
    leakagePassed: evidence.leakage?.assertionPassed === true,
    leakageDiffs: (evidence.leakage?.differences ?? []).length,
    globalProbe: evidence.leakage?.globalStylesheetProbe ?? null,
    rtl: evidence.rtl?.status ?? null,
    rtlIssues: evidence.rtl?.issues ?? [],
    // A6: carry setup cost alongside status.
    rtlRequirement: (evidence.requirements ?? []).find(
      (r) => (typeof r === "string" ? r : r.id) === "rtl",
    ) ?? null,
    axe: evidence.axe ?? {},
    bundle: evidence.bundle ?? {},
    extraction: extractionResults?.[candidate] ?? null,
  };
});

/** Per-candidate, per-axis band (worst of two hosts). Used for summary strips. */
const BAND_RANK = { strong: 0, workable: 1, weak: 2, blocked: 3 };
const BAND_BY_RANK = ["strong", "workable", "weak", "blocked"];
const axisScorerByKey = {
  A1: (r) => scoreA1(r.evidence, r.effort),
  A2: (r) => scoreA2(r.candidate, changeAmplification),
  A3: (r) => scoreA3(r.candidate, extractionResults),
  A4: (r) => scoreA4(r.evidence),
  A5: (r) => scoreA5(r.evidence),
  A6: (r) => scoreA6(r.evidence),
  A7: (r) => scoreA7(r.evidence),
};

function candidateBands(axisKey) {
  const result = [];
  for (const candidate of CANDIDATE_ORDER) {
    const pairings = rows.filter((r) => r.candidate === candidate);
    if (pairings.length === 0) continue;
    let worstRank = 0;
    let worstBecause = "";
    for (const p of pairings) {
      const score = axisScorerByKey[axisKey](p);
      const rank = BAND_RANK[score.band] ?? 0;
      if (rank > worstRank) {
        worstRank = rank;
        worstBecause = score.because;
      }
    }
    result.push({
      candidate,
      name: pairings[0].name,
      band: BAND_BY_RANK[worstRank],
      because: worstBecause,
    });
  }
  return result;
}

/* ---------------------------------------------------------------- markdown -- */

/**
 * Wraps a numeric value with a bar marker for the HTML renderer.
 * Format: {spark:VALUE:MAX} — inline() converts it to a CSS bar.
 * Non-numeric or zero-max values pass through unchanged.
 */
function spark(value, max) {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n) || !max) return value;
  return `{spark:${n}:${max}}`;
}

function table(headers, bodyRows) {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  return [head, rule, ...bodyRows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

const lines = [];

/**
 * Opens an axis section: heading, then the UNDRR question and answer from
 * axisPreamble, before any measurement table.
 */
function pushAxis(axis, title) {
  lines.push(`## ${axis} - ${title}`);
  lines.push("");
  lines.push(...axisPreamble(axis));
}

lines.push("# Axis scores");
lines.push("");
lines.push("Detailed measurements behind the [ranking](./scores.html). The [requirement matrix](./comparison.html) retains all 300 assessments.");
lines.push("");

pushAxis("A1", "Implementation effort");
lines.push(
  "`beyond native` counts requirements needing more than a documented component.",
);
lines.push("`off-route overrides` counts only audited unsupported/internal workarounds. Documented integration work, product design decisions and explicit non-events are excluded; the exhaustive classification is in `effort-classification.json`.");
lines.push("");
{
  const maxNative = Math.max(...rows.map((r) => r.mix.native));
  const maxComposed = Math.max(...rows.map((r) => r.mix.composed));
  const maxCustom = Math.max(...rows.map((r) => r.mix.custom));
  const maxBeyond = Math.max(...rows.map((r) => r.beyondNative));
  const maxTraps = Math.max(...rows.map((r) => r.escapeHatches));
  const maxReview = Math.max(...rows.map((r) => r.humanReview));
  lines.push(
    table(
      ["Pairing", "native||one documented component did it", "composed||assembled from multiple components", "custom||built from scratch", "beyond native||composed + custom; lower is easier", "off-route overrides||audited unsupported or internal workarounds", "wrappers||glue components the demo had to write", "flagged for review||may need a human judgement call"],
      rows.map((r) => [
        r.app,
        spark(r.mix.native, maxNative),
        spark(r.mix.composed, maxComposed),
        spark(r.mix.custom, maxCustom),
        `**${spark(r.beyondNative, maxBeyond)}**`,
        spark(r.escapeHatches, maxTraps),
        `${r.wrappers.count ?? "?"} (${r.wrappers.totalLines ?? "?"} ln)`,
        spark(r.humanReview, maxReview),
      ]),
    ),
  );
}
lines.push("");
lines.push("Each off-route entry is a place the documented approach did not suffice.");
lines.push("");
lines.push("<details><summary>The audited off-route log, per pairing</summary>");
lines.push("");
for (const r of rows.filter((x) => x.escapeHatchText.length > 0)) {
  lines.push(`**\`${r.app}\`** - ${r.escapeHatches} audited off-route overrides`);
  lines.push("");
  for (const h of r.escapeHatchText) {
    const first = String(h).split(/(?<=\.)\s+/)[0];
    // Normalize ALL-CAPS sentences to sentence case.
    const normalized = first.replace(/^([A-Z][A-Z\s,'-]{8,}\.?)/, (m) =>
      m.charAt(0) + m.slice(1).toLowerCase(),
    );
    lines.push(`- ${normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized}`);
  }
  lines.push("");
}
lines.push("</details>");
lines.push("");

pushAxis("A2", "Estate change amplification");
lines.push(
  `Scenario: **${changeAmplification.scenario.siteCount} sites** - ${changeAmplification.scenario.dataSites} data products and ${changeAmplification.scenario.contentSites} content products.`,
);
lines.push("");
lines.push(
  "Each cell separates the authoritative implementation change from consumer source edits and rebuilds. Rebuilds are release fan-out, not six manual implementations.",
);
lines.push("");
{
  const scenarioCell = (scenario) => {
    const edits = scenario.consumerSourceEdits === null
      ? "site edits unmeasured"
      : `${scenario.consumerSourceEdits} site edits`;
    return `**${scenario.authoritativeLocations} source${scenario.authoritativeLocations === 1 ? "" : "s"}** · ${edits} · ${scenario.siteRebuilds} rebuilds`;
  };
  const entries = CANDIDATE_ORDER
    .filter((candidate) => changeAmplification.candidates[candidate] && rows.some((r) => r.candidate === candidate))
    .map((candidate) => [candidate, changeAmplification.candidates[candidate]]);
  lines.push(
    table(
      ["Candidate", "Type", "evidence basis||mechanism measured or modelled?", "token change||authoritative source · consumer edits · rebuilds", "shared policy||authoritative source · consumer edits · rebuilds", "upstream upgrade||authoritative source · consumer edits · rebuilds", "owners at worst||independent system boundaries"],
      entries.map(([candidate, evidence]) => [
        rows.find((r) => r.candidate === candidate)?.name ?? candidate,
        evidence.architectureType,
        evidence.mechanismMeasured ? `**${evidence.basis}**` : evidence.basis,
        scenarioCell(evidence.scenarios.token),
        scenarioCell(evidence.scenarios.interactionPolicy),
        scenarioCell(evidence.scenarios.upstreamUpgrade),
        Math.max(...Object.values(evidence.scenarios).map((scenario) => scenario.ownershipBoundaries)),
      ]),
    ),
  );
  lines.push("");
  lines.push("<details><summary>Scenario assumptions and evidence</summary>");
  lines.push("");
  lines.push(changeAmplification.scenario.assumption);
  lines.push("");
  for (const [candidate, evidence] of entries) {
    lines.push(`**${rows.find((r) => r.candidate === candidate)?.name ?? candidate}** - ${evidence.notes}`);
    lines.push("");
    for (const [key, scenario] of Object.entries(evidence.scenarios)) {
      lines.push(`- ${changeAmplification.changes[key]} ${scenario.evidence}`);
    }
    lines.push("");
  }
  lines.push("</details>");
  lines.push("");
}
lines.push(
  "The six-site counts are an explicit extrapolation from the tested propagation mechanisms, not observations of six production sites. Styling-hook fragility remains supporting evidence below; it no longer determines A2.",
);
lines.push("");
lines.push("<details><summary>Supporting evidence: implementation fragility</summary>");
lines.push("");
lines.push("Every distinct styling hook, classified by the promise behind it.");
lines.push("");
lines.push(
  "`attribute`: semantic selectors (`[data-*]`, `[slot]`). `contract`: documented styling API.",
);
lines.push(
  "`off route`: styling that bypasses the library's own theming mechanism.",
);
lines.push("");
{
  const maxAttr = Math.max(...rows.map((r) => r.hooks.attributes));
  const maxContract = Math.max(...rows.map((r) => r.hooks.contract));
  const maxOff = Math.max(...rows.map((r) => r.hooks.offRoute));
  const maxHashed = Math.max(...rows.map((r) => r.hooks.generated));
  const maxRules = Math.max(...rows.map((r) => r.hooks.rules));
  lines.push(
    table(
      ["Pairing", "attribute||semantic selectors like [data-*], [slot]", "contract||documented styling API; safe to use", "off route||bypasses the library's theming; fragile", "of which hashed||generated class names that change between builds", "CSS rules||total rules in the demo's own stylesheets"],
      rows.map((r) => [
        r.app,
        spark(r.hooks.attributes, maxAttr),
        spark(r.hooks.contract, maxContract),
        r.hooks.offRoute === 0 ? "**0**" : `**${spark(r.hooks.offRoute, maxOff)}**`,
        spark(r.hooks.generated, maxHashed),
        spark(r.hooks.rules, maxRules),
      ]),
    ),
  );
}
lines.push("");
lines.push(
  "Mantine's `.mantine-{Component}-{element}` classes are a documented API",
);
lines.push(
  "(`withStaticClasses`), so they count as contract. Carbon's `cds--` classes are",
);
lines.push(
  "stable but off the documented theming route (`--cds-*` custom properties).",
);
lines.push("");
const disagreements = rows.filter(
  (r) => r.declaredOverridesInternals === true && r.hooks.offRoute === 0,
);
if (disagreements.length > 0) {
  lines.push(
    `**Every run declared \`overridesLibraryInternals: true\`, including ${disagreements.length} ` +
      `with no off-route hook at all** (${disagreements.map((r) => r.app).join(", ")}). ` +
      "The field collapsed to a constant and is reported but not scored.",
  );
  lines.push("");
}
const withHooks = rows.filter((r) => r.hooks.contract + r.hooks.offRoute > 0);
if (withHooks.length > 0) {
  lines.push("<details><summary>Every class hook, per pairing</summary>");
  lines.push("");
  for (const r of withHooks) {
    const parts = [];
    if (r.hooks.names.contract.length)
      parts.push(`contract: ${r.hooks.names.contract.map((n) => `\`${n}\``).join(", ")}`);
    if (r.hooks.names.convention.length)
      parts.push(`off route: ${r.hooks.names.convention.map((n) => `\`${n}\``).join(", ")}`);
    if (r.hooks.names.generated.length)
      parts.push(`hashed: ${r.hooks.names.generated.map((n) => `\`${n}\``).join(", ")}`);
    lines.push(`- \`${r.app}\` - ${parts.join(" | ")}`);
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");
}
lines.push("</details>");
lines.push("");

pushAxis("A3", "New-product reproducibility");
if (!extractionResults) {
  lines.push(
    "**Not yet measured.** The extraction experiment has not been run.",
  );
} else {
  const entries = CANDIDATE_ORDER.filter((c) => extractionResults[c]).map((c) => [
    c,
    extractionResults[c],
  ]);
  lines.push(
    "`basis`: React Aria, MUI and Ant Design are measured package integrations; Carbon and Mantine remain analysis because consolidating two independently authored implementations would measure a rewrite rather than portability.",
  );
  lines.push("");
  lines.push(
    table(
      ["Candidate", "basis||measured or analysed?", "verdict||can it be shared across sites?", "shared||code lines reusable across sites", "per site||code lines each site must own", "shared %||proportion that is reusable"],
      entries.map(([c, e]) => [
        c,
        e.basis === "measured" ? "**measured**" : e.basis,
        `**${e.verdict}**`,
        e.sharedLines === null ? "-" : `${e.sharedLines} ln`,
        e.perSiteLines === null ? "-" : `${e.perSiteLines} ln`,
        e.sharedPercent === undefined ? "-" : `${e.sharedPercent}%`,
      ]),
    ),
  );
  lines.push("");
  for (const [c, e] of entries) {
    lines.push(`**${c}** - ${e.notes}`);
    lines.push("");
    if (e.resists?.length) {
      lines.push("What resists extraction:");
      lines.push("");
      for (const r of e.resists) lines.push(`- ${r}`);
      lines.push("");
    }
    if (e.verification?.length) {
      lines.push("Verified by:");
      lines.push("");
      for (const v of e.verification) lines.push(`- ${v}`);
      lines.push("");
    }
  }
}
lines.push("");

pushAxis("A4", "Mangrove compatibility");
lines.push("");
lines.push(
  table(
    ["Pairing", "leakage||does the library restyle the host page outside its own area?", "documented setup loadable as-is||can the library's default setup load without fighting Mangrove?"],
    rows.map((r) => [
      r.app,
      r.leakagePassed ? "clean" : `**FAILED** (${r.leakageDiffs} diffs)`,
      r.globalProbe ? "**no** - global stylesheet restyles the host" : "not probed",
    ]),
  ),
);
lines.push("");

pushAxis("A5", "Theming fidelity and propagation");
lines.push(
  "`unreachable`: tokens with no hook to attach to. `propagation`: stylesheet swap",
);
lines.push("reaches every site at once; rebuild is per site.");
lines.push("");
{
  const maxApplied = Math.max(...rows.map((r) => r.tokensApplied ?? 0));
  const maxUnreachable = Math.max(...rows.map((r) => r.tokensUnreachable ?? 0));
  const maxVarRefs = Math.max(...rows.map((r) => r.propagation.cssVarRefs ?? 0));
  lines.push(
    table(
      ["Pairing", "tokens applied||UNDRR design tokens successfully connected", "unreachable||tokens with no hook to attach to", "propagation||how a token change reaches every site", "live var() refs in shipped CSS||CSS custom properties surviving to production"],
      rows.map((r) => [
        r.app,
        spark(r.tokensApplied ?? "?", maxApplied),
        r.tokensUnreachable ? `**${spark(r.tokensUnreachable, maxUnreachable)}**` : "0",
        `**${r.propagation.model}**`,
        spark(r.propagation.cssVarRefs ?? "not built", maxVarRefs),
      ]),
    ),
  );
}
lines.push("");

pushAxis("A6", "Right-to-left");
lines.push(
  "Read `status` against `setup`: `clean` at `native`/0 lines means a `dir` attribute",
);
lines.push("sufficed; `clean` at `composed`/18 lines means the library needed mitigation.");
lines.push("");
{
  const maxLines = Math.max(...rows.map((r) => r.rtlRequirement?.customLinesOfCode ?? 0));
  const maxIssues = Math.max(...rows.map((r) => r.rtlIssues.length));
  lines.push(
    table(
      ["Pairing", "status||does Arabic render correctly?", "setup||native (dir attribute) or composed (extra code)?", "custom lines||lines of code needed to make RTL work", "recorded issues||defects found during RTL testing"],
      rows.map((r) => [
        r.app,
        r.rtl === "clean" ? "clean" : `**${r.rtl}**`,
        r.rtlRequirement?.status ?? "?",
        spark(r.rtlRequirement?.customLinesOfCode ?? "?", maxLines),
        spark(r.rtlIssues.length, maxIssues),
      ]),
    ),
  );
}
lines.push("");
lines.push(
  "Two hosts agreeing implicates the candidate; disagreeing implicates the host.",
);
lines.push("Recorded issues are reproduced verbatim below.");
lines.push("");
lines.push("<details><summary>Recorded RTL issues, per pairing</summary>");
lines.push("");
for (const r of rows.filter((x) => x.rtlIssues.length > 0)) {
  lines.push(`**\`${r.app}\`** - ${r.rtlIssues.length} recorded`);
  lines.push("");
  for (const issue of r.rtlIssues) lines.push(`- ${issue}`);
  lines.push("");
}
lines.push("</details>");
lines.push("");

pushAxis("A7", "Automated accessibility signals");
lines.push(
  "`incomplete` counts checks axe declined to decide. Nine of ten runs ran axe",
);
lines.push("unscoped, so counts are directional, not exact.");
lines.push("");
{
  const maxCrit = Math.max(...rows.map((r) => r.axe.critical ?? 0));
  const maxSerious = Math.max(...rows.map((r) => r.axe.serious ?? 0));
  const maxInc = Math.max(...rows.map((r) => r.axe.incomplete ?? 0));
  lines.push(
    table(
      ["Pairing", "critical||must-fix violations (axe automated scan)", "serious||should-fix violations", "incomplete||axe could not decide; needs a human", "scope||what part of the page was scanned"],
      rows.map((r) => [
        r.app,
        r.axe.critical ? `**${spark(r.axe.critical, maxCrit)}**` : (r.axe.critical ?? "?"),
        spark(r.axe.serious ?? "?", maxSerious),
        spark(r.axe.incomplete ?? "?", maxInc),
        r.axe.scope ? "candidate subtree" : "whole page, unscoped",
      ]),
    ),
  );
}
lines.push("");
lines.push(
  "**Zero automated violations is a floor, not a conformance claim.** No screen-reader",
);
lines.push(
  "or keyboard-only walkthrough was run. A row of zeroes means the automated subset passed.",
);
lines.push("");

lines.push("## Supporting figures");
lines.push("");
lines.push(
  "`prod pkgs` is measured uniformly (`pnpm deps:count`). `as recorded` is each run's",
);
lines.push("self-reported figure; the two disagree and only `prod pkgs` is comparable across rows.");
lines.push("");
{
  const maxCss = Math.max(...rows.map((r) => r.cssLines ?? 0));
  const maxBundle = Math.max(...rows.map((r) => r.bundle.gzippedKb ?? 0));
  const maxProd = Math.max(...rows.map((r) => dependencyCounts[r.app]?.productionPackages ?? 0));
  const maxDeps = Math.max(...rows.map((r) => r.bundle.dependencyCount ?? 0));
  const buildTimes = rows.map((r) => readJson(join(APPS, r.app, "evidence.json")).buildTimeSeconds ?? 0);
  const maxBuild = Math.max(...buildTimes);
  lines.push(
    table(
      ["Pairing", "custom CSS lines||written by the demo, not the library", "bundle kB gz||shipped JavaScript size, gzipped", "prod pkgs||production npm packages (uniform method)", "as recorded||self-reported by each run; not comparable", "licences||licence families across dependencies", "build s||seconds to build from clean"],
      rows.map((r, i) => {
        const deps = dependencyCounts[r.app];
        const licences = deps?.licences
          ? Object.entries(deps.licences)
              .map(([name, count]) => `${name} ${count}`)
              .join(", ")
          : "?";
        return [
          r.app,
          spark(r.cssLines ?? "?", maxCss),
          spark(r.bundle.gzippedKb ?? "?", maxBundle),
          deps ? `**${spark(deps.productionPackages, maxProd)}**` : "?",
          spark(r.bundle.dependencyCount ?? "?", maxDeps),
          licences,
          spark(buildTimes[i], maxBuild),
        ];
      }),
    ),
  );
}
lines.push("");

const md = lines.join("\n");
writeFileSync(join(DOCS, "axes.md"), md + "\n", "utf8");

/* -------------------------------------------------------------------- html -- */

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal markdown-to-HTML for the subset this generator emits. */
function toHtml(markdown) {
  const out = [];
  let inTable = false;
  let inDetails = false;
  let inQuote = false;
  let inList = false;
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("<details") || line.startsWith("</details")) {
      inDetails = line.startsWith("<details");
      out.push(line);
      continue;
    }
    if (line.startsWith("|")) {
      const cells = line.slice(1, -1).split(" | ").map((c) => c.trim());
      if (/^-+$/.test(cells[0] ?? "")) continue;
      if (!inTable) {
        out.push("<div class=\"scroll\"><table><thead>");
        out.push(`<tr>${cells.map((c) => {
          const [name, hint] = c.split("||");
          return hint
            ? `<th>${inline(name)}<span class="th-hint">${esc(hint)}</span></th>`
            : `<th>${inline(name)}</th>`;
        }).join("")}</tr>`);
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
    /* Blockquote: each `> ` line becomes a <p>; bare `>` becomes a blank line. */
    if (line.startsWith(">")) {
      if (!inQuote) {
        out.push('<blockquote class="answers">');
        inQuote = true;
      }
      const content = line.replace(/^>\s?/, "");
      out.push(content === "" ? "" : `<p>${inline(content)}</p>`);
      continue;
    }
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
    /* Axis headings carry an id for deep-linking from the landing page. */
    if (inList && !line.startsWith("- ") && line !== "") {
      out.push("</ul>");
      inList = false;
    }
    if (line.startsWith("## ")) {
      const text = line.slice(3);
      const axis = /^(A[1-7])\b/.exec(text);
      const id = axis ? ` id="${axis[1].toLowerCase()}"` : "";
      out.push(`<h2${id}>${inline(text)}</h2>`);
    }
    else if (line.startsWith("# ")) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    }
    else if (line === "") out.push("");
    else if (inDetails) out.push(`<p>${inline(line)}</p>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (inTable) out.push("</tbody></table></div>");
  if (inQuote) out.push("</blockquote>");
  if (inList) out.push("</ul>");
  // Merge consecutive paragraphs that were really one wrapped sentence.
  return out.join("\n").replace(/<\/p>\n<p>/g, " ");
}

function inline(text) {
  return esc(text)
    .replace(/\{spark:(\d+):(\d+)\}/g, (_, v, m) => {
      const pct = Math.round((parseInt(v, 10) / parseInt(m, 10)) * 100);
      return `<span class="spark"><span class="spark-bar" style="width:${pct}%"></span>${v}</span>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Builds a colored band-summary strip for one axis. */
function buildBandSummary(axisKey) {
  const bandClass = { strong: "ax-s", workable: "ax-w", weak: "ax-k", blocked: "ax-b" };
  const bands = candidateBands(axisKey);
  const cells = bands
    .map(
      (b) =>
        `<span class="ax-chip ${bandClass[b.band]}" title="${esc(b.because)}">${esc(b.name)}: ${b.band}</span>`,
    )
    .join("");
  return `<div class="ax-summary">${cells}</div>`;
}

/** Injects band summaries after each axis heading's preamble in the HTML. */
function injectBandSummaries(bodyHtml) {
  return bodyHtml.replace(
    /(<h2 id="(a[1-7])">[^<]*<\/h2>\s*(?:<blockquote class="answers">[\s\S]*?<\/blockquote>)?)/g,
    (match, full, axisId) => {
      const axisKey = axisId.toUpperCase();
      return full + "\n" + buildBandSummary(axisKey);
    },
  );
}

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-axes.mjs. Regenerate: pnpm axes -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Axis scores - UNDRR data design system evaluation</title>
    <link rel="stylesheet" href="./mangrove.css" />
    <style>
      :root { --accent: #004f91; --muted: #4a5c69; --border: #d5d5d5; --surface: #fff; --bad: #c10920; }
      h2 { font-size: 1.1875rem; margin: 2.5rem 0 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
      p { max-width: 68ch; }
      .scroll { overflow-x: auto; margin: 0 0 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); }
      table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
      th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
      th { background: #f5f5f5; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: bottom; }
      .th-hint { display: block; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 0.6875rem; color: var(--muted); line-height: 1.3; margin-top: 0.125rem; white-space: normal; }
      .spark { position: relative; display: inline-block; min-width: 3rem; }
      .spark-bar { position: absolute; inset: 0; border-radius: 2px; background: rgba(0,79,145,0.12); pointer-events: none; }
      tbody tr:last-child td { border-bottom: 0; }
      td:first-child { font-family: ui-monospace, monospace; font-size: 0.75rem; }
      li { max-width: 68ch; font-size: 0.875rem; }
      details { margin: 0 0 1rem; }
      summary { cursor: pointer; color: var(--accent); font-size: 0.875rem; }
      blockquote.answers {
        margin: 0 0 1.25rem; padding: 0.875rem 1.125rem;
        border-inline-start: 4px solid var(--accent); background: var(--surface); border-radius: 0 6px 6px 0;
      }
      blockquote.answers p { margin: 0 0 0.5rem; font-size: 0.9375rem; }
      blockquote.answers p:last-child { margin-bottom: 0; }
      .ax-summary { display: flex; flex-wrap: wrap; gap: 0.375rem; margin: 0 0 1.25rem; }
      .ax-chip { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 4px; font-size: 0.8125rem; font-weight: 600; cursor: default; }
      .ax-s { background: #d4edda; color: #155724; }
      .ax-w { background: #fff3cd; color: #856404; }
      .ax-k { background: #ffe0b2; color: #7a4100; }
      .ax-b { background: #f8d7da; color: #721c24; }
${siteNavCss}
    </style>
  </head>
  <body>
${siteNavHtml("axes")}
    <main id="main" class="mg-container mg-page-content--padded">
      <p class="audience-banner"><span class="audience-tag">Developer evidence</span>Measurement definitions and per-pairing signals. Automated accessibility results are not a conformance claim.</p>
${injectBandSummaries(toHtml(md))}
    </main>
  </body>
</html>
`;

writeFileSync(join(DOCS, "axes.html"), html, "utf8");
process.stdout.write(`wrote docs/axes.md and docs/axes.html (${rows.length} pairings)\n`);
if (!extractionResults) {
  process.stdout.write("A3 is blank: docs/extraction-results.json does not exist yet\n");
}
