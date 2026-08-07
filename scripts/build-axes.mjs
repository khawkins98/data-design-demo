#!/usr/bin/env node
/**
 * Scores every pairing on the seven decision axes and writes docs/axes.md
 * and docs/axes.html.
 *
 * See docs/decision-axes.md for what each axis means and why lines of code is
 * demoted to a supporting figure.
 *
 * Everything here is either measured from source and build output, or read from
 * a run's own evidence.json. Where a number is a run's self-declaration rather
 * than a measurement, it is labelled as such: the two disagree in at least one
 * place (see overridesLibraryInternals below) and the disagreement is
 * informative.
 *
 *   pnpm axes
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { axisPreamble } from "./lib/undrr-questions.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");
const DOCS = join(ROOT, "docs");

/**
 * Styling hooks, classified by what kind of promise the library makes about them.
 *
 * A binary safe/fragile split turned out to be the wrong shape, because the four
 * libraries make genuinely different promises and checking the documentation
 * moved two of them:
 *
 * - Mantine documents `.mantine-{Component}-{element}` static classes as a
 *   supported way to style components from plain CSS, and gates them behind a
 *   `withStaticClasses` provider prop. That is an API, not an internal.
 * - Carbon documents `cds--` as an internal BEM authoring convention whose
 *   prefix consumers may *reconfigure* via `<ClassPrefix>`, and points consumers
 *   at `--cds-*` custom properties for theming instead. Targeting the classes
 *   works, but it is off the documented path.
 * - Mantine's `m_*` hashed classes are unambiguously internal.
 *
 * `convention` is therefore not "will break on upgrade" - Carbon's class names
 * are stable in practice. It is "achieved by going around the library's own
 * theming route", which is the thing that accumulates across sites and upgrades.
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

/**
 * Attribute selectors that are a semantic contract rather than a class name at
 * all. React Aria publishes `data-*` render state and `slot`; these survive DOM
 * restructuring in a way any class-based hook cannot.
 */
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
  return walk(src)
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
}

/**
 * Strips CSS comments before any selector counting.
 *
 * These stylesheets are heavily commented, and the comments discuss the very
 * class names being counted - `mangrove-mantine/demo.css` explains a specificity
 * conflict by naming Mantine's `.m_8fb7ebe7` in prose. Counting comment text as
 * a styling hook overstated the fragile-hook figure for every pairing that
 * documents its reasoning, which is to say the careful ones.
 */
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
 *
 * `var(--undrr-*)` surviving into the shipped CSS means the value is resolved in
 * the browser against the token stylesheet, so changing tokens is a stylesheet
 * swap. A theme object instead reads the token module at build/run time and
 * emits its own values, so the token values live inside each site's JS bundle
 * and a change means rebuilding every site.
 *
 * Note: token hex literals appear in every bundle at an identical count,
 * because all pairings import the shared TypeScript token module. That count is
 * therefore NOT evidence of a baked theme and is not used.
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

/**
 * Production dependency counts measured by ONE method for all apps.
 *
 * The per-run `bundle.dependencyCount` values are not comparable with each
 * other: each run measured however it chose, and the disagreement reorders the
 * candidates. Mantine recorded 112-113 where a production-only count gives
 * 27-28. Both are reported, because a metric that changes the ranking depending
 * on who measured it should be shown disagreeing rather than quietly replaced.
 */
const dependencyCounts = existsSync(join(DOCS, "dependency-counts.json"))
  ? readJson(join(DOCS, "dependency-counts.json")).apps
  : {};

