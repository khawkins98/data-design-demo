/**
 * Entry point.
 *
 * Loads the Delta host stylesheet first, then the UNDRR tokens, then the
 * candidate theme. Order matters: the theme reads token custom properties, and
 * the host must be able to style its own canaries without the candidate's CSS
 * having been parsed yet.
 *
 * React Aria ships no stylesheet at all — there is nothing to import from the
 * library. That is a notable difference from the other candidates and is why
 * this app's leakage risk is low by construction.
 *
 * The Delta host stylesheet is Tailwind 4 WITH Preflight, so `host.css`
 * contains a global reset that reaches every element on the page including
 * ours: `*{border:0 solid;margin:0;padding:0}`, `h1..h6{font-size:inherit;
 * font-weight:inherit}`, `button{background-color:#0000;border-radius:0}`,
 * `ol,ul,menu{list-style:none}`, `a{color:inherit;text-decoration:inherit}`.
 * Everything the browser would normally give for free has to be restated in
 * theme.css. That cost is measured there and recorded in EVIDENCE.md.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
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
