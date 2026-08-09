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
const METHODOLOGY_SRC = join(ROOT, "docs", "methodology.md");
const METHODOLOGY_OUT = join(ROOT, "docs", "methodology.html");
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
      (_match, label, href) => `<a href="${href.replace(/\.md(?=($|#))/, ".html")}">${label}</a>`,
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

  return `<details class="technical-detail">
    <summary><span class="audience-tag">Developer detail</span> Measured reuse package and controlled-change evidence</summary>
    <div class="technical-detail__body"><section class="reuse-evidence" aria-labelledby="reuse-evidence-title">
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
  </section></div></details>`;
}

function costHorizonHtml() {
  return `<section class="cost-horizon" aria-labelledby="cost-horizon-title">
    <div class="cost-horizon__heading">
      <h2 id="cost-horizon-title">Where the cost falls</h2>
      <p>The architecture changes when UNDRR pays for coordination—and what the organisation can change coherently as the estate grows.</p>
    </div>
    <div class="cost-horizon__grid">
      <article class="cost-horizon__card">
        <p class="cost-horizon__type">Types A and B</p>
        <h3>Faster start, accumulating coordination</h3>
        <p><strong>Now:</strong> adopt more upstream structure; Type A in particular offers the easier on-ramp.</p>
        <p><strong>As the estate grows:</strong> parallel stacks require continuing translation and synchronisation, making organisation-wide change harder.</p>
      </article>
      <article class="cost-horizon__card cost-horizon__card--owned">
        <p class="cost-horizon__type">Type C</p>
        <h3>Higher shared investment, compounding reuse</h3>
        <p><strong>Now:</strong> coordinate content and data teams, establish ownership and complete the shared foundation.</p>
        <p><strong>As the estate grows:</strong> shared components and policy are intended to lower marginal integration cost and support coherent change.</p>
      </article>
    </div>
    <p class="cost-horizon__note"><strong>Architectural hypothesis, not a cost forecast.</strong> <a href="./axes.html#a2">A2 models its change amplification across six sites</a>; it does not measure multi-year total cost. A pilot should report person-days per cross-estate change, independent implementation and validation touches, elapsed release time and ongoing owner capacity. Read the <a href="./methodology.html">methodology</a>.</p>
  </section>`;
}

let bodyHtml = toHtml(md);
bodyHtml = bodyHtml.replace(
  /(<h2 id="three-shapes-not-five">)/,
  `${costHorizonHtml()}\n$1`,
);
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
      .mermaid { box-sizing:border-box; width:min(70rem,calc(100vw - 3rem));
                 margin:1rem 0 1.75rem; margin-inline-start:50%; padding:1.25rem;
                 transform:translateX(-50%); overflow-x:auto; text-align:center;
                 background:#fbfcfd; border:0; border-radius:10px;
                 box-shadow:0 0 0 1px rgb(0 0 0 / 8%), 0 2px 8px rgb(0 0 0 / 5%); }
      .mermaid svg { display:block; width:100% !important; max-width:100% !important; height:auto;
                     margin-inline:auto; }
      .mermaid .nodeLabel { line-height:1.35; }
      .mg-docs-main { max-width:88ch; }
      .mg-docs-main h1, .mg-docs-main h2, .mg-docs-main h3 { text-wrap:balance; }
      .mg-docs-main p, .mg-docs-main li { text-wrap:pretty; }
      .cost-horizon { margin:1.5rem 0 2rem; padding:1.25rem; border-radius:10px; background:#f5f8fb;
        box-shadow:0 0 0 1px rgb(0 0 0 / 7%), 0 2px 8px rgb(0 0 0 / 5%); }
      .cost-horizon__heading { display:grid; grid-template-columns:minmax(11rem,0.55fr) minmax(18rem,1.45fr);
        gap:1.25rem; align-items:baseline; margin-bottom:1rem; }
      .cost-horizon__heading h2 { margin:0; padding:0; border:0; font-size:1.25rem; text-wrap:balance; }
      .cost-horizon__heading p { margin:0; color:var(--muted); text-wrap:pretty; }
      .cost-horizon__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
      .cost-horizon__card { padding:1rem; border-radius:7px; background:var(--surface);
        box-shadow:0 0 0 1px rgb(0 0 0 / 7%), 0 1px 3px rgb(0 0 0 / 5%); }
      .cost-horizon__card--owned { box-shadow:inset 3px 0 0 var(--accent), 0 0 0 1px rgb(0 0 0 / 7%), 0 1px 3px rgb(0 0 0 / 5%); }
      .cost-horizon__card h3 { margin:0.2rem 0 0.7rem; font-family:inherit; font-size:1rem; text-wrap:balance; }
      .cost-horizon__card p { margin:0.45rem 0; font-size:0.875rem; text-wrap:pretty; }
      .cost-horizon__type { color:var(--accent); font-size:0.6875rem !important; font-weight:700;
        letter-spacing:0.055em; text-transform:uppercase; }
      .cost-horizon__note { margin:0.9rem 0 0; color:var(--muted); font-size:0.8125rem; text-wrap:pretty; }
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
      @media (max-width:48rem) {
        .cost-horizon__heading, .cost-horizon__grid { grid-template-columns:1fr; }
        .cost-horizon__heading { gap:0.35rem; }
        .reuse-grid { grid-template-columns:1fr; }
        .reuse-evidence { padding:1rem; }
        .mermaid { width:calc(100vw - 2rem); padding:0.75rem; }
      }