const rows = appDirs().map((app) => {
  const evidence = readJson(join(APPS, app, "evidence.json"));
  const hooks = stylingHooks(ownStylesheets(app));
  const mix = requirementMix(evidence);
  const prop = propagation(app);
  const candidate = CANDIDATE_ORDER.find((c) => app.endsWith(c)) ?? app;

  return {
    app,
    candidate,
    host: evidence.host,
    name: evidence.candidate,
    mix,
    beyondNative: mix.composed + mix.custom,
    wrappers: evidence.wrappers ?? {},
    escapeHatches: (evidence.theming?.escapeHatchesUsed ?? []).length,
    escapeHatchText: evidence.theming?.escapeHatchesUsed ?? [],
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
    // A6: `clean` spans "a dir attribute sufficed" and "clean after 18 lines of
    // mitigation". The status field alone hides that, so carry the setup cost.
    rtlRequirement: (evidence.requirements ?? []).find(
      (r) => (typeof r === "string" ? r : r.id) === "rtl",
    ) ?? null,
    axe: evidence.axe ?? {},
    bundle: evidence.bundle ?? {},
    extraction: extractionResults?.[candidate] ?? null,
  };
});

/* ---------------------------------------------------------------- markdown -- */

function table(headers, bodyRows) {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  return [head, rule, ...bodyRows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

const lines = [];

/**
 * Opens an axis section: the heading, then the UNDRR question it answers and the
 * answer, before any measurement.
 *
 * The section used to open on its own table legend - `beyond native` is the count
 * of... - which assumes the reader arrived already knowing why they should care.
 * They usually arrived by clicking a one-line answer on the landing page, and found
 * nothing here that acknowledged it. So the plain-language layer comes first and the
 * evidence follows it, from the same source the landing page uses.
 *
 * @param {string} axis  "A1" .. "A7"
 * @param {string} title Axis name, as the heading shows it.
 */
function pushAxis(axis, title) {
  lines.push(`## ${axis} - ${title}`);
  lines.push("");
  lines.push(...axisPreamble(axis));
}

lines.push("# Axis scores");
lines.push("");
lines.push("GENERATED FILE - regenerate with `pnpm axes`. Axis definitions and");
lines.push("measurement rules are in [decision-axes.md](./decision-axes.md).");
lines.push("");
/*
 * WHAT THIS PAGE IS, said before the reader hits the first table.
 *
 * A project manager clicking through these pages read this one as unreadable, and
 * the diagnosis was placement rather than prose: it opens on measurement and never
 * says which of the three pages a reader should be on. So it now says. The order is
 * the order a decision gets made in - conclusion, then evidence, then the full
 * matrix - and this page is explicitly the middle one.
 */
lines.push("**This is the evidence layer.** Each section opens with the UNDRR question");
lines.push("it answers, in plain language, and then shows the measurements behind that");
lines.push("answer. Nothing here is typed by hand.");
lines.push("");
/*
 * One line per bullet, unwrapped, because `toHtml` maps a `- ` line to one `<li>`
 * and would render a wrapped continuation as a stray paragraph after the item.
 */
lines.push(
  "- For the recommendation and what it costs, read the [ranking](./scores.html) first.",
);
lines.push(
  "- For whether a candidate can do a given thing at all, the [requirement matrix](./comparison.html) holds all 300 assessments. It is an appendix to consult, not a page to read: every candidate can do the job, so the matrix does not discriminate between them and these axes do.",
);
lines.push("");

pushAxis("A1", "Implementation effort");
lines.push(
  "`beyond native` is the count of the 30 requirements needing more than dropping in",
);
lines.push(
  "a documented component. `traps` counts documented approaches that failed and",
);
lines.push("needed working around. Neither is a time estimate; see the axis definition.");
lines.push("");
lines.push(
  table(
    ["Pairing", "native", "composed", "custom", "beyond native", "traps", "wrappers", "flagged for review"],
    rows.map((r) => [
      r.app,
      r.mix.native,
      r.mix.composed,
      r.mix.custom,
      `**${r.beyondNative}**`,
      r.escapeHatches,
      `${r.wrappers.count ?? "?"} (${r.wrappers.totalLines ?? "?"} ln)`,
      r.humanReview,
    ]),
  ),
);
lines.push("");
lines.push(
  "The friction log is the honest proxy for time: implementation time goes on dead",
);
lines.push(
  "ends, not on typing. Each entry below is a place the documented approach did not",
);
lines.push("suffice, recorded by the run that hit it.");
lines.push("");
lines.push("<details><summary>The friction log, per pairing</summary>");
lines.push("");
for (const r of rows.filter((x) => x.escapeHatchText.length > 0)) {
  lines.push(`**\`${r.app}\`** - ${r.escapeHatches} entries`);
  lines.push("");
  for (const h of r.escapeHatchText) {
    // These are long prose notes; keep the first sentence, which states the trap.
    const first = String(h).split(/(?<=\.)\s+/)[0];
    lines.push(`- ${first.length > 240 ? `${first.slice(0, 240)}...` : first}`);
  }
  lines.push("");
}
lines.push("</details>");
lines.push("");

pushAxis("A2", "Maintainability at scale");
lines.push("Every distinct styling hook, classified by the promise behind it.");
lines.push("");
lines.push(
  "`attribute` hooks are semantic (`[data-*]`, `[slot]`) and survive DOM restructuring.",
);
lines.push(
  "`contract` hooks are class names the library documents as a styling API. `off route`",
);
lines.push(
  "hooks are the ones that matter: styling achieved by going around the library's own",
);
lines.push(
  "theming mechanism, which is what accumulates across sites and across upgrades.",
);
lines.push("");
lines.push(
  table(
    ["Pairing", "attribute", "contract", "off route", "of which hashed", "CSS rules"],
    rows.map((r) => [
      r.app,
      r.hooks.attributes,
      r.hooks.contract,
      r.hooks.offRoute === 0 ? "**0**" : `**${r.hooks.offRoute}**`,
      r.hooks.generated,
      r.hooks.rules,
    ]),
  ),
);
lines.push("");
lines.push(
  "Checking the documentation moved two libraries here, and both moves were away from",
);
lines.push(
  "my first reading. Mantine's `.mantine-{Component}-{element}` classes are a",
);
lines.push(
  "documented styling API gated behind a `withStaticClasses` provider prop, not an",
);
lines.push(
  "internal - so Mantine's overrides are contract hooks. Carbon's `cds--` classes are",
);
lines.push(
  "documented as an internal BEM authoring convention with a *reconfigurable* prefix,",
);
lines.push(
  "while Carbon points consumers at `--cds-*` custom properties for theming - so",
);
lines.push(
  "Carbon's overrides are off-route. That is not a prediction that they will break;",
);
lines.push("Carbon's class names are stable in practice. It is a count of the places the");
lines.push("supported theming route did not reach.");
lines.push("");
const disagreements = rows.filter(
  (r) => r.declaredOverridesInternals === true && r.hooks.offRoute === 0,
);
if (disagreements.length > 0) {
  lines.push(
    `**Every run declared \`overridesLibraryInternals: true\`, including ${disagreements.length} ` +
      `with no off-route hook at all** (${disagreements.map((r) => r.app).join(", ")}). ` +
      "Self-assessment of this collapsed to a constant and carries no information, " +
      "which is why the field is reported but not scored.",
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

pushAxis("A3", "Reproducibility across sites");
if (!extractionResults) {
  lines.push(
    "**Not yet measured.** The extraction experiment has not been run, so this axis is",
  );
  lines.push(
    "blank rather than guessed. Divergence between the two host apps is not a valid",
  );
  lines.push("substitute - see the caveat in the axis definition.");
} else {
  const entries = CANDIDATE_ORDER.filter((c) => extractionResults[c]).map((c) => [
    c,
    extractionResults[c],
  ]);
  lines.push(
    "`basis` is the most important column. Only MUI was actually extracted and both",
  );
  lines.push(
    "host apps rewired onto the package; everything else is analysis and says so.",
  );
  lines.push("");
  lines.push(
    table(
      ["Candidate", "basis", "verdict", "shared", "per site", "shared %"],
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
lines.push(
  "RTL and accessibility used to be two columns here. They are now A6 and A7: both are",
);
lines.push(
  "estate-wide obligations rather than symptoms of host coexistence, and both were too",
);
lines.push("consequential to leave as columns in someone else's table.");
lines.push("");
lines.push(
  table(
    ["Pairing", "leakage", "documented setup loadable as-is"],
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
  "`unreachable` tokens are a ceiling, not a cost: there is no hook to attach them to.",
);
lines.push(
  "`propagation` is how a Mangrove token change reaches a built site - a stylesheet",
);
lines.push("swap reaches every site at once; a rebuild is per site, forever.");
lines.push("");
lines.push(
  table(
    ["Pairing", "tokens applied", "unreachable", "propagation", "live var() refs in shipped CSS"],
    rows.map((r) => [
      r.app,
      r.tokensApplied ?? "?",
      r.tokensUnreachable ? `**${r.tokensUnreachable}**` : "0",
      `**${r.propagation.model}**`,
      r.propagation.cssVarRefs ?? "not built",
    ]),
  ),
);
lines.push("");

pushAxis("A6", "Right-to-left");
lines.push(
  "Read `status` against `setup`. `clean` at `native`/0 lines means a `dir` attribute",
);
lines.push(
  "sufficed. `clean` at `composed`/18 lines means the library needed configuring and",
);
lines.push(
  "mitigating first. Both print as clean; they are not the same purchase.",
);
lines.push("");
lines.push(
  table(
    ["Pairing", "status", "setup", "custom lines", "recorded issues"],
    rows.map((r) => [
      r.app,
      r.rtl === "clean" ? "clean" : `**${r.rtl}**`,
      r.rtlRequirement?.status ?? "?",
      r.rtlRequirement?.customLinesOfCode ?? "?",
      r.rtlIssues.length,
    ]),
  ),
);
lines.push("");
lines.push(
  "A candidate whose two hosts disagree implicates the host; one whose two hosts agree",
);
lines.push(
  "implicates the candidate. Every recorded issue is reproduced verbatim below, because",
);
lines.push(
  "ownership - candidate, third-party dependency, or mitigated - decides what it means,",
);
lines.push("and that is judgement rather than a number.");
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

pushAxis("A7", "Accessibility conformance");
lines.push(
  "`incomplete` is not a pass: it counts checks axe declined to decide, each of which is",
);
lines.push(
  "work a human still owes. Nine of the ten runs ran axe unscoped, so these counts are",
);
lines.push(
  "sound at the level of *zero versus some* and unsound at the level of exact numbers.",
);
lines.push("");
lines.push(
  table(
    ["Pairing", "critical", "serious", "incomplete", "scope"],
    rows.map((r) => [
      r.app,
      r.axe.critical ? `**${r.axe.critical}**` : (r.axe.critical ?? "?"),
      r.axe.serious ?? "?",
      r.axe.incomplete ?? "?",
      r.axe.scope ? "candidate subtree" : "whole page, unscoped",
    ]),
  ),
);
lines.push("");
lines.push(
  "**Zero automated violations is a floor, not a conformance claim.** No screen-reader",
);
lines.push(
  "pass, no human keyboard-only walkthrough and no plain-language review was run on any",
);
lines.push(
  "pairing. Automated tooling reaches a minority of WCAG criteria, so a row of zeroes",
);
lines.push(
  "means the automated subset passed - not that the pairing is accessible. See",
);
lines.push("[decision-axes.md](./decision-axes.md) for what ownership does to these numbers.");
lines.push("");

lines.push("## Supporting figures");
lines.push("");
lines.push("Reported because they are asked for, not because they decide anything.");
lines.push("");
lines.push(
  "The two dependency columns disagree, and the disagreement is the point. `prod pkgs`",
);
lines.push(
  "is the production tree measured for every app by one method (`pnpm deps:count`).",
);
lines.push(
  "`as recorded` is whatever each run put in its own `evidence.json`. Those figures",
);
lines.push(
  "were each measured differently and they reorder the candidates - Mantine was",
);
lines.push(
  "recorded at 112 where a production count gives 27 - so only the first column is",
);
lines.push("safe to compare across rows.");
lines.push("");
lines.push(
  table(
    ["Pairing", "custom CSS lines", "bundle kB gz", "prod pkgs", "as recorded", "licences", "build s"],
    rows.map((r) => {
      const deps = dependencyCounts[r.app];
      const licences = deps?.licences
        ? Object.entries(deps.licences)
            .map(([name, count]) => `${name} ${count}`)
            .join(", ")
        : "?";
      return [
        r.app,
        r.cssLines ?? "?",
        r.bundle.gzippedKb ?? "?",
        deps ? `**${deps.productionPackages}**` : "?",
        r.bundle.dependencyCount ?? "?",
        licences,
        readJson(join(APPS, r.app, "evidence.json")).buildTimeSeconds ?? "?",
      ];
    }),
  ),
);
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
    /*
     * Blockquote, used for the plain-language block that opens each axis section.
     *
     * Each `> ` line becomes its own paragraph, and a bare `>` becomes the blank
     * line that keeps the question and the answer apart - the paragraph-merging
     * step below joins `</p>\n<p>` but not `</p>\n\n<p>`, so the separation
     * survives it.
     */
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
    /*
     * Axis headings carry an id so the six questions on the landing page can link
     * to the axis that answers them - `axes.html#a6` - rather than to the top of a
     * long page the reader then has to scan.
     */
    /*
     * List items were emitted as bare `<li>` with no `<ul>` around them. Browsers
     * render that, which is why it survived, but it leaves every list on this page
     * - including the friction logs - unannounced to a screen reader, which is a
     * poor look on the page that scores five libraries on accessibility.
     */
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
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-axes.mjs. Regenerate: pnpm axes -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Axis scores - UNDRR data design system evaluation</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f4f6f8; --surface: #fff; --text: #14232e; --muted: #4a5c69;
        --border: #c8d2da; --accent: #2f6f8f; --bad: #a11f2c;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #10191f; --surface: #17232b; --text: #e8eef2; --muted: #a3b3bf;
          --border: #2c3d48; --accent: #7fb3cc; --bad: #ef8b96;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0; padding: 2rem 1.5rem 4rem; background: var(--bg); color: var(--text);
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.55;
      }
      main { max-width: 74rem; margin: 0 auto; }
      h1 { font-size: 1.75rem; margin: 0 0 1rem; }
      h2 { font-size: 1.1875rem; margin: 2.5rem 0 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
      p { margin: 0 0 0.75rem; max-width: 68ch; color: var(--text); }
      code { font-size: 0.875em; background: color-mix(in srgb, var(--border) 35%, transparent); padding: 0.1em 0.35em; border-radius: 3px; }
      strong { color: var(--text); }
      .scroll { overflow-x: auto; margin: 0 0 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); }
      table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
      th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
      th { background: color-mix(in srgb, var(--border) 30%, transparent); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
      tbody tr:last-child td { border-bottom: 0; }
      td:first-child { font-family: ui-monospace, monospace; font-size: 0.75rem; }
      li { max-width: 68ch; font-size: 0.875rem; }
      details { margin: 0 0 1rem; }
      summary { cursor: pointer; color: var(--accent); font-size: 0.875rem; }
      a { color: var(--accent); }
      nav { margin-bottom: 1.5rem; font-size: 0.875rem; }
      /*
       * The plain-language block that opens each axis: the UNDRR question and the
       * answer. Deliberately the most readable thing in the section - wider leading,
       * no monospace, an accent rule down the inline start - because it is what a
       * non-engineer arriving from the landing page needs, and the tables below it
       * are what they can consult afterwards.
       */
      blockquote.answers {
        margin: 0 0 1.25rem;
        padding: 0.875rem 1.125rem;
        border-inline-start: 4px solid var(--accent);
        background: var(--surface);
        border-radius: 0 6px 6px 0;
      }
      blockquote.answers p { margin: 0 0 0.5rem; font-size: 0.9375rem; }
      blockquote.answers p:last-child { margin-bottom: 0; }
    </style>
  </head>
  <body>
    <main>
      <nav><a href="./">Back to the demos</a> &middot; <a href="./comparison.html">Requirement matrix</a></nav>
${toHtml(md)}
    </main>
  </body>
</html>
`;

writeFileSync(join(DOCS, "axes.html"), html, "utf8");
process.stdout.write(`wrote docs/axes.md and docs/axes.html (${rows.length} pairings)\n`);
if (!extractionResults) {
  process.stdout.write("A3 is blank: docs/extraction-results.json does not exist yet\n");
}
