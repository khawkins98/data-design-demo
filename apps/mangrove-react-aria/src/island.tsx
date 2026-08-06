/**
 * Entry point for the embedded-island view.
 *
 * Stylesheet order is the same contract `main.tsx` documents: Mangrove's own
 * published sheet, then the host supplement, then the UNDRR tokens, then the
 * candidate theme. `views.css` comes last because it is layout on top of
 * `theme.css`, not a replacement for it.
 *
 * `known-issues.css` sits before `theme.css` for the same reason the host sheets
 * do: the box is host chrome, rendered through the frame's `notices` prop outside
 * `data-candidate-root`, and it must be stylable without the candidate theme
 * having been parsed yet.
 *
 * React Aria ships no stylesheet at all — there is nothing to import from the
 * library — which is why this app's leakage risk is low by construction.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";
import "./theme.css";
import "./views/views.css";

import { IslandView } from "./IslandView.js";

function mount(): void {
  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in island.html");

  createRoot(container).render(
    <StrictMode>
      <IslandView />
    </StrictMode>,
  );
}

mount();
