#!/usr/bin/env node
/**
 * Converts docs/architecture-options.md to docs/architecture-options.html.
 *
 * The markdown is hand-written, not generated, but it needs an HTML version
 * so it can be reached from the site navigation without leaving for GitHub.
 * Mermaid diagrams are rendered natively by the browser (via <pre class="mermaid">).
 *
 *   node scripts/build-architecture.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteNavHtml, siteNavCss } from "./lib/site-nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "docs", "architecture-options.md");
const OUT = join(ROOT, "docs", "architecture-options.html");
const CASE_SRC = join(ROOT, "docs", "case-study-stepper.md");
const CASE_OUT = join(ROOT, "docs", "case-study-stepper.html");
const REUSE_RESULTS = join(ROOT, "docs", "reuse-results.json");

const md = readFileSync(SRC, "utf8");

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>',
    );
}

function toHtml(source) {
  const out = [];
  const lines = source.split("\n");
  let i = 0;
  let inTable = false;
  let tableHead = false;
  let inList = false;
  let listItem = null;
  let inBlockquote = false;
  let para = null;

  const closePara = () => {
    if (!para) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = null;
  };
  const closeListItem = () => {
    if (!listItem) return;
    out.push(`<li>${inline(listItem.join(" "))}</li>`);
    listItem = null;
  };
  const closeList = () => {
    if (!inList) return;
    closeListItem();
    out.push(inList === "ol" ? "</ol>" : "</ul>");
    inList = false;
  };
  const closeBlockquote = () => {
    if (!inBlockquote) return;
    closePara();
    out.push("</blockquote>");
    inBlockquote = false;
  };
  const closeTable = () => {
    if (!inTable) return;
    out.push("</tbody></table></div>");
    inTable = false;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code / mermaid blocks
    if (line.startsWith("```")) {
      closePara();
      closeList();
      closeBlockquote();
      closeTable();
      const lang = line.slice(3).trim();
      const block = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        block.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      if (lang === "mermaid") {
        out.push(`<pre class="mermaid">${esc(block.join("\n"))}</pre>`);
      } else {
        out.push(`<pre><code>${esc(block.join("\n"))}</code></pre>`);
      }
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,4}) (.*)$/);
    if (heading) {
      closePara();
      closeList();
      closeBlockquote();
      closeTable();
      const level = heading[1].length;
      const text = heading[2];
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      out.push(`<h${level} id="${slug}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Tables
    if (line.startsWith("|")) {
      closePara();
      closeList();
      closeBlockquote();
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        // divider row — skip, table header was already emitted
        i++;
        continue;
      }
      if (!inTable) {
        out.push('<div class="scroll"><table><thead>');
        out.push(
          `<tr>${cells.map((c) => `<th>${inline(c)}</th>`).join("")}</tr>`,
        );
        out.push("</thead><tbody>");
        inTable = true;
        tableHead = true;
      } else {
        out.push(
          `<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
        );
      }
      i++;
      continue;
    }
    closeTable();

    // Blockquotes
    if (line.startsWith("> ")) {
      closePara();
      closeList();
      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }
      (para ??= []).push(line.slice(2));
      i++;
      continue;
    }
    if (inBlockquote && line === "") {
      closeBlockquote();
      i++;
      continue;
    }
    if (inBlockquote && !line.startsWith("> ")) {
      closeBlockquote();
    }

    // List items
    if (/^\d+\.\s/.test(line)) {
      closePara();
      if (inList && inList !== "ol") closeList();
      if (!inList) {
        out.push("<ol>");
        inList = "ol";
      }
      closeListItem();
      listItem = [line.replace(/^\d+\.\s/, "")];
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      closePara();
      if (inList && inList !== "ul") closeList();
      if (!inList) {
        out.push("<ul>");
        inList = "ul";
      }
      closeListItem();
      listItem = [line.slice(2)];
      i++;
      continue;
    }
    if (inList && line === "") {
      closeList();
      i++;
      continue;
    }
    if (inList) {
      listItem.push(line.trim());
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      closePara();
      i++;
      continue;
    }

    // Continuation / paragraph text
    (para ??= []).push(line);
    i++;
  }

  closePara();
  closeList();
  closeBlockquote();
  closeTable();
  return out.join("\n");
}

function reuseComparisonHtml() {
  const results = JSON.parse(readFileSync(REUSE_RESULTS, "utf8"));
  const reactAria = results.candidates["react-aria"];
  const mui = results.candidates.mui;

  const countLines = (dir, extensionPattern) => {
    const files = readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? [path] : extensionPattern.test(name) ? [path] : [];
    });
    return files.reduce((total, path) => {
      if (statSync(path).isDirectory()) return total + countLines(path, extensionPattern);
      const source = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return total + source.split(/\r?\n/).filter((line) => line.trim()).length;
    }, 0);
  };
  const reactAriaSrc = join(ROOT, reactAria.package, "src");
  const measuredSourceLines = countLines(reactAriaSrc, /\.tsx?$/);
  const measuredCssLines = countLines(reactAriaSrc, /\.css$/);
  if (
    measuredSourceLines !== reactAria.sharedSourceLines ||
    measuredCssLines !== reactAria.sharedCssLines
  ) {
    throw new Error(
      `reuse-results.json drift: React Aria records ${reactAria.sharedSourceLines} source / ` +
        `${reactAria.sharedCssLines} CSS lines, measured ${measuredSourceLines} / ${measuredCssLines}`,
    );
  }

  const card = (name, candidate) => `
    <article class="reuse-card">
      <p class="reuse-card__eyebrow">Measured shared package</p>
      <h3>${esc(name)}</h3>
      <p class="reuse-card__metric"><strong>${candidate.sharedSourceLines}</strong> shared source lines${candidate.sharedCssLines ? ` + ${candidate.sharedCssLines} CSS` : ""}</p>
      <p><strong>Visual authority: ${esc(candidate.visualAuthority)}</strong></p>
      <p>${esc(candidate.visualAuthorityNote)}</p>
    </article>`;

  const changeRow = (label, key) => {
    const a = reactAria.changes[key];
    const m = mui.changes[key];
    return `<tr>
      <th scope="row">${esc(label)}</th>
      <td><strong>${esc(a.result)}</strong><span class="cell-note">${esc(a.evidence)}</span></td>
      <td><strong>${esc(m.result)}</strong><span class="cell-note">${esc(m.evidence)}</span></td>
    </tr>`;
  };

  return `<section class="reuse-evidence" aria-labelledby="reuse-evidence-title">
    <div class="reuse-evidence__heading">
      <p class="reuse-card__eyebrow">Generated from reuse-results.json</p>
      <h3 id="reuse-evidence-title">What the second product actually inherits</h3>
      <p>${esc(results.capability)}</p>
    </div>
    <div class="reuse-grid">${card("Adobe React Aria", reactAria)}${card("MUI", mui)}
    </div>
    <div class="scroll reuse-table"><table>
      <thead><tr><th>Controlled change</th><th>React Aria shared layer</th><th>MUI shared integration</th></tr></thead>
      <tbody>
        ${changeRow("UNDRR token", "token")}
        ${changeRow("Interaction policy", "interactionPolicy")}
        ${changeRow("RTL and localisation", "rtlAndLocalisation")}
      </tbody>
    </table></div>
  </section>`;
}

let bodyHtml = toHtml(md);
bodyHtml = bodyHtml.replace(
  /(<h2 id="the-reuse-and-ownership-result">[\s\S]*?<\/h2>)/,
  `$1\n${reuseComparisonHtml()}`,
);

const html = `<!doctype html>
<!-- Rendered from docs/architecture-options.md by scripts/build-architecture.mjs -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Architecture options - UNDRR data design system evaluation</title>
    <link rel="stylesheet" href="./mangrove.css" />
    <style>
      :root { --accent:#004f91; --muted:#4a5c69; --border:#d5d5d5; --surface:#fff; }
      html { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
      pre { background:var(--surface); border:1px solid var(--border); border-radius:6px;
            padding:1rem; overflow-x:auto; font-size:0.8125rem; }
      pre code { background:none; border:none; padding:0; }
      blockquote { margin:1.5rem 0; padding:0.75rem 1.25rem; border-inline-start:3px solid var(--accent);
                   background:var(--surface); border-radius:0 6px 6px 0; }
      blockquote p { margin:0; }
      .scroll { overflow-x:auto; margin:1rem 0; }
      table { border-collapse:collapse; font-size:0.8125rem; background:var(--surface); width:100%; }
      th, td { padding:0.375rem 0.625rem; border:1px solid var(--border); text-align:left; vertical-align:top; }
      thead th { background:var(--surface); font-weight:700; }
      .mermaid { background:var(--surface); border:1px solid var(--border); border-radius:6px;
                 padding:1rem; text-align:center; }
      .mg-docs-main { max-width:88ch; }
      .mg-docs-main h1, .mg-docs-main h2, .mg-docs-main h3 { text-wrap:balance; }
      .mg-docs-main p, .mg-docs-main li { text-wrap:pretty; }
      .reuse-evidence { margin:1rem 0 2.5rem; padding:1.25rem; border-radius:10px;
                        background:#f5f8fb; box-shadow:0 0 0 1px rgb(0 0 0 / 6%), 0 2px 8px rgb(0 0 0 / 5%); }
      .reuse-evidence__heading h3 { margin:0.125rem 0 0.375rem; font-size:1.125rem; }
      .reuse-evidence__heading p:last-child { margin:0; color:var(--muted); }
      .reuse-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; margin:1rem 0; }
      .reuse-card { padding:1rem; border-radius:8px; background:var(--surface);
                    box-shadow:0 0 0 1px rgb(0 0 0 / 6%), 0 1px 3px rgb(0 0 0 / 5%); }
      .reuse-card h3 { margin:0.125rem 0 0.75rem; }
      .reuse-card p { margin:0.375rem 0; font-size:0.875rem; }
      .reuse-card__eyebrow { color:var(--accent); font-size:0.6875rem !important; font-weight:700;
                             letter-spacing:0.06em; text-transform:uppercase; }
      .reuse-card__metric { font-variant-numeric:tabular-nums; }
      .reuse-card__metric strong { font-size:1.5rem; color:var(--accent); }
      .reuse-table { margin-bottom:0; background:var(--surface); }
      .reuse-table th[scope="row"] { white-space:nowrap; }
      .cell-note { display:block; margin-top:0.25rem; color:var(--muted); font-size:0.75rem; line-height:1.4; }
      @media (max-width:48rem) { .reuse-grid { grid-template-columns:1fr; } .reuse-evidence { padding:1rem; } }
${siteNavCss}
    </style>
  </head>
  <body>
${siteNavHtml("architecture")}
    <div class="mg-container mg-page-content--padded mg-docs-main">
${bodyHtml}
    </div>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
  </body>
</html>
`;

writeFileSync(OUT, html, "utf8");
const caseBodyHtml = toHtml(readFileSync(CASE_SRC, "utf8"));
const caseHtml = html
  .replace(
    "Architecture options - UNDRR data design system evaluation",
    "Stepper case study - UNDRR data design system evaluation",
  )
  .replace(bodyHtml, caseBodyHtml);
writeFileSync(CASE_OUT, caseHtml, "utf8");
process.stdout.write(`wrote docs/architecture-options.html and docs/case-study-stepper.html\n`);
