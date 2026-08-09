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
 *
 * WHY ONE TABLE RATHER THAN FIVE SECTIONS. The register was a linear stack of 42
 * prose cards grouped by candidate, and at that length it stopped being readable:
 * a reader could not see the severity distribution, could not compare two
 * libraries without scrolling between sections, and - worst - could not see that
 * several findings are the SAME finding recurring across libraries, because the
 * sections split them apart. `stepper-omits-aria-current` is one fact about four
 * candidates; as four entries in four sections it read as four unrelated problems.
 * So: a single severity-sorted table with the candidates in a column, filters over
 * it, and the full prose one click away. The per-candidate counts survive as the
 * tally chips, which double as filters.
 */

import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteNavHtml, siteNavCss } from "./lib/site-nav.mjs";

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
  blocker: "Warning",
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

/** Short names, because this column repeats on every one of 40-odd rows. */
const SHORT_NAME = {
  "react-aria": "React Aria",
  mui: "MUI",
  carbon: "Carbon",
  mantine: "Mantine",
  antd: "Ant Design",
};

const SHORT_OWNER = {
  candidate: "the library",
  pairing: "library + host",
  "third party": "a dependency",
  host: "the host",
  "our implementation": "our demo code",
  "this evaluation": "our method",
};

const SHORT_REMEDIABILITY = {
  config: "config",
  "per-site-code": "per-site code",
  "upstream-only": "upstream only",
  "out-of-scope": "out of scope",
  inherent: "inherent",
};

/**
 * An issue can name several candidates, or `*`. Listing them in one cell beats
 * emitting the same finding as four near-identical rows - the cross-library
 * findings are precisely the ones a reader should see as ONE fact, and
 * `stepper-omits-aria-current` repeated four times would read as four problems.
 */
function candidatesOf(issue) {
  if (issue.candidates.includes("*")) return CANDIDATES.map(([id]) => id);
  return CANDIDATES.map(([id]) => id).filter((id) => issue.candidates.includes(id));
}

function candidatesLabel(issue) {
  const ids = candidatesOf(issue);
  if (ids.length === CANDIDATES.length) return "all five";
  return ids.map((id) => SHORT_NAME[id] ?? id).join(", ");
}

/**
 * Two rows per finding: the summary row, and a detail row it discloses.
 *
 * The detail row is a real `<tr>` rather than a nested table or a `<details>`,
 * so the disclosed text stays inside the table's own row sequence for a screen
 * reader rather than appearing after it. Its cell spans the full width, which is
 * why the summary row's column count is fixed rather than conditional.
 *
 * PROGRESSIVE ENHANCEMENT: the detail rows are open in the served HTML and the
 * script closes them on load. So with JavaScript off - or before the script runs
 * - this page is the same complete register it was before, just laid out as a
 * table. Nothing is reachable only by clicking.
 */
function rowHtml(issue, index) {
  const scoreable = SCOREABLE_OWNERS.includes(issue.owner);
  const detailId = `detail-${esc(issue.id)}`;
  return `
            <tr class="row row--${esc(issue.severity)}${issue.resolved ? " row--resolved" : ""}"
                id="${esc(issue.id)}"
                data-severity="${esc(issue.severity)}"
                data-owner="${esc(issue.owner)}"
                data-candidates="${esc(candidatesOf(issue).join(" "))}"
                data-remediability="${esc(issue.remediability ?? "")}"
                data-index="${index}">
              <td class="cell-sev">
                <span class="badge badge--${esc(issue.severity)}">${esc(SEVERITY_LABEL[issue.severity] ?? issue.severity)}</span>
              </td>
              <td class="cell-cand">${esc(candidatesLabel(issue))}</td>
              <td class="cell-title">
                <button type="button" class="disclose" aria-expanded="true" aria-controls="${detailId}">
                  <span class="disclose__mark" aria-hidden="true"></span>
                  <span class="disclose__text">${inline(issue.title)}</span>
                </button>
              </td>
              <td class="cell-owner">${esc(SHORT_OWNER[issue.owner] ?? issue.owner)}${scoreable ? "" : '<span class="cell-owner__note">not scored</span>'}</td>
              <td class="cell-escape">${issue.remediability ? esc(SHORT_REMEDIABILITY[issue.remediability] ?? issue.remediability) : "&mdash;"}</td>
            </tr>
            <tr class="detail" id="${detailId}">
              <td colspan="5">
                <p class="detail__text">${inline(issue.detail)}</p>
                ${
                  issue.resolved
                    ? `<p class="detail__text detail__text--fix"><strong>How it was fixed.</strong> ${inline(issue.resolved)}</p>`
                    : ""
                }
                <p class="detail__meta">
                  Belongs to <strong>${esc(OWNER_LABEL[issue.owner] ?? issue.owner)}</strong>
                  &middot; affects ${esc(hostsLabel(issue))}
                  &middot; ${scoreable ? "counts towards the score" : "<strong>not counted</strong> towards any score"}
                  ${
                    issue.remediability
                      ? `&middot; escape: ${esc(REMEDIABILITY_LABEL[issue.remediability] ?? issue.remediability)}`
                      : ""
                  }
                </p>
                ${
                  issue.links.length > 0
                    ? `<p class="detail__links">${issue.links
                        .map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
                        .join(" &middot; ")}</p>`
                    : ""
                }
                <p class="detail__id"><code>${esc(issue.id)}</code></p>
              </td>
            </tr>`;
}

