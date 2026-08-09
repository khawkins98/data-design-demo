/**
 * Entry point for the embedded-island view (`island.html`).
 *
 * Stylesheet order and the dynamic-import structure are IDENTICAL to `main.tsx`,
 * deliberately: Mangrove first, then the host supplement, then Carbon, then the
 * tokens, then `theme.css`. See `main.tsx` for why Carbon loads last of the two
 * global sheets, and `css-mode.ts` for why it is not loaded at all under
 * `?candidate=off`.
 *
 * THE CSS-MODE SWITCH IS THE POINT OF THIS VIEW, not a leftover from the kitchen
 * sink. `?carbonCss=` selects between Carbon's documented global stylesheet
 * (default) and the scoped containment experiment, and the island frame is the
 * place where that choice is most visible: the frame renders the real published
 * UNDRR page header, masthead and `mg-mega-topbar` navigation directly above the
 * candidate region, so Carbon's global reset lands on real page chrome rather
 * than on a canary block. The two modes are screenshotted and leak-measured
 * separately in e2e/island.spec.ts.
 *
 * A separate entry rather than a route, because the leakage assertion compares
 * two page loads and import-time stylesheet injection has to be inside the
 * measurement.
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

  const { IslandView } = await import("./IslandView.js");

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in island.html");

  createRoot(container).render(
    <StrictMode>
      <IslandView />
    </StrictMode>,
  );
}

void mount();
