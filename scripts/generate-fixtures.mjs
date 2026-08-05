#!/usr/bin/env node
/**
 * Emits packages/fixtures/src/records.generated.ts.
 *
 * The evaluation requires every demo to render byte-identical content, so the
 * dataset is committed as a typed constant rather than generated at runtime.
 * This script exists so the constant is reproducible and reviewable, not so it
 * can be re-rolled casually: changing the seed invalidates every screenshot
 * already captured against the old data.
 *
 * All figures are synthetic. Per the brief, no real casualty data is used.
 *
 *   node scripts/generate-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "packages", "fixtures", "src", "records.generated.ts");

const SEED = 20260805;
const ROW_COUNT = 250;

/** mulberry32 — small, fast, and deterministic across Node versions. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);
const pick = (xs) => xs[Math.floor(rng() * xs.length)];
const intBetween = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

const COUNTRIES = [
  ["Bangladesh", "BGD"],
  ["Philippines", "PHL"],
  ["Mozambique", "MOZ"],
  ["Peru", "PER"],
  ["Nepal", "NPL"],
  ["Fiji", "FJI"],
  ["Morocco", "MAR"],
  ["Viet Nam", "VNM"],
  ["Guatemala", "GTM"],
  ["Malawi", "MWI"],
  ["Indonesia", "IDN"],
  ["Dominica", "DMA"],
  ["Kyrgyzstan", "KGZ"],
  ["Saint Lucia", "LCA"],
  ["Cabo Verde", "CPV"],
];

const HAZARD_TYPES = [
  "flood",
  "tropical-cyclone",
  "drought",
  "earthquake",
  "landslide",
  "wildfire",
  "heatwave",
  "storm-surge",
];

const VERIFICATION_STATUSES = ["verified", "pending", "disputed", "withdrawn"];

const DATA_SOURCES = [
  "National Disaster Management Authority",
  "Sendai Framework Monitor",
  "DesInventar Sendai",
  "Post-Disaster Needs Assessment",
  "Municipal loss register",
  "Reinsurance industry submission",
];

/** Sentence fragments assembled into the long-string column. */
const NARRATIVE_OPENERS = [
  "Sustained rainfall over the upper catchment produced",
  "A rapid-onset event affecting coastal districts produced",
  "Prolonged below-average precipitation produced",
  "Ground shaking recorded across the provincial capital produced",
  "Slope failure following saturation of the escarpment produced",
];
const NARRATIVE_MIDDLES = [
  "displacement concentrated in low-lying informal settlements,",
  "damage to secondary road links and two district health facilities,",
  "sustained pressure on municipal water distribution,",
  "interruption of the regional electricity interconnector,",
  "loss of standing crops ahead of the main harvest window,",
];
const NARRATIVE_CLOSERS = [
  "with recovery works ongoing at the time of reporting.",
  "pending confirmation from the national statistical office.",
  "subsequently corroborated by satellite-derived extent mapping.",
  "reported through the subnational focal point network.",
  "with figures revised downward after field verification.",
];

const REVIEW_NOTES = [
  "Awaiting source document from national focal point.",
  "Figure supersedes an earlier provisional submission.",
  "Duplicate of a record held under a different event identifier.",
  "Methodology note attached; loss basis differs from regional norm.",
];

/** Formats a Date as an ISO calendar date with no time component. */
const isoDate = (d) => d.toISOString().slice(0, 10);

/** Every timestamp derives from this anchor so output never depends on today. */
const EPOCH_START = Date.UTC(2019, 0, 1);
const EPOCH_END = Date.UTC(2026, 5, 30);

const rows = [];
for (let i = 0; i < ROW_COUNT; i += 1) {
  const [country, iso3] = pick(COUNTRIES);
  const eventMs = EPOCH_START + Math.floor(rng() * (EPOCH_END - EPOCH_START));
  const eventDate = new Date(eventMs);
  // Reported between 1 hour and ~45 days after the event.
  const reportedAt = new Date(eventMs + intBetween(3_600_000, 3_888_000_000));

  const status = pick(VERIFICATION_STATUSES);
  // Nullable column: notes exist only for the records that warranted one.
  const reviewNote = status === "verified" ? null : pick(REVIEW_NOTES);

  rows.push({
    id: `DRR-${String(i + 1).padStart(4, "0")}`,
    country,
    countryIso3: iso3,
    hazardType: pick(HAZARD_TYPES),
    eventDate: isoDate(eventDate),
    reportedAt: reportedAt.toISOString(),
    peopleAffected: intBetween(120, 480_000),
    economicLossUsdMillions: Math.round(rng() * 1850 * 100) / 100,
    dataSource: pick(DATA_SOURCES),
    verificationStatus: status,
    narrative: `${pick(NARRATIVE_OPENERS)} ${pick(NARRATIVE_MIDDLES)} ${pick(NARRATIVE_CLOSERS)}`,
    reviewNote,
  });
}

const banner = `// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Produced by scripts/generate-fixtures.mjs with seed ${SEED}.
// Regenerate with: pnpm fixtures:generate
//
// Regenerating changes the data every demo renders and invalidates every
// screenshot already captured. Do not regenerate during an evaluation round.
//
// All values are synthetic. No real casualty data is used.

import type { LossRecord } from "./types.js";

export const LOSS_RECORDS: readonly LossRecord[] = Object.freeze(`;

const body = JSON.stringify(rows, null, 2)
  .split("\n")
  .map((line) => (line.length > 0 ? `  ${line}` : line))
  .join("\n");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${banner}${body.trimStart()} as LossRecord[]);\n`, "utf8");

process.stdout.write(`wrote ${OUT} (${rows.length} rows, seed ${SEED})\n`);
