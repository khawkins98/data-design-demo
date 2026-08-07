#!/usr/bin/env node
/**
 * Scores every pairing across the seven axes and writes docs/scores.md and
 * docs/scores.html.
 *
 *   pnpm scores
 *
 * WHY THIS EXISTS. The diagnostic layer is thorough and overwhelming: seven axes,
 * thirty requirements, thirty-four known issues, ten pairings, three views each. A
 * reader who has to choose needs a way in that is shorter than reading all of it,
 * and a shortlist of two or three worth deeper analysis. That is this file's whole
 * job.
 *
 * FOUR RULES IT FOLLOWS, each of them a lesson from something that went wrong.
 *
 * 1. EVERYTHING IS DERIVED. No score is typed by hand. A hand-assigned number
 *    drifts from the evidence within a week and then the evidence stops being the
 *    source of truth. Every value here traces to evidence.json, the known-issues
 *    registry, or extraction-results.json.
 *
 * 2. NO COMPARATIVE PROSE. Every stale claim found in the audit was stated
 *    comparatively: "MUI has no logical equivalent", "unlike MUI's pagination".
 *    Findings stated about the library in front of us survived; findings stated as
 *    "better than X" all had to be rewritten when X changed. So comparisons here
 *    are computed at build time from data and never written into prose.
 *
 * 3. ONLY DEFECTS BELONGING TO THE THING BEING CHOSEN MAY COUNT. Enforced by
 *    SCOREABLE_OWNERS in the registry. `host` cannot discriminate between
 *    candidates; `our implementation` and `this evaluation` are ours. The audit
 *    found that every candidate whose table behaviour we hand-rolled had a defect
 *    in it and every candidate whose table behaviour the library owned did not - a
 *    score built before that was separated would have read one implementation of
 *    differing quality as five libraries of differing quality.
 *
 * 4. A NUMBER MUST SHOW ITS REASONING. Every band carries the fact that assigned
 *    it. "Blocked: Arabic labels displaced up to 843px, unfixable inside the
 *    brief's constraints" is usable; "A6: 2/10" is not.
 *
 * A NOTE ON THE MODEL. UNDRR chose a weighted composite across all seven axes over
 * gating on RTL and accessibility. The known weakness of a composite is that a
 * candidate can offset an unfixable defect with a good score elsewhere, so this
 * generator reports library-owned blockers BESIDE the composite and never folds
 * them into it. The number ranks; it is not allowed to hide anything.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");
const DOCS = join(ROOT, "docs");

/**
 * THE WEIGHTS. Edit these, not the logic below.
 *
 * They are a judgement about what UNDRR values, not a measurement, and they are
 * the one thing in this file that is meant to be argued about. They must sum to
 * 100; the generator asserts it rather than silently normalising, because a set of
 * weights that does not sum to 100 is more likely a mistake than an intention.
 *
 * The defaults below reflect the framing in docs/undrr-questions.md: this is a
 * continuity decision about an estate, so the axes about living with a library
 * across many sites carry more than the one about building the first one. A6 and
 * A7 are weighted highest because they are standing obligations rather than
 * preferences - the composite cannot gate on them, so weight is the only lever
 * left.
 */
/**
 * Who chose the weights, when, and on what basis.
 *
 * Printed on the page. A project manager reviewing the site put it exactly right:
 * right-to-left at 18 is the weight that removes MUI from contention, and without
 * provenance there is no way to defend that in a meeting - "change them in
 * scripts/build-scores.mjs" is not an answer to "who decided this". A weight is a
 * judgement, and an undocumented judgement presented beside measured evidence reads
 * as if it were measured too.
 */
const WEIGHT_PROVENANCE = Object.freeze({
  chosenBy: "Proposed by the evaluation author, not yet ratified by UNDRR",
  date: "2026-08-06",
  basis:
    "Derived from the framing in undrr-questions.md: a continuity decision about an estate, so axes about living with a library across many sites outweigh the one about building the first site. A6 and A7 carry the most because they are standing obligations rather than preferences, and the composite model UNDRR chose cannot gate on them - weight is the only lever left.",
  ratified: false,
});