const bySeverity = (a, b) =>
  SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
  a.title.localeCompare(b.title);

function tableHtml(id, caption, issues) {
  if (issues.length === 0) return "";
  return `
      <div class="register-scroll">
      <table class="register" id="${esc(id)}">
        <caption class="register__caption">${caption}</caption>
        <thead>
          <tr>
            <th scope="col">Severity</th>
            <th scope="col">Candidate</th>
            <th scope="col">Finding</th>
            <th scope="col">Belongs to</th>
            <th scope="col">Escape</th>
          </tr>
        </thead>
        <tbody>
${issues.map(rowHtml).join("\n")}
        </tbody>
      </table></div>`;
}

const openIssues = KNOWN_ISSUES.filter((i) => !i.resolved).sort(bySeverity);
const fixedIssues = KNOWN_ISSUES.filter((i) => i.resolved).sort(bySeverity);

/**
 * Counts per candidate, which no longer fall out of the section structure now
 * that there are no sections. They double as filter buttons.
 */
const tallies = CANDIDATES.map(([id, name]) => {
  const open = openIssues.filter((i) => appliesToCandidate(i, id)).length;
  return `        <button type="button" class="tally" data-filter-candidate="${esc(id)}">
          <span class="tally__name">${esc(name)}</span>
          <span class="tally__count">${open}</span>
        </button>`;
}).join("\n");

