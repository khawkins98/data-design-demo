#!/usr/bin/env node
/**
 * Writes docs/issues.html: the full known-issues register.
 *
 *   pnpm issues:page
 *
 * WHY. Until now the complete text of a finding existed in exactly two places: the
 * box on a demo page, and the TypeScript registry. So a reader on the landing page
 * saw "Carbon cannot express about 30% of the UNDRR design tokens **and 4 more**"
 * with no way to find out what the four were, short of opening a demo or reading
 * source. The most consequential facts in this evaluation were the least reachable.
 *
 * This page is also the only place the RESOLVED findings surface. They are excluded
 * from the demo boxes on purpose - a fixed bug is not something you need to know
 * about the page in front of you - but excluding them everywhere would quietly turn
 * an audit trail into a highlight reel. The bugs this evaluation found in its own
 * code are what entitle it to report bugs in anyone else's, so they get a section
 * with the same prominence as the rest.
 *
 * Generated from the same registry the demo pages import, so the two cannot
 * disagree.
 */

import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DOCS = join(ROOT, "docs");

const { KNOWN_ISSUES, SEVERITY_ORDER, SCOREABLE_OWNERS } = await import(
  join(ROOT, "packages", "known-issues", "src", "issues.ts")
);

const CANDIDATES = [
  ["react-aria", "Adobe React Aria"],
  ["mui", "MUI (Community only)"],
  ["carbon", "IBM Carbon"],
  ["mantine", "Mantine"],
  ["antd", "Ant Design"],
];

const SEVERITY_LABEL = {
  blocker: "Blocker",
  decision: "Decision needed",
  caveat: "Caveat",
  info: "Context",
};

const OWNER_LABEL = {
  candidate: "the library",
  pairing: "this combination of library and host",
  "third party": "a dependency the library pulls in",
  host: "the host design system",
  "our implementation": "our own demo code, not the library",
  "this evaluation": "this evaluation's method",
};

const REMEDIABILITY_LABEL = {
  config: "reversible per site by changing a setting",
  "per-site-code": "fixable in consuming code, repeated per site",
  "upstream-only": "needs a change in the library",
  "out-of-scope": "a fix exists but this evaluation's rules forbid it",
  inherent: "cannot be escaped while using the library as documented",
};

