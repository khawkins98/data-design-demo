/**
 * Entry point for the embedded-island view (`island.html`).
 *
 * The stylesheet imports and their order are identical to `main.tsx`, and for the
 * same reasons — Mangrove's published sheet first, then the host supplement, then
 * the scoped tokens, then this demo's repair CSS. See `main.tsx` for why
 * `CssBaseline` is absent and `ScopedCssBaseline` is used instead.
 *
 * Kept as a separate entry rather than a router because the leakage assertion
 * loads a URL twice and diffs computed styles: a real page load per view keeps
 * import-time stylesheet injection inside the measurement.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";
import "./demo.css";

import { IslandView } from "./IslandView.js";

const container = document.getElementById("root");
if (!container) throw new Error("No #root element in island.html");

createRoot(container).render(
  <StrictMode>
    <IslandView />
  </StrictMode>,
);
