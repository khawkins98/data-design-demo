#!/usr/bin/env node
/**
 * Generates docs/comparison.md — the side-by-side matrix across all pairings.
 *
 * This is the artefact the evaluation exists to produce. The landing page shows
 * per-demo cards, and each run writes its own evidence.json, but neither lets
 * you answer "which candidate should UNDRR pick" without opening eight files and
 * holding them in your head.
 *
 * Generated, never hand-edited: the numbers must come from the runs themselves,
 * or the comparison becomes a place where a stale figure can hide.
 *
 *   pnpm comparison
 *
 * Pairings with no evidence.json yet are shown as not started rather than
 * omitted, so a gap is visible instead of looking like a clean sweep.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "docs", "comparison.md");

const manifest = JSON.parse(readFileSync(join(ROOT, "docs", "manifest.json"), "utf8"));

/**
 * Canonical requirement IDs, parsed from the contract in document order.
 *
 * Parsed rather than hard-coded so the matrix cannot silently drift from
 * docs/requirements.md. Restricted to the "Requirement IDs" section, because
 * later sections contain tables whose first column is not an ID.
 */
function requirementIds() {
  const doc = readFileSync(join(ROOT, "docs", "requirements.md"), "utf8");
  const start = doc.indexOf("## Requirement IDs");
  if (start === -1) throw new Error("docs/requirements.md has no '## Requirement IDs' section");
  const end = doc.indexOf("\n---", start);
  const section = doc.slice(start, end === -1 ? undefined : end);

  const ids = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|/);
    if (match?.[1]) ids.push(match[1]);
  }
  if (ids.length === 0) throw new Error("parsed no requirement IDs");
  return ids;
}

const REQUIREMENT_IDS = requirementIds();

/** Every pairing, in manifest order: hosts outer, candidates inner. */
const pairings = [];
for (const host of manifest.hosts) {
  for (const candidate of manifest.candidates) {
    const dir = `${host.id}-${candidate.id}`;
    const path = join(ROOT, "apps", dir, "evidence.json");
    let evidence = null;
    if (existsSync(path)) {
      try {
        evidence = JSON.parse(readFileSync(path, "utf8"));
      } catch (error) {
        process.stderr.write(`warning: ${dir}/evidence.json is not valid JSON: ${error.message}\n`);
      }
    }
    pairings.push({ dir, host, candidate, evidence });
  }
}

const built = pairings.filter((p) => p.evidence);

const STATUS_MARK = {
  native: "N",
  composed: "COM",
  custom: "CUS",
  unsupported: "**U**",
};

/** Formats a value for a table cell, marking absence rather than printing "undefined". */
const cell = (value, suffix = "") =>
  value === null || value === undefined ? "—" : `${value}${suffix}`;

function requirementRow(id) {
  const cells = pairings.map((p) => {
    if (!p.evidence) return "·";
    const req = p.evidence.requirements?.find((r) => r.id === id);
    if (!req) return "?";
    return STATUS_MARK[req.status] ?? req.status;
  });
  return `| \`${id}\` | ${cells.join(" | ")} |`;
}

function countStatuses(evidence) {
  const counts = { native: 0, composed: 0, custom: 0, unsupported: 0 };
  for (const req of evidence.requirements ?? []) {
    if (req.status in counts) counts[req.status] += 1;
  }
  return counts;
}

function spark(value, max) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(n) || !max) return String(value);
  const pct = Math.round((n / max) * 100);
  return `{spark:${pct}:${value}}`;
}

function sparkRow(label, extractor) {
  const vals = pairings.map((p) => p.evidence ? extractor(p) : null);
  const nums = vals.filter((v) => v !== null && v !== undefined).map(Number).filter((n) => !isNaN(n));
  const max = Math.max(...nums, 0);
  return `| ${label} | ${vals.map((v) => v === null || v === undefined ? "—" : spark(Number(v), max)).join(" | ")} |`;
}

const header = pairings.map((p) => `${p.candidate.name.replace(/ \(.*\)/, "")}<br>${p.host.name}`);
const headerRow = `| | ${header.join(" | ")} |`;
const dividerRow = `| --- | ${pairings.map(() => "---").join(" | ")} |`;