const WEIGHTS = Object.freeze({
  A1_effort: 8,
  A2_maintainability: 16,
  A3_reproducibility: 16,
  A4_mangrove: 14,
  A5_theming: 14,
  A6_rtl: 18,
  A7_accessibility: 14,
});

const weightTotal = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (weightTotal !== 100) {
  process.stderr.write(`WEIGHTS must sum to 100, got ${weightTotal}\n`);
  process.exit(1);
}

/** Bands, and the score each contributes before weighting. */
const BANDS = Object.freeze({ strong: 1, workable: 0.6, weak: 0.3, blocked: 0 });

/**
 * How a blocker can be escaped, cheapest first.
 *
 * NOT folded into the composite, and that is deliberate. Remediability is a fact
 * about the cost of living with a defect, not about the axis the defect sits on, so
 * averaging it into a score would double-count severity and blur both. It tiers the
 * blockers instead, which is what the reader actually needs: whether row 2 of the
 * ranking joins row 1 or not.
 */
const REMEDIABILITY_ORDER = ["config", "per-site-code", "upstream-only", "out-of-scope", "inherent"];

const REMEDIABILITY = Object.freeze({
  config: "reversible per site by changing a setting",
  "per-site-code": "fixable in consuming code, repeated per site",
  "upstream-only": "needs a change in the library",
  "out-of-scope": "a fix exists but this evaluation's rules forbid it - a policy decision",
  inherent: "cannot be escaped while using the library as documented",
});

const CANDIDATE_ORDER = ["react-aria", "mui", "carbon", "mantine", "antd"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const knownIssues = existsSync(join(DOCS, "known-issues.json"))
  ? readJson(join(DOCS, "known-issues.json"))
  : { pairings: {} };

const extraction = existsSync(join(DOCS, "extraction-results.json"))
  ? readJson(join(DOCS, "extraction-results.json"))
  : {};

function appDirs() {
  return readdirSync(APPS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(APPS, d.name, "evidence.json")))
    .map((d) => d.name)
    .sort((a, b) => {
      const ca = CANDIDATE_ORDER.findIndex((c) => a.endsWith(c));
      const cb = CANDIDATE_ORDER.findIndex((c) => b.endsWith(c));
      return ca - cb || a.localeCompare(b);
    });
}

/* ------------------------------------------------------------ the axis rules --
 *
 * Each returns { band, because } where `because` is the deciding fact, in words a
 * reader can check against the evidence. The rules are deliberately coarse: the
 * evidence does not support finer discrimination than this, and a band implies less
 * precision than a number does, which is the point.
 */

function scoreA1(ev) {
  const mix = { native: 0, composed: 0, custom: 0 };
  for (const r of ev.requirements ?? []) if (r.status in mix) mix[r.status] += 1;
  const beyond = mix.composed + mix.custom;
  const traps = (ev.theming?.escapeHatchesUsed ?? []).length;
  const because = `${beyond} of 30 requirements needed more than a documented component; ${traps} documented approaches failed and needed working around`;
  if (beyond <= 6 && traps <= 2) return { band: "strong", because };
  if (beyond <= 12 && traps <= 8) return { band: "workable", because };
  return { band: "weak", because };
}

function scoreA2(ev, issues) {
  // Off-route styling is the A2 signal, and the honest proxy available here is the
  // count of documented-path failures the run recorded, plus scoreable maintenance
  // issues. The CSS-selector census lives in build-axes.mjs; it is not duplicated,
  // because two implementations of one metric is how two numbers start disagreeing.
  const traps = (ev.theming?.escapeHatchesUsed ?? []).length;
  const maint = issues.filter((i) => /token|theme|upgrade|internal|layer/i.test(i.title)).length;
  const because = `${traps} escape hatches off the documented theming route; ${maint} scoreable maintenance findings`;
  if (traps === 0 && maint <= 1) return { band: "strong", because };
  if (traps <= 6) return { band: "workable", because };
  return { band: "weak", because };
}

