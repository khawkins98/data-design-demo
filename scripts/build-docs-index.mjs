#!/usr/bin/env node
/**
 * Generates docs/index.html — the comparison landing page — from
 * docs/manifest.json plus whatever evidence.json files exist under apps/.
 *
 * Generated rather than hand-maintained so that eight parallel Brief 1 runs
 * never contend over one HTML file. Each run only writes its own
 * apps/<host>-<candidate>/evidence.json; this script reads them.
 *
 * A pairing with no app directory yet shows as "not started", and one whose
 * evidence.json lists blockers shows as "blocked". Both are legitimate results
 * for this evaluation and the page says so rather than hiding them.
 *
 *   pnpm docs:index
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const MANIFEST = join(ROOT, "docs", "manifest.json");
const OUT = join(ROOT, "docs", "index.html");

/** Escapes text for safe interpolation into HTML. */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

/** Reads one pairing's evidence.json, or null if the run has not produced one. */
function readEvidence(appDir) {
  const path = join(ROOT, "apps", appDir, "evidence.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    process.stderr.write(`warning: ${appDir}/evidence.json is not valid JSON: ${error.message}\n`);
    return null;
  }
}

const cards = [];
for (const host of manifest.hosts) {
  for (const candidate of manifest.candidates) {
    const appDir = `${host.id}-${candidate.id}`;
    const evidence = readEvidence(appDir);

    let status = "not-started";
    let statusLabel = "Not started";
    if (evidence) {
      const blockers = Array.isArray(evidence.blockers) ? evidence.blockers : [];
      status = blockers.length > 0 ? "blocked" : "complete";
      statusLabel = blockers.length > 0 ? `Blocked (${blockers.length})` : "Complete";
    }

    cards.push({ appDir, host, candidate, evidence, status, statusLabel });
  }
}

/** Renders the metric row shown on a completed card. */
function metrics(evidence) {
  if (!evidence) return "";

  const rows = [
    ["Custom CSS", evidence.customCss?.lines ?? null, "lines"],
    ["Wrappers", evidence.wrappers?.count ?? null, ""],
    ["Tokens applied", evidence.theming?.tokensApplied ?? null, ""],
    ["axe violations", evidence.axe?.violations ?? null, ""],
    ["Bundle", evidence.bundle?.gzippedKb ?? null, "kB gz"],
  ];

  const cells = rows
    .filter(([, value]) => value !== null && value !== undefined)
    .map(
      ([label, value, unit]) =>
        `<div class="metric"><dt>${esc(label)}</dt><dd>${esc(value)}${
          unit ? ` <span class="unit">${esc(unit)}</span>` : ""
        }</dd></div>`,
    )
    .join("");

  return cells ? `<dl class="metrics">${cells}</dl>` : "";
}

/** Renders the leakage and RTL flags, which are the comparison's headline signals. */
function flags(evidence) {
  if (!evidence) return "";
  const items = [];

  if (evidence.leakage) {
    const passed = evidence.leakage.assertionPassed === true;
    items.push(
      `<li class="flag ${passed ? "flag--ok" : "flag--bad"}">Leakage: ${
        passed ? "clean" : `${evidence.leakage.differences?.length ?? 0} differences`
      }</li>`,
    );
  }
  if (evidence.rtl?.status) {
    items.push(
      `<li class="flag flag--${evidence.rtl.status === "clean" ? "ok" : "bad"}">RTL: ${esc(
        evidence.rtl.status,
      )}</li>`,
    );
  }
  if (evidence.longLabels?.status) {
    items.push(
      `<li class="flag flag--${
        evidence.longLabels.status === "clean" ? "ok" : "bad"
      }">Long labels: ${esc(evidence.longLabels.status)}</li>`,
    );
  }

  return items.length ? `<ul class="flags">${items.join("")}</ul>` : "";
}

const cardHtml = cards
  .map((card) => {
    const live = card.status === "complete" || card.status === "blocked";
    const link = live
      ? `<a class="card__link" href="./${esc(card.appDir)}/">Open demo</a>`
      : `<span class="card__link card__link--disabled">Not yet built</span>`;

    return `
      <article class="card card--${esc(card.status)}">
        <header class="card__header">
          <h2 class="card__title">${esc(card.candidate.name)}</h2>
          <p class="card__host">on <strong>${esc(card.host.name)}</strong></p>
        </header>
        <p class="card__status" data-status="${esc(card.status)}">${esc(card.statusLabel)}</p>
        <p class="card__licence">${esc(card.candidate.package)} &middot; ${esc(
          card.candidate.licence,
        )}</p>
        ${flags(card.evidence)}
        ${metrics(card.evidence)}
        ${link}
      </article>`;
  })
  .join("\n");