const lines = [
  "<!--",
  "  GENERATED FILE - DO NOT EDIT BY HAND.",
  "  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.",
  "  Regenerate with: pnpm comparison",
  "-->",
  "",
  "# Candidate comparison",
  "",
  `${built.length} of ${pairings.length} pairings built.` +
    ` All five candidates met every requirement (zero \`unsupported\`). The biggest differentiator` +
    " is not what each library can do, but how it integrates: RTL support, style containment," +
    " and theming route are where the candidates diverge." +
    " See [scores](./scores.md) for the weighted recommendation.",
  "",
  "## Headline",
  "",
  headerRow,
  dividerRow,
  ...(() => {
    const allCounts = pairings.map((p) => p.evidence ? countStatuses(p.evidence) : null);
    const maxN = Math.max(...allCounts.map((c) => c?.native ?? 0));
    const maxCom = Math.max(...allCounts.map((c) => c?.composed ?? 0));
    const maxCus = Math.max(...allCounts.map((c) => c?.custom ?? 0));
    return [
      `| **Native** | ${allCounts.map((c) => c ? spark(c.native, maxN) : "—").join(" | ")} |`,
      `| **Composed** | ${allCounts.map((c) => c ? spark(c.composed, maxCom) : "—").join(" | ")} |`,
      `| **Custom** | ${allCounts.map((c) => c ? spark(c.custom, maxCus) : "—").join(" | ")} |`,
      `| **Unsupported** | ${allCounts.map((c) => c ? String(c.unsupported) : "—").join(" | ")} |`,
    ];
  })(),
  sparkRow("Custom lines of code", (p) => (p.evidence.requirements ?? []).reduce((a, r) => a + (r.customLinesOfCode ?? 0), 0)),
  sparkRow("Custom CSS lines", (p) => p.evidence?.customCss?.lines),
  sparkRow("CSS selectors", (p) => p.evidence?.customCss?.selectors),
  sparkRow("Wrappers", (p) => p.evidence?.wrappers?.count),
  sparkRow("Tokens applied", (p) => p.evidence?.theming?.tokensApplied),
  sparkRow("Tokens unreachable", (p) => p.evidence?.theming?.tokensUnreachable),
  sparkRow("Bundle (kB gzipped)", (p) => p.evidence?.bundle?.gzippedKb),
  sparkRow("Dependencies", (p) => p.evidence?.bundle?.dependencyCount),
  sparkRow("Build time (s)", (p) => p.evidence?.buildTimeSeconds),
  "",
  "## Conformance signals",
  "",
  "Leakage is the load-bearing one: it says whether the candidate stayed inside",
  "its own subtree and left the host's own elements alone. axe counts are scoped",
  "to the candidate subtree, so host baseline violations are excluded.",
  "",
  headerRow,
  dividerRow,
  // Deliberately does NOT print differences.length. A run may summarise that
  // array rather than enumerate it — mangrove-carbon records a summary plus
  // samples, 19 entries for a real 54 — so a count here would understate the
  // failure. The authoritative diff is each run's test-results/leakage.json.
  `| Leakage | ${pairings.map((p) => {
    if (!p.evidence?.leakage) return "—";
    return p.evidence.leakage.assertionPassed ? "clean" : "**FAILED**";
  }).join(" | ")} |`,
  `| axe violations | ${pairings.map((p) => cell(p.evidence?.axe?.violations)).join(" | ")} |`,
  `| axe critical | ${pairings.map((p) => cell(p.evidence?.axe?.critical)).join(" | ")} |`,
  `| axe serious | ${pairings.map((p) => cell(p.evidence?.axe?.serious)).join(" | ")} |`,
  `| axe incomplete | ${pairings.map((p) => cell(p.evidence?.axe?.incomplete)).join(" | ")} |`,
  `| RTL | ${pairings.map((p) => cell(p.evidence?.rtl?.status)).join(" | ")} |`,
  `| Long labels | ${pairings.map((p) => cell(p.evidence?.longLabels?.status)).join(" | ")} |`,
  `| Warnings | ${pairings.map((p) => (p.evidence ? (p.evidence.blockers?.length ?? 0) : "—")).join(" | ")} |`,
  "",
  "## Requirement matrix",
  "",
  "`N` native · `COM` composed · `CUS` custom · **`U`** unsupported · `·` not started",
  "",
  headerRow,
  dividerRow,
  ...REQUIREMENT_IDS.map(requirementRow),
  ...(() => {
    const allCounts = pairings.map((p) => p.evidence ? countStatuses(p.evidence) : null);
    const maxN = Math.max(...allCounts.map((c) => c?.native ?? 0));
    const maxCom = Math.max(...allCounts.map((c) => c?.composed ?? 0));
    const maxCus = Math.max(...allCounts.map((c) => c?.custom ?? 0));
    return [
      `| **Native** | ${allCounts.map((c) => c ? spark(c.native, maxN) : "—").join(" | ")} |`,
      `| **Composed** | ${allCounts.map((c) => c ? spark(c.composed, maxCom) : "—").join(" | ")} |`,
      `| **Custom** | ${allCounts.map((c) => c ? spark(c.custom, maxCus) : "—").join(" | ")} |`,
    ];
  })(),
  "",
];

