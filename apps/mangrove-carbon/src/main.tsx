/**
 * Entry point.
 *
 * Stylesheet order, and why it is this order:
 *
 *   1. Mangrove 1.8.1 — the host design system, 197 KB, element-level rules.
 *   2. host-mangrove/host.css — the shell's layout supplement.
 *   3. Carbon — either the global stylesheet or the scoped experiment.
 *   4. undrr-tokens — shared project tokens, scoped to `.undrr-tokens`.
 *   5. theme.css — ours: maps `--undrr-*` onto Carbon's `--cds-*`.
 *
 * Carbon comes AFTER Mangrove deliberately. Both are global sheets of roughly
 * comparable specificity, so whichever loads last wins the element-level ties.
 * Loading Carbon last is what a team adding Carbon to a Mangrove page would do,
 * and it is the honest configuration to measure: it lets Carbon's reset beat
 * Mangrove's, which is exactly the leakage the assertion looks for. The reverse
 * order fixes nothing — it moves the damage from the host's elements to Carbon's
 * components. Both directions are measured in e2e/demo.spec.ts.
 *
 * Carbon's CSS is imported dynamically and only when the candidate subtree is
 * enabled, so `?candidate=off` is a genuine Carbon-free baseline. See
 * css-mode.ts for why that matters more here than for any other pairing.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";

import { candidateEnabled, carbonCssMode } from "./css-mode.js";

async function loadCarbonCss(): Promise<void> {
  if (!candidateEnabled()) return;

  if (carbonCssMode() === "scoped") {
    await import("./carbon-scoped.scss");
    return;
  }
  await import("@carbon/styles/css/styles.css");
}

async function mount(): Promise<void> {
  await loadCarbonCss();

  // Tokens and our theme last, so `--cds-*` overrides win over Carbon's own.
  await import("@undrr-eval/undrr-tokens/tokens.css");
  await import("@undrr-eval/known-issues/known-issues.css");
  await import("./theme.css");

  const { App } = await import("./App.js");

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in index.html");

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void mount();