const built = cards.filter((c) => c.status !== "not-started").length;

const html = `<!doctype html>
<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-docs-index.mjs from docs/manifest.json and
  apps/*/evidence.json. Regenerate with: pnpm docs:index
-->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(manifest.title)}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f4f6f8;
        --surface: #ffffff;
        --text: #14232e;
        --muted: #4a5c69;
        --border: #c8d2da;
        --accent: #2f6f8f;
        --ok: #1f6b45;
        --bad: #a11f2c;
        --pending: #8a6100;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #10191f;
          --surface: #17232b;
          --text: #e8eef2;
          --muted: #a3b3bf;
          --border: #2c3d48;
          --accent: #7fb3cc;
          --ok: #6fc79b;
          --bad: #ef8b96;
          --pending: #e0b458;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 2rem 1.5rem 4rem;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      .page { max-width: 76rem; margin: 0 auto; }
      h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
      .subtitle { color: var(--muted); margin: 0 0 0.5rem; max-width: 60ch; }
      .progress { color: var(--muted); font-size: 0.875rem; margin: 0 0 2rem; }
      .grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .card--not-started { opacity: 0.72; }
      .card__header { margin-bottom: 0.25rem; }
      .card__title { font-size: 1.0625rem; margin: 0; }
      .card__host { margin: 0.125rem 0 0; color: var(--muted); font-size: 0.875rem; }
      .card__status { margin: 0; font-size: 0.8125rem; font-weight: 600; }
      .card__status[data-status="complete"] { color: var(--ok); }
      .card__status[data-status="blocked"] { color: var(--bad); }
      .card__status[data-status="not-started"] { color: var(--pending); }
      .card__licence { margin: 0; font-size: 0.75rem; color: var(--muted); }
      .flags { list-style: none; margin: 0.25rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.375rem; }
      .flag { font-size: 0.6875rem; padding: 0.125rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); }
      .flag--ok { color: var(--ok); }
      .flag--bad { color: var(--bad); }
      .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.375rem 0.75rem; margin: 0.5rem 0 0; }
      .metric dt { font-size: 0.6875rem; color: var(--muted); margin: 0; }
      .metric dd { margin: 0; font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
      .unit { font-size: 0.6875rem; color: var(--muted); font-weight: 400; }
      .card__link { margin-top: auto; padding-top: 0.75rem; font-size: 0.875rem; color: var(--accent); }
      .card__link--disabled { color: var(--muted); }
      footer { margin-top: 3rem; color: var(--muted); font-size: 0.8125rem; max-width: 70ch; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>${esc(manifest.title)}</h1>
      <p class="subtitle">${esc(manifest.subtitle)}</p>
      <p class="progress">${built} of ${cards.length} pairings built.</p>

      <div class="grid">
${cardHtml}
      </div>

      <footer>
        <p>
          <strong><a href="./axes.html">Decision axes</a></strong>
          — start here if you are choosing. Implementation effort, maintainability
          across many sites, reproducibility, Mangrove compatibility and theming
          propagation. The requirement matrix says every candidate can do the job;
          these axes say what each costs to live with.
        </p>
        <p>
          <strong><a href="./comparison.html">Side-by-side comparison</a></strong>
          — every pairing's requirement statuses and metrics in one matrix,
          generated from the same <code>evidence.json</code> files as the cards
          above.
        </p>
        <p>
          Every demo renders identical fixture data, identical labels and an
          identical fixed date, inside a host shell it may not modify. Metrics
          come from each run's <code>evidence.json</code>. Blocked runs are
          reported as blocked: an honest stop is a result, not a gap.
        </p>
        <p>
          Host shells are derived from
          <a href="${esc(manifest.hosts[0].derivedFrom)}">Delta</a> and
          <a href="${esc(manifest.hosts[1].derivedFrom)}">Mangrove</a>, both
          Apache-2.0. See <code>docs/host-derivation.md</code>.
        </p>
      </footer>
    </div>
  </body>
</html>
`;

writeFileSync(OUT, html, "utf8");
process.stdout.write(`wrote ${OUT} (${cards.length} cards, ${built} built)\n`);