const sections = `
      <div class="controls">
        <div class="control">
          <label for="f-severity">Severity</label>
          <select id="f-severity" data-filter="severity">
            <option value="">any</option>
${SEVERITY_ORDER.map((s) => `            <option value="${esc(s)}">${esc(SEVERITY_LABEL[s] ?? s)}</option>`).join("\n")}
          </select>
        </div>
        <div class="control">
          <label for="f-candidate">Candidate</label>
          <select id="f-candidate" data-filter="candidate">
            <option value="">any</option>
${CANDIDATES.map(([id, name]) => `            <option value="${esc(id)}">${esc(name)}</option>`).join("\n")}
          </select>
        </div>
        <div class="control">
          <label for="f-owner">Belongs to</label>
          <select id="f-owner" data-filter="owner">
            <option value="">any</option>
${Object.entries(OWNER_LABEL)
  .map(([id, label]) => `            <option value="${esc(id)}">${esc(label)}</option>`)
  .join("\n")}
          </select>
        </div>
        <div class="control">
          <label for="f-text">Search</label>
          <input id="f-text" type="search" data-filter="text" placeholder="e.g. stepper, tokens, RTL" />
        </div>
        <button type="button" class="control__reset" id="f-reset">Clear filters</button>
      </div>
      <p class="tallies-label">Open findings per candidate — useful as filters, not as a ranking; ownership and severity differ:</p>
      <div class="tallies">
${tallies}
      </div>
      <p class="status" id="status" role="status">${openIssues.length} open findings shown.</p>
${tableHtml("open", `Open findings (${openIssues.length})`, openIssues)}
${tableHtml("fixed", `Fixed in our own demo code, kept on the record (${fixedIssues.length})`, fixedIssues)}`;

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-issues-page.mjs. Regenerate: pnpm issues:page -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Known issues register - UNDRR data design evaluation</title>
    <link rel="stylesheet" href="./mangrove.css" />
    <style>
      :root { --accent:#004f91; --muted:#5b6b77; --border:#d5d5d5; --surface:#fff; --bad:#c10920; --pending:#8a5a00; --bg:#fff; --text:#1a1a1a; }

      /* Controls */
      .controls { display:flex; flex-wrap:wrap; gap:0.75rem 1rem; align-items:flex-end; margin:1.5rem 0 1rem; padding:0.875rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; }
      .control { display:flex; flex-direction:column; gap:0.25rem; }
      .control label { font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); font-weight:600; }
      .control select, .control input { font:inherit; font-size:0.875rem; padding:0.3rem 0.4rem; border:1px solid var(--border); border-radius:4px; background:var(--bg); color:var(--text); min-width:11rem; }
      .control__reset { font:inherit; font-size:0.8125rem; padding:0.4rem 0.75rem; border:1px solid var(--border); border-radius:4px; background:var(--bg); color:var(--text); cursor:pointer; }
      .control__reset:hover { border-color:var(--accent); color:var(--accent); }

      /* Per-candidate tallies, doubling as filter buttons */
      .tallies-label { font-size:0.8125rem; color:var(--muted); margin:1.25rem 0 0.5rem; }
      .tallies { display:flex; flex-wrap:wrap; gap:0.5rem; margin:0 0 1.25rem; }
      .tally { display:inline-flex; align-items:center; gap:0.5rem; font:inherit; font-size:0.8125rem; padding:0.35rem 0.6rem; border:1px solid var(--border); border-radius:999px; background:var(--surface); color:var(--text); cursor:pointer; }
      .tally:hover { border-color:var(--accent); }
      .tally[aria-pressed="true"] { border-color:var(--accent); background:var(--accent); color:var(--bg); }
      .tally__count { font-weight:700; font-variant-numeric:tabular-nums; }
      .status { font-size:0.8125rem; color:var(--muted); margin:0 0 0.75rem; }

      /* The register */
      .register-scroll { overflow-x:auto; margin:0 0 2.5rem; }
      .register { width:100%; border-collapse:collapse; font-size:0.875rem; }
      .register__caption { text-align:start; font-size:1.0625rem; font-weight:700; padding:0 0 0.5rem; }
      .register th { text-align:start; font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); border-bottom:2px solid var(--border); padding:0.4rem 0.5rem; white-space:nowrap; }
      .register td { border-bottom:1px solid var(--border); padding:0.5rem; vertical-align:top; }
      .row--blocker .cell-sev { border-inline-start:4px solid var(--bad); }
      .row--decision .cell-sev { border-inline-start:4px solid var(--pending); }
      .row--resolved { opacity:0.85; }
      .row:target > td { background:color-mix(in srgb, var(--accent) 12%, transparent); }
      .cell-sev { white-space:nowrap; }
      .cell-cand, .cell-owner, .cell-escape { color:var(--muted); font-size:0.8125rem; white-space:nowrap; }
      .cell-owner__note { display:block; font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; }
      .cell-title { width:52%; }
      .badge { display:inline-block; font-size:0.625rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:0.125rem 0.375rem; border:1px solid var(--border); border-radius:3px; }
      .badge--blocker { border-color:var(--bad); color:var(--bad); }
      .badge--decision { border-color:var(--pending); color:var(--pending); }

      /* Disclosure */
      .disclose { display:flex; gap:0.5rem; align-items:baseline; width:100%; font:inherit; font-size:0.9375rem; text-align:start; background:none; border:0; padding:0; color:var(--text); cursor:pointer; }
      .disclose:hover .disclose__text { color:var(--accent); }
      .disclose__mark::before { content:"\\25BE"; display:inline-block; font-size:0.75rem; color:var(--muted); }
      .disclose[aria-expanded="false"] .disclose__mark::before { content:"\\25B8"; }
      .detail > td { background:var(--surface); padding:0.75rem 1rem 0.875rem 2.25rem; }
      .detail__text { margin:0 0 0.5rem; max-width:80ch; }
      .detail__text--fix { color:var(--muted); }
      .detail__meta { margin:0 0 0.5rem; font-size:0.75rem; color:var(--muted); }
      .detail__links { margin:0 0 0.25rem; font-size:0.8125rem; }
      .detail__id { margin:0; font-size:0.6875rem; color:var(--muted); }
      [hidden] { display:none !important; }

      @media (max-width: 44rem) { .register { min-width:48rem; } }
      @media print {
        .controls, .tallies, .tallies-label, .status, .toc { display:none !important; }
        .register-scroll { overflow:visible; }
        .register { font-size:7.5pt; }
        .detail[hidden] { display:table-row !important; }
      }
${siteNavCss}
    </style>
  </head>
  <body>
${siteNavHtml("issues")}
    <main id="main" class="mg-container mg-page-content--padded">
      <h1>Known issues register</h1>
      <p class="audience-banner"><span class="audience-tag">Developer evidence</span>Raw candidate and demo defects. Use the overview for the business decision and this register for remediation detail.</p>