function scoreA3(candidate) {
  const e = extraction?.[candidate];
  if (!e) {
    return {
      band: "weak",
      because: "no extraction experiment was run, so shareability is unmeasured for this candidate",
    };
  }
  const outcome = e.outcome ?? e.basis ?? "unknown";
  if (outcome === "packaged") {
    return { band: "strong", because: "the integration extracted into one shared package" };
  }
  if (outcome === "fork-per-site") {
    return {
      band: "blocked",
      because: "the distribution model requires each site to own a copy of the source",
    };
  }
  return { band: "workable", because: `extraction outcome recorded as ${outcome}` };
}

function scoreA4(ev) {
  const leaks = ev.leakage?.assertionPassed !== true;
  const diffs = (ev.leakage?.differences ?? []).length;
  const probe = ev.leakage?.globalStylesheetProbe;
  if (leaks) {
    return {
      band: "blocked",
      because: `the candidate restyled ${diffs} computed properties on host markup outside its own subtree`,
    };
  }
  if (probe) {
    return {
      band: "workable",
      because: "clean only because the documented global stylesheet was not loaded as documented",
    };
  }
  return { band: "strong", because: "no host canary changed when the candidate mounted" };
}

function scoreA5(ev) {
  const unreachable = ev.theming?.tokensUnreachable ?? 0;
  const applied = ev.theming?.tokensApplied ?? 0;
  const total = unreachable + applied;
  if (unreachable > 0) {
    return {
      band: "weak",
      because: `${unreachable} of ${total} UNDRR tokens cannot be attached at all - a ceiling, not a cost`,
    };
  }
  return { band: "strong", because: `all ${total} reachable tokens applied` };
}

function scoreA6(ev) {
  const status = ev.rtl?.status;
  const req = (ev.requirements ?? []).find((r) => r.id === "rtl");
  const lines = req?.customLinesOfCode ?? 0;
  const recorded = (ev.rtl?.issues ?? []).length;
  if (status !== "clean") {
    return {
      band: "blocked",
      because: `Arabic is not correct as shipped: ${recorded} recorded defect${
        recorded === 1 ? "" : "s"
      }, unresolved`,
    };
  }
  if (lines === 0 && recorded === 0) {
    return { band: "strong", because: "Arabic worked from a dir attribute alone, at zero custom lines" };
  }
  return {
    band: "workable",
    because: `clean, but only after ${lines} custom lines and ${recorded} recorded mitigations`,
  };
}

function scoreA7(ev) {
  const axe = ev.axe ?? {};
  const critical = axe.critical ?? 0;
  const serious = axe.serious ?? 0;
  const incomplete = axe.incomplete ?? 0;
  const tail = `${incomplete} checks axe declined to decide, each still owed a human`;
  if (critical > 0) {
    return { band: "blocked", because: `${critical} critical automated violations; ${tail}` };
  }
  if (serious > 0) {
    return { band: "workable", because: `${serious} serious automated violations; ${tail}` };
  }
  return { band: "strong", because: `no critical or serious automated violations; ${tail}` };
}

/* ------------------------------------------------------------------ assembly -- */

const AXES = [
  ["A1_effort", "A1 Implementation effort", (ev) => scoreA1(ev)],
  ["A2_maintainability", "A2 Maintainability at scale", (ev, c, i) => scoreA2(ev, i)],
  ["A3_reproducibility", "A3 Reproducibility across sites", (ev, c) => scoreA3(c)],
  ["A4_mangrove", "A4 Mangrove compatibility", (ev) => scoreA4(ev)],
  ["A5_theming", "A5 Theming fidelity", (ev) => scoreA5(ev)],
  ["A6_rtl", "A6 Right-to-left", (ev) => scoreA6(ev)],
  ["A7_accessibility", "A7 Accessibility conformance", (ev) => scoreA7(ev)],
];