function esc(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders `` `code` `` spans, the only markup the details use. */
function inline(text) {
  return esc(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function appliesToCandidate(issue, candidate) {
  return issue.candidates.includes("*") || issue.candidates.includes(candidate);
}

function hostsLabel(issue) {
  if (issue.hosts.includes("*")) return "both hosts";
  return issue.hosts.map((h) => (h === "delta" ? "Delta" : "Mangrove")).join(" and ");
}

function issueHtml(issue) {
  const scoreable = SCOREABLE_OWNERS.includes(issue.owner);
  return `
        <article class="issue issue--${esc(issue.severity)}${issue.resolved ? " issue--resolved" : ""}" id="${esc(issue.id)}">
          <h4 class="issue__title">
            <span class="issue__badge">${esc(SEVERITY_LABEL[issue.severity] ?? issue.severity)}</span>
            ${inline(issue.title)}
            ${issue.resolved ? '<span class="issue__fixed">fixed</span>' : ""}
          </h4>
          <p class="issue__meta">
            Belongs to <strong>${esc(OWNER_LABEL[issue.owner] ?? issue.owner)}</strong>
            &middot; affects ${esc(hostsLabel(issue))}
            &middot; ${scoreable ? "counts towards the score" : "<strong>not counted</strong> towards any score"}
            ${
              issue.remediability
                ? `&middot; escape: ${esc(REMEDIABILITY_LABEL[issue.remediability] ?? issue.remediability)}`
                : ""
            }
          </p>
          <p class="issue__detail">${inline(issue.detail)}</p>
          ${
            issue.resolved
              ? `<p class="issue__resolution"><strong>How it was fixed.</strong> ${inline(issue.resolved)}</p>`
              : ""
          }
          ${
            issue.links.length > 0
              ? `<p class="issue__links">${issue.links
                  .map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
                  .join(" &middot; ")}</p>`
              : ""
          }
          <p class="issue__id"><code>${esc(issue.id)}</code></p>
        </article>`;
}

const bySeverity = (a, b) =>
  SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

const sections = CANDIDATES.map(([id, name]) => {
  const mine = KNOWN_ISSUES.filter((i) => appliesToCandidate(i, id));
  const open = mine.filter((i) => !i.resolved).sort(bySeverity);
  const fixed = mine.filter((i) => i.resolved).sort(bySeverity);
  return `
      <section class="candidate" id="${esc(id)}">
        <h2 class="candidate__name">${esc(name)}</h2>
        <p class="candidate__count">${open.length} open &middot; ${fixed.length} found in our own code and fixed</p>
        <h3 class="candidate__group">Open</h3>
${open.length > 0 ? open.map(issueHtml).join("\n") : "        <p>None recorded.</p>"}
        ${
          fixed.length > 0
            ? `<h3 class="candidate__group">Fixed, kept on the record</h3>\n${fixed.map(issueHtml).join("\n")}`
            : ""
        }
      </section>`;
}).join("\n");

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-issues-page.mjs. Regenerate: pnpm issues:page -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Known issues register - UNDRR data design evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#fbfbfb; --surface:#fff; --text:#14232e; --muted:#5b6b77; --border:#d9dee2; --accent:#004f91; --bad:#c10920; --pending:#8a5a00; }
      @media (prefers-color-scheme: dark) { :root { --bg:#11181d; --surface:#18222a; --text:#e8eef2; --muted:#9fb0bc; --border:#2b3841; --accent:#7fb2e5; --bad:#ff8090; --pending:#e0a838; } }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,"Segoe UI",sans-serif; line-height:1.55; }
      .page { max-width:60rem; margin:0 auto; }
      h1 { font-size:1.75rem; margin:0 0 0.5rem; }
      .lead { color:var(--muted); max-width:72ch; }
      .toc { margin:1.5rem 0 2.5rem; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:0.5rem 1rem; font-size:0.9375rem; }
      .candidate { margin:0 0 3rem; }
      .candidate__name { font-size:1.375rem; margin:0 0 0.25rem; padding-bottom:0.375rem; border-bottom:2px solid var(--border); }
      .candidate__count { margin:0 0 1rem; color:var(--muted); font-size:0.875rem; }
      .candidate__group { font-size:0.9375rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin:1.75rem 0 0.75rem; }
      .issue { background:var(--surface); border:1px solid var(--border); border-inline-start:4px solid var(--muted); border-radius:6px; padding:0.875rem 1rem; margin:0 0 0.875rem; }
      .issue--blocker { border-inline-start-color:var(--bad); }
      .issue--decision { border-inline-start-color:var(--pending); }
      .issue--resolved { opacity:0.82; }
      .issue__title { font-size:1rem; margin:0 0 0.375rem; }
      .issue__badge { display:inline-block; font-size:0.625rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:0.125rem 0.375rem; border:1px solid var(--border); border-radius:3px; margin-inline-end:0.5rem; vertical-align:0.1em; }
      .issue__fixed { font-size:0.6875rem; font-weight:700; text-transform:uppercase; color:var(--muted); margin-inline-start:0.5rem; }
      .issue__meta { margin:0 0 0.5rem; font-size:0.75rem; color:var(--muted); }
      .issue__detail, .issue__resolution { margin:0 0 0.5rem; font-size:0.875rem; max-width:80ch; }
      .issue__links { margin:0 0 0.25rem; font-size:0.8125rem; }
      .issue__id { margin:0; font-size:0.6875rem; color:var(--muted); }
      a { color:var(--accent); }
      code { font-size:0.9em; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>Known issues register</h1>
      <p class="lead">
        Every finding this evaluation recorded, in full, generated from the same
        registry the demo pages import so the two cannot disagree. Each entry says
        <strong>who it belongs to</strong> — which decides whether it may affect a
        score — and, where it could remove a candidate from a shortlist, what it
        would take to escape it.
      </p>
      <p class="lead">
        The <em>fixed</em> sections are defects found in our own demo code. They are
        kept rather than deleted: a record of the bugs this evaluation found in
        itself is what entitles it to report bugs in anyone else's, and they are
        excluded from every score.
      </p>
      <ul class="toc">
${CANDIDATES.map(([id, name]) => `        <li><a href="#${esc(id)}">${esc(name)}</a></li>`).join("\n")}
        <li><a href="./scores.html">Weighted scores</a></li>
        <li><a href="./axes.html">Decision axes</a></li>
        <li><a href="./">All pairings</a></li>
      </ul>
${sections}
    </div>
  </body>
</html>
`;

if (!existsSync(DOCS)) {
  process.stderr.write("docs/ does not exist\n");
  process.exit(1);
}
writeFileSync(join(DOCS, "issues.html"), html, "utf8");
process.stdout.write(`wrote docs/issues.html (${KNOWN_ISSUES.length} issues)\n`);
