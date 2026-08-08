#!/usr/bin/env node
/**
 * Generates docs/index.html from docs/manifest.json and per-app evidence.json.
 *
 *   pnpm docs:index
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { UNDRR_QUESTIONS } from "./lib/undrr-questions.mjs";

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

/**
 * Editorial architecture taxonomy, separate from capability evidence and score.
 * A type describes the estate shape a candidate creates; it is not a grade.
 */
const ARCHITECTURE_TYPES = Object.freeze({
  "react-aria": {
    id: "C",
    name: "Foundational shared system",
    anchor: "c-foundational-adobe-react-aria",
    continuity:
      "One UNDRR-owned component expression can serve DELTA and content products. Strongest synchronization potential; largest ongoing design-system commitment.",
  },
  mui: {
    id: "A",
    name: "Ship and theme",
    anchor: "a-ship-and-theme-mui-mantine-ant-design",
    continuity:
      "A themed application stack runs beside Mangrove's content stack. Each can integrate cleanly, but keeping them synchronized requires a deliberate bridge.",
  },
  carbon: {
    id: "B",
    name: "Complete branded system",
    anchor: "b-complete-branded-system-ibm-carbon",
    continuity:
      "The same parallel-stack problem as Type A, with Carbon's own design language adding another source of visual and structural authority.",
  },
  mantine: {
    id: "A",
    name: "Ship and theme",
    anchor: "a-ship-and-theme-mui-mantine-ant-design",
    continuity:
      "A themed application stack runs beside Mangrove's content stack. Each can integrate cleanly, but keeping them synchronized requires a deliberate bridge.",
  },
  antd: {
    id: "A",
    name: "Ship and theme",
    anchor: "a-ship-and-theme-mui-mantine-ant-design",
    continuity:
      "A themed application stack runs beside Mangrove's content stack. Each can integrate cleanly, but keeping them synchronized requires a deliberate bridge.",
  },
});

/** Where to point markdown docs, which GitHub Pages serves as plain text. */
const DOCS_BLOB = "https://github.com/khawkins98/data-design-demo/blob/main/docs";

/**
 * The six questions, sourced from scripts/lib/undrr-questions.mjs so that
 * this page and axes.html stay in sync.
 */

/* Stacked full-width list: questions are read in order, not scanned. */
const questionsHtml = UNDRR_QUESTIONS.map(
  (q) => `
          <div class="question">
            <h3 class="question__title">
              ${esc(q.question)}
              <span class="question__asks">${esc(q.asks)}</span>
            </h3>
            <p class="question__answer">${esc(q.answer)}</p>
            <p class="question__axis">
              <a href="./axes.html#${esc(q.axis.toLowerCase())}"
                >Evidence: ${esc(q.axis)} ${esc(q.axisName)}</a
              >
            </p>
          </div>`,
).join("\n");

/** Known-issue counts per pairing, from scripts/build-known-issues-json.mjs. */
const KNOWN_ISSUES_PATH = join(ROOT, "docs", "known-issues.json");
const knownIssuesDoc = existsSync(KNOWN_ISSUES_PATH)
  ? JSON.parse(readFileSync(KNOWN_ISSUES_PATH, "utf8"))
  : {};
const knownIssues = knownIssuesDoc.pairings ?? {};
/** Candidate-level totals, so a link's count matches what the link opens. */
const candidateCounts = knownIssuesDoc.candidates ?? {};

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

/**
 * The views a pairing ships, detected from its HTML entry points.
 * Labels must match packages/test-harness/src/views.ts.
 */
const VIEWS = [
  {
    file: "island.html",
    href: "island.html",
    label: "Inside a real page",
    hint: "the candidate owns one region of a live Mangrove page",
    /* Mangrove-only: there is no Delta island, by design. */
    host: "mangrove",
  },
  {
    file: "app.html",
    href: "app.html",
    label: "A whole DELTA screen",
    hint: "layout, navigation and a full records workflow",
    /* Delta-only. */
    host: "delta",
  },
  {
    file: "index.html",
    href: "",
    label: "Component inventory",
    hint: "every component on one page - proves capability, not adoption",
    host: null,
  },
];