${siteNavCss}
    </style>
  </head>
  <body>
${siteNavHtml("architecture")}
    <main id="main" class="mg-container mg-page-content--padded mg-docs-main">
${bodyHtml}
    </main>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({
        startOnLoad: true,
        theme: 'base',
        themeVariables: {
          fontFamily: 'Roboto, system-ui, sans-serif',
          fontSize: '15px',
          lineColor: '#52616d',
          textColor: '#1a2730',
          edgeLabelBackground: '#fbfcfd',
          clusterBkg: '#fbfcfd',
          clusterBorder: '#c7d0d8'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 34,
          rankSpacing: 46,
          padding: 14
        }
      });
    </script>
  </body>
</html>
`;

writeFileSync(OUT, html, "utf8");
const caseBodyHtml = `<p class="audience-banner"><span class="audience-tag">Developer evidence</span>This implementation case study supports the architecture decision; it is not the executive summary.</p>${toHtml(readFileSync(CASE_SRC, "utf8"))}`;
const caseHtml = html
  .replace(
    "Architecture options - UNDRR data design system evaluation",
    "Stepper case study - UNDRR data design system evaluation",
  )
  .replace(bodyHtml, caseBodyHtml);
writeFileSync(CASE_OUT, caseHtml, "utf8");
let methodologyBodyHtml = toHtml(readFileSync(METHODOLOGY_SRC, "utf8"));
methodologyBodyHtml = methodologyBodyHtml.replace(
  /<h2 id="reference-models">Reference models<\/h2>([\s\S]*?)(<p>These references are guides[\s\S]*?<\/p>)/,
  `<details class="technical-detail methodology-references"><summary>Reference models and standards</summary><div class="technical-detail__body">$1$2</div></details>`,
);
const methodologyHtml = html
  .replace(
    "Architecture options - UNDRR data design system evaluation",
    "Methodology - UNDRR data design system evaluation",
  )
  .replace(siteNavHtml("architecture"), siteNavHtml("methodology"))
  .replace(bodyHtml, methodologyBodyHtml);
writeFileSync(METHODOLOGY_OUT, methodologyHtml, "utf8");
process.stdout.write(
  `wrote docs/architecture-options.html, docs/case-study-stepper.html and docs/methodology.html\n`,
);