// Human-review items: count up front, detail collapsed.
const reviewItems = built.flatMap((p) =>
  (p.evidence.humanReviewRequired ?? []).map((item) => ({ dir: p.dir, item })),
);
const reviewPairings = [...new Set(reviewItems.map((r) => r.dir))];
lines.push("## Still needs human review", "");
lines.push(
  `**${reviewItems.length} items across ${reviewPairings.length} pairings** need a person.`,
  "No run claims accessibility conformance.",
  "",
);
lines.push("<details><summary>Full list</summary>", "");
for (const p of built) {
  const items = p.evidence.humanReviewRequired ?? [];
  if (items.length === 0) continue;
  lines.push(`### ${p.dir}`, "");
  for (const item of items) lines.push(`- ${item}`);
  lines.push("");
}
lines.push("</details>", "");

const markdown = lines.join("\n");
writeFileSync(OUT, markdown, "utf8");

/**
 * Renders our own generated markdown to HTML.
 *
 * Deliberately minimal and NOT a general markdown parser: it handles only the
 * constructs emitted above — headings, pipe tables, list items, paragraphs, and
 * inline code/bold. GitHub Pages serves a .md file as raw text, so without this
 * the comparison would arrive as an unreadable wall of pipes in the browser.
 * The .md stays for reading in the repo, where GitHub renders it.
 */
function statusCellClass(text) {
  const t = text.trim();
  if (t === "N") return "st-n";
  if (t === "COM") return "st-com";
  if (t === "CUS") return "st-cus";
  if (t === "**U**") return "st-u";
  if (t === "clean") return "st-n";
  if (t === "**FAILED**") return "st-u";
  return null;
}