/** All applicable views for a host, including unbuilt ones (shown greyed). */
function viewsFor(appDir, hostId) {
  return VIEWS.filter((view) => view.host === null || view.host === hostId).map((view) => ({
    ...view,
    built: existsSync(join(ROOT, "apps", appDir, view.file)),
  }));
}

/* Candidate-major order: each candidate's two hosts sit side by side. */
const groups = [];
for (const candidate of manifest.candidates) {
  const groupCards = [];
  for (const host of manifest.hosts) {
    const appDir = `${host.id}-${candidate.id}`;
    const evidence = readEvidence(appDir);

    let status = "not-started";
    let statusLabel = "Not started";
    if (evidence) {
      const blockers = Array.isArray(evidence.blockers) ? evidence.blockers : [];
      status = blockers.length > 0 ? "blocked" : "complete";
      statusLabel = blockers.length > 0 ? `Warnings (${blockers.length})` : "Complete";
    }

    groupCards.push({
      appDir,
      host,
      candidate,
      evidence,
      status,
      statusLabel,
      views: viewsFor(appDir, host.id),
    });
  }
  groups.push({ candidate, cards: groupCards });
}

/** Flat list, still needed for the built/total count. */
const cards = groups.flatMap((group) => group.cards);

/**
 * Renders tokensUnreachable when non-zero. This is the one metric that no
 * effort closes: there is no hook to attach those tokens to.
 */
function metrics(evidence) {
  const unreachable = evidence?.theming?.tokensUnreachable;
  if (!unreachable) return "";
  return `<p class="ceiling">
        <strong>${esc(unreachable)}</strong> of ${esc(
          evidence.theming?.tokensApplied
            ? unreachable + evidence.theming.tokensApplied
            : 71,
        )} UNDRR tokens unreachable
        <span class="ceiling__note">a ceiling, not a cost: there is no hook to attach them to</span>
      </p>`;
}

/** Renders the worst known issue for a pairing, if any. */
function knownIssueNote(appDir, candidateId) {
  const entry = knownIssues[appDir];
  if (!entry || !entry.headline) return "";
  const { severity, title } = entry.headline;
  const others = entry.total - 1;
  /* Count matches the candidate-level total the link opens. */
  const candidateTotal = candidateCounts[candidateId]?.open ?? entry.total;
  const more = ` <a class="card__issue-more" href="./issues.html#${esc(candidateId)}">${
    candidateTotal > 1 ? `all ${candidateTotal} findings` : "read it in full"
  }</a>`;
  return `<p class="card__issue card__issue--${esc(severity)}">
      <span class="card__issue-badge">${esc(
        severity === "decision" ? "Decision needed" : severity === "blocker" ? "Warning" : "Caveat",
      )}</span>
      ${esc(title)}${more}
    </p>`;
}

/**
 * Badge definitions. `short` is the tooltip; `long` is the glossary entry.
 * Both generated from here so they cannot drift apart.
 */
const BADGE_HELP = {
  leakage: {
    term: "Leakage",
    short:
      "Did the library change how the REST of the page looks, outside its own area? Measured by loading the page twice, with and without the library, and comparing UNDRR's own headings, buttons, tables and cards.",
    long: "A component library changing how the rest of the page looks, outside its own area. If a library restyles UNDRR's own headings and buttons, every page it appears on inherits that. The test loads each page twice, with and without the library, and compares.",
  },
  rtl: {
    term: "RTL",
    short:
      "Does Arabic work in the COMPONENTS, not just the page? A page can flip correctly while a library's own dropdowns, dialogs and date pickers stay left-to-right inside it.",
    long: "Right-to-left. Arabic reads right to left, so the whole interface mirrors. Setting a direction on the page is the easy half; the question is whether the library's own components mirror with it, including the ones the browser moves elsewhere to display.",
  },
  longLabels: {
    term: "Long labels",
    short:
      "UNDRR's real content includes very long strings, and its French and Arabic are longer again. \"Clean\" means nothing overflowed the viewport or was clipped when the fixture text was left untouched.",
    long: "UNDRR's own content is not short, and translation makes it longer: a label that fits in English may not fit in French or Arabic. The fixtures deliberately include long strings, and the check is whether anything overflows the viewport or gets clipped rather than wrapping.",
  },
};

