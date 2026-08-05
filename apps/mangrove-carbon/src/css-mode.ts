/**
 * Page-load switches read from the query string.
 *
 * THE CARBON CSS MODE IS THE CENTRAL FINDING OF THIS PAIRING, so it is worth
 * spelling out.
 *
 * Carbon's documented consumption route is a *global* stylesheet. Both of its
 * shipped forms are global:
 *
 *   import "@carbon/styles/css/styles.css";   // prebuilt, 958 KB / 84 KB gzip
 *   @use "@carbon/styles";                    // Sass entry, same output
 *
 * That stylesheet opens with an Eric-Meyer-style reset over `html, body, div,
 * h1..h6, p, a, table, button, ul, ol, ...` plus `body { font-family: 'IBM Plex
 * Sans' }`, `html { box-sizing: border-box }`, `*, *::before, *::after {
 * box-sizing: inherit }` and element-level type rules for every heading and
 * paragraph. On a page the host already owns, that is not containable: it
 * restyles the host's own markup by design.
 *
 * So this demo can load Carbon two ways, selected by `?carbonCss=`:
 *
 *   global (default)  Carbon exactly as documented. Leakage FAILS. The diff is
 *                     recorded in test-results/leakage*.json and EVIDENCE.md.
 *   scoped            An experiment: the same Sass entry compiled inside a
 *                     `.demo { ... }` block so every selector is prefixed.
 *                     Not a documented Carbon route. See carbon-scoped.scss.
 *
 * `global` is the default because it is what a team adopting Carbon would
 * actually ship, and the evaluation is supposed to measure the real cost rather
 * than a version of Carbon we invented to make the number look good.
 */

const params = new URLSearchParams(window.location.search);

export type CarbonCssMode = "global" | "scoped";

/** Reads `?carbonCss=scoped`; anything else, including absent, means global. */
export function carbonCssMode(): CarbonCssMode {
  return params.get("carbonCss") === "scoped" ? "scoped" : "global";
}

/**
 * The leakage contract from `apps/README.md`.
 *
 * When off, the host renders with an empty candidate subtree AND no Carbon
 * stylesheet at all. Skipping the stylesheet is the point: the harness compares
 * across a reload precisely so that CSS a library injects at import time shows
 * up as a difference instead of being present in both snapshots and cancelling
 * out. Loading Carbon's reset into the baseline would make the assertion pass
 * vacuously, which for this pairing would be the single most misleading result
 * in the whole evaluation.
 */
export function candidateEnabled(): boolean {
  return params.get("candidate") !== "off";
}