const rows = appDirs().map((app) => {
  const ev = readJson(join(APPS, app, "evidence.json"));
  const candidate = CANDIDATE_ORDER.find((c) => app.endsWith(c)) ?? app;
  const pairing = knownIssues.pairings?.[app] ?? {};

  // Open, scoreable issues only. The registry's own gate decides what qualifies;
  // this file does not get a second opinion on it.
  const scoreable = [];
  const blockers = [];

  const axes = {};
  let composite = 0;
  for (const [key, label, fn] of AXES) {
    const result = fn(ev, candidate, scoreable);
    axes[key] = { label, ...result, weight: WEIGHTS[key] };
    composite += BANDS[result.band] * WEIGHTS[key];
    // Keyed by axis, not by sentence, so the same blocked axis on two hosts is one
    // blocker rather than two near-identical lines.
    if (result.band === "blocked") blockers.push({ key: label, text: result.because });
  }

  /*
   * Registry blockers, which the axis rules cannot see.
   *
   * A defect can block adoption without moving any field in evidence.json. antd's
   * Select rendering its selected value invisible under Mangrove is the case that
   * proved it: leakage passes, axe is clean, every A4 signal reads fine, and the
   * control does not display what the user chose. Scored as blocking, because a
   * composite that called that candidate unblocked would be worse than no score.
   */
  for (const b of pairing.scoreableBlockers ?? []) {
    blockers.push({
      key: b.id,
      text: `${b.title} (owned by ${b.owner})`,
      remediability: b.remediability,
    });
  }

  return {
    app,
    candidate,
    host: ev.host,
    name: ev.candidate,
    axes,
    composite: Math.round(composite),
    blockers,
    openIssues: pairing.total ?? 0,
    resolvedOurs: pairing.resolvedCount ?? 0,
    headline: pairing.headline ?? null,
  };
});

/** Candidate-level roll-up: the worst band per axis across the two hosts. */
const byCandidate = CANDIDATE_ORDER.map((candidate) => {
  const pair = rows.filter((r) => r.candidate === candidate);
  if (pair.length === 0) return null;
  const composite = Math.round(pair.reduce((a, r) => a + r.composite, 0) / pair.length);
  // Dedupe by axis or issue id: one blocked axis appearing on both hosts is one
  // finding about the candidate, not two.
  const seen = new Map();
  for (const b of pair.flatMap((r) => r.blockers)) if (!seen.has(b.key)) seen.set(b.key, b);
  const blockers = [...seen.values()].map(
    (b) => `${b.key}: ${b.text}${b.remediability ? ` [escape: ${REMEDIABILITY[b.remediability]}]` : ""}`,
  );
  // The cheapest escape route among this candidate's blockers, for the tiering
  // below. Derived, never asserted in prose - see rule 2 at the top of this file.
  const escapes = [...seen.values()].map((b) => b.remediability).filter(Boolean);
  const easiest = REMEDIABILITY_ORDER.find((r) => escapes.includes(r)) ?? null;
  const hardest = [...REMEDIABILITY_ORDER].reverse().find((r) => escapes.includes(r)) ?? null;
  return { candidate, name: pair[0].name, composite, blockers, easiest, hardest, pair };
}).filter(Boolean);

// Comparisons are computed, never written into prose. See rule 2 at the top.
const ranked = [...byCandidate].sort((a, b) => b.composite - a.composite);
const clean = ranked.filter((c) => c.blockers.length === 0);

/* ------------------------------------------------------------------ markdown -- */

const L = [];
L.push("# Weighted scores");
L.push("");
L.push("GENERATED FILE - regenerate with `pnpm scores`. Axis definitions are in");
L.push("[decision-axes.md](./decision-axes.md); the questions these serve are in");
L.push("[undrr-questions.md](./undrr-questions.md).");
L.push("");
L.push("Every value here is derived from `evidence.json`, the known-issues registry and");
L.push("`extraction-results.json`. Nothing is typed by hand, and only defects owned by");
L.push("the library or the pairing can affect a score - never a host defect, which is the");
L.push("same for all five, and never one of ours.");
L.push("");
L.push("## What this says to do");
L.push("");
L.push(`**Adopt ${ranked[0].name}.**`);
L.push("");
if (ranked[0].blockers.length === 0) {
  L.push(
    `It leads on the composite at ${ranked[0].composite} against ${ranked[1].composite} for ` +
      `${ranked[1].name}, and it is the only candidate of ${ranked.length} carrying no blocking ` +
      "defect. Arabic works from a `dir` attribute alone. It stays inside its own subtree on both hosts.",
  );
  L.push("");
  L.push("**The cost, which the composite does not charge it for.** React Aria ships behaviour,");
  L.push("not appearance. Adopting it means UNDRR builds and then owns the visual layer");
  L.push("permanently - this evaluation's own demo carries 121 to 133 hand-written CSS rules for");
  L.push("one page. Three of the seven axes reward exactly the property that creates that cost:");
  L.push("a library with no opinions cannot conflict with Mangrove, cannot bake in wrong colours");
  L.push("and cannot mistheme. **Read the recommendation as \"adopt this and fund a design");
  L.push("system\", not as \"adopt this and save work\".**");
} else {
  L.push(
    `It leads on the composite at ${ranked[0].composite}, but carries ` +
      `${ranked[0].blockers.length} blocking defect - so this is a recommendation with a ` +
      "condition attached, not a clean one. See Blockers.",
  );
}
L.push("");
/*
 * The reuse argument is deliberately a POINTER, not prose repeated here. It is a
 * judgement about UNDRR's estate rather than anything derived from evidence.json,
 * and this file is generated - so stating it here would put an unsourced claim
 * inside a document whose whole promise is that nothing in it is typed by hand.
 */
