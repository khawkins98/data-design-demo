/**
 * Entry point.
 *
 * `@carbon/styles/css/styles.css` IS DELIBERATELY NOT IMPORTED. It is Carbon's
 * documented prebuilt stylesheet and the simple route to getting Carbon to look
 * right, but it opens with a global Eric-Meyer reset over ~90 element selectors,
 * which restyles the Delta host's leakage canaries. `src/carbon.scss` loads only
 * the `.cds--`-prefixed component partials instead. The full reasoning is there.
 *
 * The prebuilt file is still loaded on demand when the URL carries
 * `?globalcss=on`, so the e2e run can measure exactly what it does to the host
 * canaries rather than describing it from reading the CSS. That measurement is
 * the substance of this run's leakage finding.
 *
 * Stylesheet order matters: host first, so Tailwind Preflight is in place before
 * Carbon's component rules, then the token declarations, then Carbon, then the
 * `--cds-*` → `--undrr-*` mapping which must win.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "./carbon.scss";
import "./demo.css";

import { App } from "./App.js";

const params = new URLSearchParams(window.location.search);

/**
 * The leakage probe. Loads Carbon's prebuilt global stylesheet so
 * `checkLeakage` can diff the host canaries against it.
 *
 * A dynamic import, not a conditional `<link>`, so it goes through the same Vite
 * pipeline as any other CSS import and the measurement reflects what a real
 * consumer would ship.
 */
async function loadCarbonGlobalCss(): Promise<void> {
  await import("@carbon/styles/css/styles.css");
}

async function start(): Promise<void> {
  if (params.get("globalcss") === "on") {
    await loadCarbonGlobalCss();
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in index.html");

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
