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

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteNavHtml, siteNavCss } from "./lib/site-nav.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "docs", "architecture-options.md");
const OUT = join(ROOT, "docs", "architecture-options.html");

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
  let inBlockquote = false;
  let para = null;

  const closePara = () => {
    if (!para) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = null;
  };
  const closeList = () => {
    if (!inList) return;
    out.push("</ul>");
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
      if (!inList) {
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      closePara();
      if (!inList) {
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      i++;
      continue;
    }
    if (inList && line === "") {
      if (inList === "ol") out.push("</ol>");
      else out.push("</ul>");
      inList = false;
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

const bodyHtml = toHtml(md);

const html = `<!doctype html>
<!-- Rendered from docs/architecture-options.md by scripts/build-architecture.mjs -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Architecture options - UNDRR data design system evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#f4f6f8; --surface:#fff; --text:#14232e;
              --muted:#4a5c69; --border:#c8d2da; --accent:#2f6f8f; }
      @media (prefers-color-scheme: dark) {
        :root { --bg:#10191f; --surface:#17232b; --text:#e8eef2; --muted:#a3b3bf;
                --border:#2c3d48; --accent:#7fb3cc; }
      }
      * { box-sizing: border-box; }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text);
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height:1.6; }
      main { max-width: 72ch; margin: 0 auto; }
      h1 { font-size:1.75rem; margin:2rem 0 0.5rem; }
      h2 { margin-top:2.5rem; font-size:1.25rem; border-bottom:1px solid var(--border); padding-bottom:0.25rem; }
      h3 { margin-top:2rem; font-size:1.05rem; }
      h4 { margin-top:1.5rem; font-size:1rem; }
      p { color:var(--text); }
      a { color: var(--accent); }
      code { font-size:0.9em; background:var(--surface); padding:0.1em 0.3em; border-radius:3px; border:1px solid var(--border); }
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
      ol, ul { padding-inline-start:1.5rem; }
      li { margin:0.25rem 0; }
      li + li { margin-top:0.5rem; }
      .mermaid { background:var(--surface); border:1px solid var(--border); border-radius:6px;
                 padding:1rem; text-align:center; }
${siteNavCss}
    </style>
  </head>
  <body>
    <main>
${siteNavHtml("architecture")}
${bodyHtml}
    </main>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default' });
    </script>
  </body>
</html>
`;

writeFileSync(OUT, html, "utf8");
process.stdout.write(`wrote docs/architecture-options.html\n`);
