/**
 * Entry point for the full-application view (`app.html`).
 *
 * Stylesheet imports are identical to `main.tsx`, including the deliberate
 * absence of `CssBaseline` — see the note there. `ScopedCssBaseline` still
 * carries the reset, even though the candidate owns almost the whole viewport in
 * this view: the frame keeps a host strip below the application region, and a
 * global reset would reach it.
 *
 * A separate entry rather than a route, because the leakage assertion compares
 * two page loads and import-time stylesheet injection has to be inside the
 * measurement.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";
import "./demo.css";

import { AppView } from "./AppView.js";

const container = document.getElementById("root");
if (!container) throw new Error("No #root element in app.html");

createRoot(container).render(
  <StrictMode>
    <AppView />
  </StrictMode>,
);