/** Shared aria-describedby targets for badge tooltips (rendered once). */
const badgeHelpHtml = Object.entries(BADGE_HELP)
  .map(
    ([key, help]) =>
      `      <div class="visually-hidden" id="help-${key}">${esc(help.term)}: ${esc(
        help.short,
      )}</div>`,
  )
  .join("\n");

/** Glossary entries for badge terms, generated from the same BADGE_HELP map. */
const badgeGlossaryHtml = Object.values(BADGE_HELP)
  .map(
    (help) =>
      `          <dt>${esc(help.term)}</dt>\n          <dd>${esc(help.long)}</dd>`,
  )
  .join("\n");

/** One badge. tabindex="0" makes the tooltip keyboard-reachable. */
function badge(key, label, ok) {
  const help = BADGE_HELP[key];
  return (
    `<li class="flag flag--${ok ? "ok" : "bad"}" tabindex="0"` +
    ` aria-describedby="help-${key}" data-help="${esc(help.short)}"` +
    ` data-term="${esc(help.term)}">${esc(label)}</li>`
  );
}

/** Renders the leakage and RTL flags, which are the comparison's headline signals. */
function flags(evidence) {
  if (!evidence) return "";
  const items = [];

  if (evidence.leakage) {
    const passed = evidence.leakage.assertionPassed === true;
    items.push(
      badge(
        "leakage",
        `Leakage: ${passed ? "clean" : `${evidence.leakage.differences?.length ?? 0} differences`}`,
        passed,
      ),
    );
  }
  if (evidence.rtl?.status) {
    items.push(badge("rtl", `RTL: ${evidence.rtl.status}`, evidence.rtl.status === "clean"));
  }
  if (evidence.longLabels?.status) {
    items.push(
      badge(
        "longLabels",
        `Long labels: ${evidence.longLabels.status}`,
        evidence.longLabels.status === "clean",
      ),
    );
  }

  return items.length ? `<ul class="flags">${items.join("")}</ul>` : "";
}

/** Per-card list of view links (up to three per pairing). */
function viewLinks(card) {
  if (card.status === "not-started") {
    return `<span class="card__link card__link--disabled">Not yet built</span>`;
  }
  return `<ul class="views">${card.views
    .map((view) =>
      view.built
        ? `<li class="view"><a class="view__link" href="./${esc(card.appDir)}/${esc(
            view.href,
          )}">${esc(view.label)}</a> <span class="view__hint">${esc(view.hint)}</span></li>`
        : /* Unbuilt views shown greyed so incomplete pairings are visible. */
          `<li class="view view--missing"><span class="view__link view__link--missing">${esc(
            view.label,
          )}</span> <span class="view__hint">not built yet</span></li>`,
    )
    .join("")}</ul>`;
}

function cardMarkup(card) {
  return `
      <article class="card card--${esc(card.status)}">
        <header class="card__header">
          <h3 class="card__title">${esc(card.candidate.name)}</h3>
          <p class="card__host">on <strong>${esc(card.host.name)}</strong></p>
        </header>
        <p class="card__status" data-status="${esc(card.status)}">${esc(card.statusLabel)}</p>
        ${flags(card.evidence)}
        ${metrics(card.evidence)}
        ${viewLinks(card)}
      </article>`;
}

/* One row per candidate: a meta column, then its two host cards. */
const cardHtml = groups
  .map((group) => {
    const architecture = ARCHITECTURE_TYPES[group.candidate.id];
    if (!architecture) {
      throw new Error(`No architecture type for candidate ${group.candidate.id}`);
    }
    const worst =
      group.cards.map((card) => knownIssueNote(card.appDir, group.candidate.id)).find(Boolean) ?? "";
    return `
      <section class="pairing" aria-labelledby="pairing-${esc(group.candidate.id)}">
        <div class="pairing__meta">
          <h2 class="pairing__title" id="pairing-${esc(group.candidate.id)}">${esc(
            group.candidate.name,
          )}</h2>
          <p class="pairing__licence">${esc(group.candidate.package)}<br />${esc(
            group.candidate.licence,
          )}</p>
          <p class="architecture-tag">
            <span class="architecture-tag__type">Type ${esc(architecture.id)}</span>
            ${esc(architecture.name)}
          </p>
          <p class="pairing__architecture">${esc(architecture.continuity)}</p>
          <p class="pairing__architecture-link">
            <a href="./architecture-options.html#${esc(architecture.anchor)}">How Type ${esc(
              architecture.id,
            )} works</a>
          </p>
          ${worst}
        </div>
        <div class="pairing__hosts">