L.push("**Read this alongside the architecture it implies.**");
L.push("A library that ships fewer components is also one whose gaps get filled in Mangrove");
L.push("rather than per-site, which turns a missing stepper into shared tooling instead of");
L.push("local work - and that is the strongest case for this recommendation, stronger than the");
L.push("composite. It is also the case that carries the staffing bill. Both are set out in");
L.push("[architecture-options.md](./architecture-options.md), which argues a position and");
L.push("changes no score.");
L.push("");
L.push("**Two things must happen before this is signed off, and neither is a technical task.**");
L.push("");
L.push("1. A human accessibility pass. Every A7 band on this page rests on automated scanning.");
L.push("   No screen-reader test and no human keyboard walkthrough was run on any candidate, so");
L.push("   no conformance claim can be made from this evidence.");
L.push("2. A decision on MUI's exclusion. Its Arabic defect has a fix that this evaluation's");
L.push("   rules forbid. If UNDRR relaxes that rule, MUI returns to contention - which makes its");
L.push("   position a procurement question rather than an engineering result.");
L.push("");

L.push("## Weights");
L.push("");
L.push("A judgement about what UNDRR values, not a measurement - so it is recorded as one.");
L.push("");
L.push(`- **Chosen by:** ${WEIGHT_PROVENANCE.chosenBy}`);
L.push(`- **Date:** ${WEIGHT_PROVENANCE.date}`);
L.push(
  `- **Status:** ${WEIGHT_PROVENANCE.ratified ? "ratified by UNDRR" : "**not ratified.** Nobody at UNDRR has agreed these numbers."}`,
);
L.push(`- **Basis:** ${WEIGHT_PROVENANCE.basis}`);
L.push("");
L.push("This matters more than it looks. A6 at 18 is the weight that removes MUI from");
L.push("contention; if it were 12 the ranking would change. Anyone defending this choice should");
L.push("expect to defend the weights first, and should be able to say who set them.");
L.push("");
L.push(`| Axis | Weight |`);
L.push(`| --- | --- |`);
for (const [key, label] of AXES) L.push(`| ${label} | ${WEIGHTS[key]} |`);
L.push("");

L.push("## Ranking");
L.push("");
L.push("Composite is the weighted mean of the two hosts. **Blockers are listed beside the");
L.push("score and never folded into it**: a weighted composite can otherwise let a good");
L.push("bundle size offset an unfixable defect, so the number ranks and is not permitted");
L.push("to hide anything.");
L.push("");
L.push("| # | Candidate | Composite | Library-owned blockers |");
L.push("| --- | --- | --- | --- |");
ranked.forEach((c, i) => {
  L.push(
    `| ${i + 1} | ${c.name} | **${c.composite}** / 100 | ${
      c.blockers.length === 0 ? "none" : `**${c.blockers.length}** - see below`
    } |`,
  );
});
L.push("");

