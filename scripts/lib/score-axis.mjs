/**
 * Axis-scoring functions shared by build-scores.mjs and build-axes.mjs.
 * Each returns { band, because }.
 */

/** Bands, and the score each contributes before weighting. */
export const BANDS = Object.freeze({ strong: 1, workable: 0.6, weak: 0.3, blocked: 0 });

function auditedOverrideCount(ev, effort) {
  if (!effort) throw new Error("missing audited effort classification");
  const categories = ["offRouteOverrides", "integrationWork", "designDecisions", "notUsed"];
  const indexes = categories.flatMap((key) => effort[key] ?? []);
  const noteCount = (ev.theming?.escapeHatchesUsed ?? []).length;
  if (
    indexes.length !== noteCount ||
    new Set(indexes).size !== noteCount ||
    indexes.some((index) => !Number.isInteger(index) || index < 1 || index > noteCount)
  ) {
    throw new Error("effort classification must cover every integration note exactly once");
  }
  return effort.offRouteOverrides.length;
}

export function scoreA1(ev, effort) {
  const mix = { native: 0, composed: 0, custom: 0 };
  for (const r of ev.requirements ?? []) if (r.status in mix) mix[r.status] += 1;
  const beyond = mix.composed + mix.custom;
  const traps = auditedOverrideCount(ev, effort);
  const because = `${beyond} of 30 requirements needed composition or custom code; ${traps} audited off-route overrides`;
  if (beyond <= 6 && traps <= 2) return { band: "strong", because };
  if (beyond <= 12 && traps <= 8) return { band: "workable", because };
  return { band: "weak", because };
}

export function scoreA2(candidate, changeAmplification) {
  const evidence = changeAmplification?.candidates?.[candidate];
  const siteCount = changeAmplification?.scenario?.siteCount ?? 6;
  if (!evidence?.scenarios) {
    return {
      band: "weak",
      because: `no ${siteCount}-site change-amplification scenario is recorded`,
    };
  }

  const requiredScenarios = ["token", "interactionPolicy", "upstreamUpgrade"];
  const scenarios = requiredScenarios.map((key) => {
    const scenario = evidence.scenarios[key];
    if (!scenario) throw new Error(`A2 change-amplification evidence for ${candidate} is missing ${key}`);
    for (const field of ["authoritativeLocations", "siteRebuilds", "validationSurfaces", "ownershipBoundaries"]) {
      if (!Number.isInteger(scenario[field]) || scenario[field] < 0) {
        throw new Error(`A2 ${candidate}.${key}.${field} must be a non-negative integer`);
      }
    }
    if (
      scenario.consumerSourceEdits !== null &&
      (!Number.isInteger(scenario.consumerSourceEdits) || scenario.consumerSourceEdits < 0)
    ) {
      throw new Error(`A2 ${candidate}.${key}.consumerSourceEdits must be null or a non-negative integer`);
    }
    if (scenario.siteRebuilds > siteCount) {
      throw new Error(`A2 ${candidate}.${key}.siteRebuilds exceeds the ${siteCount}-site scenario`);
    }
    return scenario;
  });
  const maxLocations = Math.max(...scenarios.map((s) => s.authoritativeLocations));
  const maxOwners = Math.max(...scenarios.map((s) => s.ownershipBoundaries));
  const sourceEdits = scenarios.map((s) => s.consumerSourceEdits);
  const unknownEdits = sourceEdits.some((value) => value === null);
  const repeatedEdits = sourceEdits.some((value) => typeof value === "number" && value > 0);
  const editSummary = repeatedEdits
    ? "consumer source edits repeat across sites"
    : unknownEdits
      ? "consumer source-edit fan-out is unmeasured"
      : "0 consumer source edits";
  const because = `${maxLocations} authoritative change location${maxLocations === 1 ? "" : "s"} at worst across ${siteCount} sites; ${editSummary}; ${evidence.basis}`;

  if (repeatedEdits || maxLocations >= 3) return { band: "weak", because };
  if (maxLocations === 1 && maxOwners === 1 && !unknownEdits && evidence.mechanismMeasured) {
    return { band: "strong", because };
  }
  return { band: "workable", because };
}

export function scoreA3(candidate, extraction) {
  const e = extraction?.[candidate];
  if (!e) {
    return {
      band: "weak",
      because: "no extraction experiment was run, so shareability is unmeasured for this candidate",
    };
  }
  // `basis` says whether the result was measured or analysed; `verdict` says
  // what the experiment found. Scoring the basis made every measured package
  // merely "workable", even when two hosts actually consumed it successfully.
  const outcome = e.verdict ?? e.outcome ?? e.basis ?? "unknown";
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

export function scoreA4(ev) {
  const leaks = ev.leakage?.assertionPassed !== true;
  const diffs = ev.leakage?.differenceCount ?? (ev.leakage?.differences ?? []).length;
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

export function scoreA5(ev, candidate, themingControl) {
  const unreachable = ev.theming?.tokensUnreachable ?? 0;
  const applied = ev.theming?.tokensApplied ?? 0;
  const total = unreachable + applied;
  if (unreachable > 0) {
    return {
      band: "weak",
      because: `${unreachable} of ${total} UNDRR tokens cannot be attached at all - a ceiling, not a cost`,
    };
  }
  const control = themingControl?.candidates?.[candidate];
  if (!control) {
    return { band: "weak", because: `all ${total} reachable tokens applied, but visual authority was not assessed` };
  }
  const because = `all ${total} reachable tokens applied; visual authority across hosts: ${control.authorityAcrossHosts}; ${control.manualCorrections} manual alias corrections`;
  if (control.authorityAcrossHosts === "yes" && control.manualCorrections <= 2) {
    return { band: "strong", because };
  }
  return { band: "workable", because };
}

export function scoreA6(ev) {
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

export function scoreA7(ev) {
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

export const AXIS_DEFS = [
  ["A1_effort", "A1 Implementation effort", scoreA1],
  ["A2_maintainability", "A2 Estate change amplification", scoreA2],
  ["A3_reproducibility", "A3 New-product reproducibility", scoreA3],
  ["A4_mangrove", "A4 Mangrove compatibility", scoreA4],
  ["A5_theming", "A5 Visual control and theming fidelity", scoreA5],
  ["A6_rtl", "A6 Right-to-left", scoreA6],
  ["A7_accessibility", "A7 Automated accessibility signals", scoreA7],
];
