/**
 * Entry point for the full-application view (`app.html`).
 *
 * Stylesheet imports and their order are identical to `main.tsx`, including the
 * deliberate absence of `@carbon/styles/css/styles.css` — see the note there for
 * what that prebuilt file's global reset does to the host's canaries, and
 * `src/carbon.scss` for what is loaded instead.
 *
 * It matters MORE here, not less, even though the candidate owns almost the whole
 * viewport in this view: the application frame keeps a host strip below the
 * application region, the toolbar carries a real `mg-button`, and the sidebar is
 * host markup. A global reset would reach all three.
 *
 * `?globalcss=on` is honoured here too, so the same probe the kitchen sink uses to
 * measure Carbon's documented stylesheet against the canaries can be run against
 * this layout as well.
 *
 * A separate entry rather than a route, because the leakage assertion compares two
 * page loads and import-time stylesheet injection has to be inside the
 * measurement.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";
import "./carbon.scss";
import "./demo.css";

import { AppView } from "./AppView.js";

const params = new URLSearchParams(window.location.search);

/** See `main.tsx`: a dynamic import so the probe goes through the same pipeline. */
async function loadCarbonGlobalCss(): Promise<void> {
  await import("@carbon/styles/css/styles.css");
}

async function start(): Promise<void> {
  if (params.get("globalcss") === "on") {
    await loadCarbonGlobalCss();
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in app.html");

  createRoot(container).render(
    <StrictMode>
      <AppView />
    </StrictMode>,
  );
}

void start();