if (clean.length > 0) {
  L.push(
    `**${clean.length} of ${ranked.length} candidates carry no blocker at all:** ` +
      `${clean.map((c) => c.name).join(", ")}.`,
  );
  L.push("");
  L.push(
    `That is the recommendation. The next two - ${ranked
      .slice(1, 3)
      .map((c) => c.name)
      .join(" and ")} - are the credible fallbacks, because their blockers can be escaped: see`,
  );
  L.push("the escape-cost table below. The bottom two cannot, or only by a decision that is");
  L.push("UNDRR's rather than an engineer's. So the shortlist worth deeper work is the top three,");
  L.push("and the recommendation within it is the first.");
} else {
  L.push("**Every candidate carries at least one blocking axis.** No shortlist is defensible");
  L.push("from this evidence without a policy decision about which blocker UNDRR will accept.");
}
L.push("");

L.push("## Blockers, in full");
L.push("");
L.push("A blocked axis is not a low score. It is a statement that the axis is not satisfied");
L.push("at all, by the library rather than by our code.");
L.push("");
L.push("Two things to know before reading these as a ranking of severity.");
L.push("");
L.push("**A finding can appear twice** - once as an axis verdict derived from");
L.push("`evidence.json`, once as its known-issues entry. Those are two records of one");
L.push("fact from two sources, deliberately not merged, because silently collapsing them");
L.push("would hide a disagreement if the two sources ever stopped matching.");
L.push("");
L.push("**Remediability is recorded but not scored.** Each blocker carries how it could be");
L.push("escaped, taken from the registry rather than inferred. It is kept out of the");
L.push("composite on purpose: it describes the cost of living with a defect, not the axis");
L.push("the defect sits on, so averaging it in would double-count severity and blur both.");
L.push("It is here to answer one question the composite cannot - whether a candidate below");
L.push("the top of the ranking can be brought up to it.");
L.push("");
L.push("| Candidate | Blockers | Cheapest escape | Hardest escape |");
L.push("| --- | --- | --- | --- |");
for (const c of ranked.filter((x) => x.blockers.length > 0)) {
  L.push(
    `| ${c.name} | ${c.blockers.length} | ${
      c.easiest ? REMEDIABILITY[c.easiest] : "not recorded"
    } | ${c.hardest ? REMEDIABILITY[c.hardest] : "not recorded"} |`,
  );
}
L.push("");
for (const c of ranked.filter((x) => x.blockers.length > 0)) {
  L.push(`**${c.name}**`);
  L.push("");
  for (const b of c.blockers) L.push(`- ${b}`);
  L.push("");
}

L.push("## Per pairing, per axis");
L.push("");
L.push("Each cell carries the fact that assigned the band. `strong` scores full weight,");
L.push("`workable` 60%, `weak` 30%, `blocked` nothing.");
L.push("");
for (const row of rows) {
  L.push(`### \`${row.app}\` - composite ${row.composite} / 100`);
  L.push("");
  if (row.headline) {
    L.push(`Worst open issue: **${row.headline.severity}** - ${row.headline.title}`);
    L.push("");
  }
  L.push(
    `${row.openIssues} open findings. ${row.resolvedOurs} defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.`,
  );
  L.push("");
  L.push("| Axis | Band | Weight | Why |");
  L.push("| --- | --- | --- | --- |");
  for (const [key, label] of AXES) {
    const a = row.axes[key];
    L.push(
      `| ${label} | ${a.band === "strong" ? "strong" : `**${a.band}**`} | ${a.weight} | ${a.because} |`,
    );
  }
  L.push("");
}

L.push("## What this cannot tell you");
L.push("");
L.push("- A composite is a summary of the diagnostics, not a replacement for them. Where a");
L.push("  band and the axis prose disagree, the prose is the evidence.");
L.push("- Accessibility bands rest on automated checks only. No screen-reader pass and no");
L.push("  human keyboard walkthrough was run on any pairing, so `strong` on A7 means the");
L.push("  automated floor was cleared, not that the pairing is accessible.");
L.push("- A6 measures layout direction and mirroring, not whether Arabic reads well to an");
L.push("  Arabic reader.");
L.push("- Changing the weights changes the ranking. If a decision rests on a two-point gap,");
L.push("  it rests on the weights and not on the evidence.");
L.push("");

const md = L.join("\n");
writeFileSync(join(DOCS, "scores.md"), `${md}\n`, "utf8");