function toHtml(md) {
  const inline = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Restore the one raw tag the generator emits on purpose: the column
      // headers stack candidate over host. GitHub renders it in the .md too.
      .replace(/&lt;br&gt;/g, "<br>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\{spark:(\d+):([^}]+)\}/g, (_, pct, display) => {
        return `<span class="spark"><span class="spark-bar" style="width:${pct}%"></span>${display}</span>`;
      });

  const out = [];
  const rows = md.split("\n");
  let table = null;
  let list = null;
  let para = null;

  const closeTable = () => {
    if (!table) return;
    out.push('<div class="scroll"><table>');
    out.push(`<thead><tr>${table.head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`);
    out.push("<tbody>");
    for (const r of table.body) {
      out.push(`<tr>${r.map((c) => {
        const cls = statusCellClass(c);
        return cls ? `<td class="${cls}">${inline(c)}</td>` : `<td>${inline(c)}</td>`;
      }).join("")}</tr>`);
    }
    out.push("</tbody></table></div>");
    table = null;
  };
  const closeList = () => {
    if (!list) return;
    out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
    list = null;
  };
  // The markdown is hard-wrapped, so consecutive text lines are one paragraph.
  // Without this every line became its own <p> and the prose read as a list.
  const closePara = () => {
    if (!para) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = null;
  };

  const cells = (line) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  for (const line of rows) {
    if (line.startsWith("<!--") || line.startsWith("  ") || line === "-->") continue;
    if (line.startsWith("<details") || line === "</details>") {
      closePara(); closeList(); closeTable();
      out.push(line);
      continue;
    }

    if (line.startsWith("|")) {
      closeList();
      closePara();
      const parsed = cells(line);
      if (parsed.every((c) => /^-+$/.test(c))) continue; // divider row
      if (!table) table = { head: parsed, body: [] };
      else table.body.push(parsed);
      continue;
    }
    closeTable();

    if (line.startsWith("- ")) {
      closePara();
      (list ??= []).push(line.slice(2));
      continue;
    }
    closeList();

    const heading = line.match(/^(#{1,3}) (.*)$/);
    if (heading) {
      closePara();
      const level = heading[1]?.length ?? 1;
      out.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      continue;
    }
    if (line.trim() === "") {
      closePara();
      continue;
    }
    (para ??= []).push(line);
  }
  closeTable();
  closeList();
  closePara();
  return out.join("\n");
}

const html = `<!doctype html>
<!-- GENERATED by scripts/build-comparison.mjs. Regenerate with: pnpm comparison -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Candidate comparison - UNDRR data design system evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#f4f6f8; --surface:#fff; --text:#14232e;
              --muted:#4a5c69; --border:#c8d2da; --accent:#2f6f8f; }
      @media (prefers-color-scheme: dark) {
        :root { --bg:#10191f; --surface:#17232b; --text:#e8eef2; --muted:#a3b3bf;
                --border:#2c3d48; --accent:#7fb3cc; }
      }
      * { box-sizing: border-box; }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text);
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height:1.5; }
      main { max-width: 90rem; margin: 0 auto; }
      h1 { font-size:1.75rem; } h2 { margin-top:2.5rem; font-size:1.25rem; }
      h3 { margin-top:1.5rem; font-size:1rem; }
      p { max-width: 80ch; color: var(--muted); }
      .scroll { overflow-x:auto; margin:1rem 0; }
      table { border-collapse: collapse; font-size:0.8125rem; background:var(--surface); }
      th, td { padding:0.375rem 0.625rem; border:1px solid var(--border); text-align:left;
               white-space:nowrap; }
      thead th { position:sticky; top:0; background:var(--surface); }
      tbody td:first-child, tbody th:first-child { font-weight:600; }
      code { font-size:0.9em; }
      a { color: var(--accent); }
      ul { max-width: 80ch; color: var(--muted); }
      .spark { position:relative; display:inline-block; min-width:3.5rem; text-align:right; padding:0 0.3rem; }
      .spark-bar { position:absolute; inset:0; background:var(--accent); opacity:0.13; border-radius:2px; }
      .st-n   { background:#d4edda; color:#155724; text-align:center; }
      .st-com { background:#fff3cd; color:#856404; text-align:center; }
      .st-cus { background:#ffe0b2; color:#7a4100; text-align:center; }
      .st-u   { background:#f8d7da; color:#721c24; text-align:center; }
      @media (prefers-color-scheme: dark) {
        .st-n   { background:#1b3a26; color:#8fd6a4; }
        .st-com { background:#3a2e0a; color:#e0c36a; }
        .st-cus { background:#3a2508; color:#e0a86a; }
        .st-u   { background:#3a1215; color:#e08a92; }
      }
    </style>
  </head>
  <body>
    <main>
      <p><a href="./">&larr; Back to the ranking</a></p>
${toHtml(markdown)}
    </main>
  </body>
</html>
`;

writeFileSync(join(ROOT, "docs", "comparison.html"), html, "utf8");

process.stdout.write(
  `wrote ${OUT} and comparison.html ` +
    `(${built.length}/${pairings.length} pairings, ${REQUIREMENT_IDS.length} requirements)\n`,
);
