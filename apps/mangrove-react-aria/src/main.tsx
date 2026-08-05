/**
 * Entry point.
 *
 * Loads the Mangrove host stylesheet first, then the UNDRR tokens, then the
 * candidate theme. Order matters: the theme reads token custom properties, and
 * the host must be able to style its own canaries without the candidate's CSS
 * having been parsed yet.
 *
 * React Aria ships no stylesheet at all — there is nothing to import from the
 * library. That is a notable difference from the other candidates and is why
 * this app's leakage risk is low by construction.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "./theme.css";

import { App } from "./App.js";

function mount(): void {
  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in index.html");

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount();