${sections}
    </main>
    <script>
      /*
        Three behaviours, no dependencies: row disclosure, filtering, and keeping
        a linked-to row reachable.

        The detail rows ship OPEN and are closed here, so the page degrades to the
        full register with JavaScript off. Same reason the filters do nothing until
        this runs - an unfiltered table is the honest default.
      */
      (function () {
        var rows = Array.prototype.slice.call(document.querySelectorAll(".row"));
        var status = document.getElementById("status");
        var openCount = document.querySelectorAll("#open .row").length;

        function detailFor(row) {
          var button = row.querySelector(".disclose");
          return button ? document.getElementById(button.getAttribute("aria-controls")) : null;
        }

        function setOpen(row, open) {
          var button = row.querySelector(".disclose");
          var detail = detailFor(row);
          if (!button || !detail) return;
          button.setAttribute("aria-expanded", String(open));
          detail.hidden = !open;
        }

        rows.forEach(function (row) {
          setOpen(row, false);
          var button = row.querySelector(".disclose");
          if (!button) return;
          button.addEventListener("click", function () {
            setOpen(row, button.getAttribute("aria-expanded") !== "true");
          });
        });

        /* A deep link to #some-issue-id must not land on a collapsed row. */
        function revealHash() {
          if (!window.location.hash) return;
          var target = document.getElementById(window.location.hash.slice(1));
          if (target && target.classList.contains("row")) setOpen(target, true);
        }
        revealHash();
        window.addEventListener("hashchange", revealHash);

        var state = { severity: "", candidate: "", owner: "", text: "" };

        function matches(row) {
          if (state.severity && row.dataset.severity !== state.severity) return false;
          if (state.owner && row.dataset.owner !== state.owner) return false;
          if (state.candidate) {
            var list = (row.dataset.candidates || "").split(" ");
            if (list.indexOf(state.candidate) === -1) return false;
          }
          if (state.text) {
            /* Searches the detail too, so "RTL" finds findings whose title
               does not say RTL. The detail row's text is the same string. */
            var detail = detailFor(row);
            var hay = (row.textContent + " " + (detail ? detail.textContent : "")).toLowerCase();
            if (hay.indexOf(state.text) === -1) return false;
          }
          return true;
        }

        function apply() {
          var shown = 0;
          var shownOpen = 0;
          rows.forEach(function (row) {
            var ok = matches(row);
            row.hidden = !ok;
            var detail = detailFor(row);
            if (detail && !ok) detail.hidden = true;
            if (ok) {
              shown += 1;
              if (row.closest("#open")) shownOpen += 1;
            }
          });
          document.querySelectorAll(".register").forEach(function (table) {
            table.hidden = table.querySelectorAll(".row:not([hidden])").length === 0;
          });
          var filtered = state.severity || state.candidate || state.owner || state.text;
          status.textContent = filtered
            ? shown + " findings match (" + shownOpen + " of " + openCount + " open)."
            : openCount + " open findings shown.";
        }

        document.querySelectorAll("[data-filter]").forEach(function (input) {
          var key = input.getAttribute("data-filter");
          input.addEventListener("input", function () {
            state[key] = key === "text" ? input.value.trim().toLowerCase() : input.value;
            if (key === "candidate") syncTallies();
            apply();
          });
        });

        var tallies = Array.prototype.slice.call(document.querySelectorAll(".tally"));
        function syncTallies() {
          tallies.forEach(function (t) {
            t.setAttribute(
              "aria-pressed",
              String(t.getAttribute("data-filter-candidate") === state.candidate)
            );
          });
        }
        tallies.forEach(function (t) {
          t.setAttribute("aria-pressed", "false");
          t.addEventListener("click", function () {
            var id = t.getAttribute("data-filter-candidate");
            state.candidate = state.candidate === id ? "" : id;
            document.getElementById("f-candidate").value = state.candidate;
            syncTallies();
            apply();
          });
        });

        document.getElementById("f-reset").addEventListener("click", function () {
          state = { severity: "", candidate: "", owner: "", text: "" };
          document.querySelectorAll("[data-filter]").forEach(function (i) {
            i.value = "";
          });
          syncTallies();
          apply();
        });
      })();
    </script>
  </body>
</html>
`;

if (!existsSync(DOCS)) {
  process.stderr.write("docs/ does not exist\n");
  process.exit(1);
}
writeFileSync(join(DOCS, "issues.html"), html, "utf8");
process.stdout.write(`wrote docs/issues.html (${KNOWN_ISSUES.length} issues)\n`);
