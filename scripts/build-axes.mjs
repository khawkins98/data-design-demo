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
  return walk(src)
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

/**
 * Production dependency counts measured by one method for all apps (`pnpm deps:count`).
 * Per-run self-reported counts disagree and reorder candidates; both are shown.
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
    // A6: carry setup cost alongside status.
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
lines.push("GENERATED FILE - regenerate with `pnpm axes`. Axis definitions and");
lines.push("measurement rules are in [decision-axes.md](./decision-axes.md).");
lines.push("");
lines.push("**This is the evidence layer.** Each section shows the UNDRR question");
lines.push("it answers, then the measurements behind it.");
lines.push("");
lines.push(
  "- For the recommendation, read the [ranking](./scores.html) first.",
);
lines.push(
  "- For per-requirement coverage, see the [requirement matrix](./comparison.html) (all 300 assessments).",
);
lines.push("");

pushAxis("A1", "Implementation effort");
lines.push(
  "`beyond native` counts requirements needing more than a documented component.",
);
lines.push("`traps` counts documented approaches that failed and needed workarounds.");
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
lines.push("Each friction-log entry is a place the documented approach did not suffice.");
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
  "`attribute`: semantic selectors (`[data-*]`, `[slot]`). `contract`: documented styling API.",
);
lines.push(
  "`off route`: styling that bypasses the library's own theming mechanism.",
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

pushAxis("A3", "Reproducibility across sites");
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
    "`basis`: only MUI was actually extracted; other entries are analysis.",
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
  "`unreachable`: tokens with no hook to attach to. `propagation`: stylesheet swap",
);
lines.push("reaches every site at once; rebuild is per site.");
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
  "Read `status` against `setup`: `clean` at `native`/0 lines means a `dir` attribute",
);
lines.push("sufficed; `clean` at `composed`/18 lines means the library needed mitigation.");
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

pushAxis("A7", "Accessibility conformance");
lines.push(
  "`incomplete` counts checks axe declined to decide. Nine of ten runs ran axe",
);
lines.push("unscoped, so counts are directional, not exact.");
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
      /* Plain-language Q&A block at the top of each axis section. */
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