${group.cards.map(cardMarkup).join("\n")}
        </div>
      </section>`;
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
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .page { max-width: 76rem; margin: 0 auto; }
      h1, h2, h3 { text-wrap: balance; }
      p, li, dd { text-wrap: pretty; }
      h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
      .subtitle { color: var(--muted); margin: 0 0 0.5rem; max-width: 60ch; }
      /*
       * Pairing groups: one row per candidate, its two hosts side by side.
       *
       * An auto-filling grid over all ten cards wrapped 4/4/2 and put each
       * library's two hosts five cards apart. Two fixed columns keep the
       * comparison a reader actually makes - one library, two hosts - adjacent,
       * and collapse to one column on narrow screens.
       */
      .grid { display: flex; flex-direction: column; gap: 1.5rem; }
      .pairing {
        display: grid;
        gap: 1rem;
        grid-template-columns: minmax(0, 18rem) minmax(0, 3fr);
        align-items: start;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
      }
      .pairing:first-child { padding-top: 0; border-top: 0; }
      /* One column on narrow screens: the meta block stacks above its two hosts. */
      @media (max-width: 60rem) { .pairing { grid-template-columns: minmax(0, 1fr); } }
      .pairing__title { font-size: 1.125rem; margin: 0 0 0.25rem; }
      .pairing__licence { margin: 0 0 0.5rem; font-size: 0.75rem; color: var(--muted); }
      .architecture-tag {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.375rem;
        margin: 0.75rem 0 0.375rem;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .architecture-tag__type {
        display: inline-flex;
        align-items: center;
        min-height: 1.5rem;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        color: var(--accent);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
      }
      .pairing__architecture {
        margin: 0;
        color: var(--muted);
        font-size: 0.75rem;
        line-height: 1.45;
      }
      .pairing__architecture-link { margin: 0.375rem 0 0; font-size: 0.75rem; }
      .pairing__hosts {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
      }
      /* Read in order, all six - so one column at a readable measure, not a grid. */
      .questions { margin: 1rem 0 0; max-width: 78ch; }
      .question { padding: 0.875rem 0; border-top: 1px solid var(--border); }
      .question:first-child { border-top: 0; padding-top: 0.25rem; }
      .question__title {
        font-size: 0.9375rem;
        margin: 0 0 0.375rem;
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem;
      }
      /* The question itself, inside the heading: one line, one thought. */
      .question__asks { font-weight: 400; font-size: 0.8125rem; color: var(--muted); }
      .question__answer { margin: 0 0 0.375rem; font-size: 0.875rem; }
      .question__axis { margin: 0; font-size: 0.75rem; }
      .start__more { margin: 1rem 0 0; font-size: 0.8125rem; max-width: 78ch; }
      .ceiling {
        margin: 0.25rem 0 0;
        font-size: 0.75rem;
        line-height: 1.35;
      }
      .ceiling__note { display: block; color: var(--muted); }
      .view--missing { opacity: 0.6; }
      .view__link--missing { font-weight: 600; text-decoration: line-through; }
      .views { list-style: none; margin: 0.5rem 0 0; padding: 0.625rem 0 0; border-top: 1px solid var(--border); }
      .view + .view { margin-top: 0.375rem; }
      .view__link { font-size: 0.875rem; font-weight: 600; }
      .view__hint { color: var(--muted); font-size: 0.75rem; display: block; }
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
      /*
       * The badges carry an explanation on hover and on focus, so they need to look
       * like they reward attention. A dotted underline is the long-standing
       * convention for "there is a definition behind this" and does not imply a link.
       */
      .flag[data-help] {
        cursor: help;
        text-decoration: underline dotted;
        text-underline-offset: 0.2em;
        text-decoration-color: var(--muted);
      }
      .flag[data-help]:hover, .flag[data-help]:focus-visible {
        background: color-mix(in srgb, var(--border) 30%, transparent);
      }
      .flag[data-help]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

      /* Screen-reader-only: the shared badge descriptions aria-describedby points at. */
      .visually-hidden {
        position: absolute;
        width: 1px; height: 1px;
        margin: -1px; padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }

      /*
       * One tooltip element, moved and filled on demand rather than one per badge.
       * Fixed positioning, because the badges sit inside cards that scroll and clip;
       * an absolutely-positioned tooltip inside a card would be cut off by it.
       */
      #badge-tip {
        position: fixed;
        z-index: 20;
        max-width: 30rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.8125rem;
        line-height: 1.4;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
        pointer-events: none;
        opacity: 0;
        transition: opacity 120ms ease;
      }
      #badge-tip[data-open="true"] { opacity: 1; }
      #badge-tip code { font-size: 0.9em; }
      #badge-tip strong { display: block; margin-bottom: 0.125rem; }
      @media (prefers-reduced-motion: reduce) {
        #badge-tip { transition: none; }
      }
      .card__issue {
        margin: 0.25rem 0 0;
        padding: 0.5rem 0.625rem;
        border-radius: 4px;
        font-size: 0.75rem;
        line-height: 1.35;
        background: color-mix(in srgb, var(--border) 28%, transparent);
        border-inline-start: 3px solid var(--muted);
      }
      .card__issue--blocker { border-inline-start-color: var(--bad); }
      .card__issue--decision { border-inline-start-color: var(--pending); }
      .card__issue-badge {
        display: block;
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
        margin-bottom: 0.125rem;
      }
      /* A link, so it has to look like one. It was inert text before. */
      .card__issue-more { color: var(--accent); white-space: nowrap; }
      .card__link { margin-top: auto; padding-top: 0.75rem; font-size: 0.875rem; color: var(--accent); }
      .card__link--disabled { color: var(--muted); }
      footer { margin-top: 3rem; color: var(--muted); font-size: 0.8125rem; max-width: 70ch; }
      .start {
        margin: 0 0 2.5rem;
        padding: 1.25rem 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        border-inline-start: 4px solid var(--accent);
      }
      .start__title { font-size: 1.125rem; margin: 0 0 0.5rem; }
      .start__lead { margin: 0 0 0.75rem; max-width: 72ch; }
      .start__verdict {
        margin: 0 0 1rem;
        padding: 0.875rem 1rem;
        background: var(--bg);
        border: 1px solid var(--accent);
        border-radius: 6px;
        max-width: 82ch;
      }
      .decision-lenses {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
        margin: 1rem 0 1.25rem;
        max-width: 82ch;
      }
      .decision-lens {
        padding: 0.875rem 1rem;
        border-radius: 6px;
        background: var(--bg);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 80%, transparent),
                    0 1px 3px rgb(0 0 0 / 0.05);
      }
      .decision-lens__eyebrow {
        margin: 0 0 0.25rem;
        color: var(--accent);
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .decision-lens__title { margin: 0 0 0.375rem; font-size: 1rem; }
      .decision-lens__body { margin: 0; color: var(--muted); font-size: 0.8125rem; }
      @media (max-width: 42rem) {
        .decision-lenses { grid-template-columns: minmax(0, 1fr); }
      }
      .glossary { margin: 0 0 2rem; font-size: 0.875rem; }
      .glossary__summary { cursor: pointer; color: var(--accent); font-weight: 600; }
      .glossary__list { margin: 0.875rem 0 0; max-width: 80ch; }
      .glossary__list dt { font-weight: 700; margin-top: 0.75rem; }
      .glossary__list dd { margin: 0.125rem 0 0; color: var(--muted); }
      .start__list { margin: 0; padding-inline-start: 1.125rem; max-width: 78ch; }
      .start__list li + li { margin-top: 0.5rem; }
      .grid-intro { margin: 0 0 1.25rem; max-width: 78ch; }
      .grid-intro__title { margin: 0 0 0.375rem; font-size: 1.25rem; }
      .grid-intro__body { margin: 0; color: var(--muted); font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>${esc(manifest.title)}</h1>
      <p class="subtitle">${esc(manifest.subtitle)}</p>

      <section class="start" aria-labelledby="start-here">
        <h2 class="start__title" id="start-here">Start here</h2>
        <p class="start__lead">
          Whatever replaces PrimeReact becomes the default front-end foundation
          for DELTA, Mangrove properties and future data systems. All five
          candidates meet all 300 requirements, so the requirement matrix does
          not discriminate. The decision therefore has two layers: whether a
          candidate can do the job, and what kind of system it creates across
          the estate.
        </p>

        <p class="start__verdict">
          <strong>If you only read one thing:</strong> the evidence recommends
          a <strong>shared UNDRR component layer on Adobe React Aria</strong>.
          The reuse experiment proves that both React Aria and MUI can package;
          React Aria is preferred because live tokens propagate without rebuilding
          every site and UNDRR remains the visual authority. This is a commitment
          to fund a design system, not a shortcut around one.
          <a href="./architecture-options.html">Architecture, evidence and costs</a>.
        </p>

        <div class="decision-lenses" aria-label="The two decision questions">
          <article class="decision-lens">
            <p class="decision-lens__eyebrow">Question 1 · Capability fit</p>
            <h3 class="decision-lens__title">Can it do the job?</h3>
            <p class="decision-lens__body">
              Requirement coverage, theming, Arabic and RTL, accessibility, and
              clean integration inside each host. The demos and seven evidence
              axes answer this question.
            </p>
          </article>
          <article class="decision-lens">
            <p class="decision-lens__eyebrow">Question 2 · Estate architecture</p>
            <h3 class="decision-lens__title">Will the products stay in sync?</h3>
            <p class="decision-lens__body">
              How DELTA, Mangrove and content products share components and
              policy over time. A clean integration today does not guarantee a
              coherent system tomorrow; Types A, B and C describe that shape,
              not a grade.
            </p>
          </article>
        </div>

        <p class="start__lead">
          <strong>Capability fit is shown three ways.</strong> A component inventory
          proves the parts exist but hides integration defects. Two of the three
          deciding defects are invisible in a component list and only appear
          inside a real UNDRR page. The architecture type beside each candidate
          answers the separate synchronization question.
        </p>

        <div class="questions">
${questionsHtml}
        </div>

        <p class="start__more">
          <a href="./scores.html"><strong>Weighted scores</strong></a>
          — all five ranked, with warnings shown beside the score &middot;
          <a href="./axes.html"><strong>Decision axes</strong></a>
          — what is measured on each &middot;
          <a href="${DOCS_BLOB}/undrr-questions.md">the six questions in full</a>
          &middot;
          <a href="./architecture-options.html"><strong>Architecture
          options</strong></a> — measured reuse, ownership and visual authority &middot;
          <a href="./comparison.html">requirement matrix</a> — the 300 assessments
          (audit trail, not the decision).
        </p>
      </section>

      <details class="glossary">
        <summary class="glossary__summary">Glossary</summary>
        <dl class="glossary__list">
${badgeGlossaryHtml}
          <dt>Kitchen sink / component inventory</dt>
          <dd>One page showing every control. Proves the parts exist.</dd>
          <dt>Embedded island</dt>
          <dd>The library inside a real UNDRR Mangrove page, owning one region.</dd>
          <dt>Portalled overlay</dt>
          <dd>
            A dialog or dropdown the browser moves to the end of the page.
            Automated checks can miss what is inside it.
          </dd>
          <dt>Escape hatch / off the documented route</dt>
          <dd>
            Where the library's theming API did not reach, so styling was applied
            outside it. Each one risks breaking on library updates.
          </dd>
          <dt>axe</dt>
          <dd>
            An automated accessibility scanner. Catches a minority of problems;
            results here are a floor, not a pass.
          </dd>
          <dt>A1 Implementation effort &middot; A2 Maintainability at scale</dt>
          <dd>
            A1: cost to build the first site. A2: cost to keep every site working
            through library updates.
          </dd>
        </dl>
      </details>

      <section class="grid-intro" aria-labelledby="candidate-overview">
        <h2 class="grid-intro__title" id="candidate-overview">Candidate overview</h2>
        <p class="grid-intro__body">
          The left column identifies the estate architecture and its synchronization
          implication. The two host cards show the separate capability question:
          whether that candidate works cleanly in DELTA and Mangrove today.
        </p>
      </section>

      <div class="grid">
${cardHtml}
      </div>

      <footer>
        <p>
          Every demo renders identical fixture data inside a host shell it may
          not modify. Metrics come from each run's <code>evidence.json</code>.
        </p>
        <p>
          Host shells are derived from
          <a href="${esc(manifest.hosts[0].derivedFrom)}">Delta</a> and
          <a href="${esc(manifest.hosts[1].derivedFrom)}">Mangrove</a>, both
          Apache-2.0. See <code>docs/host-derivation.md</code>.
        </p>
      </footer>
    </div>

${badgeHelpHtml}

    <div id="badge-tip" role="tooltip" aria-hidden="true"></div>

    <script>
      /* Badge tooltips. One element moved on hover/focus; Escape dismisses (WCAG 1.4.13). */
      (() => {
        const tip = document.getElementById("badge-tip");
        if (!tip) return;
        let current = null;

        function show(badge) {
          current = badge;
          const term = badge.dataset.term ?? "";
          const help = badge.dataset.help ?? "";
          tip.innerHTML = "";
          if (term) {
            const strong = document.createElement("strong");
            strong.textContent = term;
            tip.append(strong);
          }
          tip.append(document.createTextNode(help));

          // Position above the badge if room, otherwise below.
          tip.dataset.open = "true";
          tip.setAttribute("aria-hidden", "false");
          const anchor = badge.getBoundingClientRect();
          const box = tip.getBoundingClientRect();
          const margin = 8;
          let left = anchor.left + anchor.width / 2 - box.width / 2;
          left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
          const above = anchor.top - box.height - margin;
          const top = above >= margin ? above : anchor.bottom + margin;
          tip.style.left = left + "px";
          tip.style.top = top + "px";
        }

        function hide() {
          current = null;
          tip.dataset.open = "false";
          tip.setAttribute("aria-hidden", "true");
        }

        for (const badge of document.querySelectorAll(".flag[data-help]")) {
          badge.addEventListener("mouseenter", () => show(badge));
          badge.addEventListener("mouseleave", hide);
          badge.addEventListener("focus", () => show(badge));
          badge.addEventListener("blur", hide);
        }

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && current) hide();
        });
        // Dismiss on scroll/resize so the tooltip doesn't float detached.
        window.addEventListener("scroll", () => current && hide(), { passive: true });
        window.addEventListener("resize", () => current && hide());
      })();
    </script>
  </body>
</html>
`;

writeFileSync(OUT, html, "utf8");
process.stdout.write(`wrote ${OUT} (${cards.length} cards, ${built} built)\n`);