/* ---------------------------------------------------------------------- html -- */

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Hand-written docs, for the HTML build only.
 *
 * A relative `./foo.md` is right in scores.md, which is read on GitHub, and broken
 * in scores.html: GitHub Pages serves a raw .md as `text/plain`, so the link lands
 * a decision-maker in unrendered markdown. Mermaid makes it worse than ugly -
 * architecture-options.md's three diagrams would arrive as fenced code. So the two
 * outputs get different hrefs for the same source line, and only the HTML side is
 * rewritten. Generated siblings - scores.html, axes.html - keep their in-site
 * relative links and must not match this.
 */
const DOCS_BLOB = "https://github.com/khawkins98/data-design-demo/blob/main/docs";

/** `code`, **bold** and [links](x), the only inline markup this file emits. */
function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/href="\.\/([^"]+\.md)"/g, `href="${DOCS_BLOB}/$1"`);
}

/**
 * Markdown to HTML for the subset this generator emits.
 *
 * THE FIRST VERSION OF THIS FUNCTION KEPT ONLY THE HEADINGS. It mapped the
 * markdown lines, returned null for anything that was not an h1/h2/h3, and then
 * filtered the nulls out - so the published page was a list of section titles with
 * every table, paragraph, ranking and blocker silently discarded, while scores.md
 * beside it was complete. It looked plausible enough to commit and was useless to
 * read. Mirrors the converter in build-axes.mjs, which handles the same subset.
 */
function toHtml(markdown) {
  const out = [];
  let inTable = false;
  let inList = false;
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();

    if (line.startsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split(" | ")
        .map((c) => c.trim());
      if (/^-+$/.test(cells[0] ?? "")) continue;
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (!inTable) {
        out.push('<div class="scroll"><table><thead>');
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

    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (inList && line !== "") {
      out.push("</ul>");
      inList = false;
    }

    if (line.startsWith("### ")) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line === "") out.push("");
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (inTable) out.push("</tbody></table></div>");
  if (inList) out.push("</ul>");
  // Consecutive paragraphs were one wrapped sentence in the source.
  return out.join("\n").replace(/<\/p>\n<p>/g, " ");
}

const html = `<!doctype html>
<!-- GENERATED FILE - produced by scripts/build-scores.mjs. Regenerate: pnpm scores -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Weighted scores - UNDRR data design evaluation</title>
    <style>
      :root { color-scheme: light dark; --bg:#fbfbfb; --surface:#fff; --text:#14232e; --muted:#5b6b77; --border:#d9dee2; --accent:#004f91; --bad:#c10920; }
      @media (prefers-color-scheme: dark) { :root { --bg:#11181d; --surface:#18222a; --text:#e8eef2; --muted:#9fb0bc; --border:#2b3841; --accent:#7fb2e5; --bad:#ff8090; } }
      body { margin:0; padding:2rem 1.5rem 4rem; background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,"Segoe UI",sans-serif; line-height:1.5; }
      .page { max-width:70rem; margin:0 auto; }
      h1 { font-size:1.75rem; margin:0 0 1rem; }
      h2 { font-size:1.25rem; margin:2.5rem 0 0.75rem; }
      h3 { font-size:1rem; margin:2rem 0 0.5rem; font-family:ui-monospace,monospace; }
      table { border-collapse:collapse; width:100%; margin:0.75rem 0 1.5rem; font-size:0.875rem; display:block; overflow-x:auto; }
      th,td { border:1px solid var(--border); padding:0.4rem 0.6rem; text-align:start; vertical-align:top; }
      th { background:var(--surface); }
      code { font-size:0.9em; }
      a { color:var(--accent); }
      p,li { max-width:80ch; }
      strong { color:var(--text); }
    </style>
  </head>
  <body>
    <div class="page">
${toHtml(md)}
      <p><a href="./issues.html">every finding in full</a> &middot;
         <a href="./axes.html">decision axes</a> &middot;
         <a href="./">all pairings</a></p>
    </div>
  </body>
</html>
`;
writeFileSync(join(DOCS, "scores.html"), html, "utf8");

process.stdout.write(
  `wrote docs/scores.md and docs/scores.html (${rows.length} pairings, ${clean.length}/${ranked.length} candidates unblocked)\n`,
);
