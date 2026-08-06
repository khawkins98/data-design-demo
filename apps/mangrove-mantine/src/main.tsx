/**
 * Entry point.
 *
 * THE MANTINE STYLESHEET IS LOADED DYNAMICALLY, AND THAT IS DELIBERATE.
 *
 * The leakage assertion works by loading the page twice, `?candidate=off` then
 * `?candidate=on`, and diffing the host canaries' computed styles. A library
 * whose CSS arrives through a static `import "…/styles.css"` is present in BOTH
 * loads, so its leakage cancels out and the assertion passes vacuously. That is
 * fine for a library like MUI that injects its styles at render time, but
 * Mantine ships a plain stylesheet — so a static import would have produced a
 * clean leakage result the library had not earned.
 *
 * Awaiting the import inside the `candidate=on` branch makes the measurement
 * honest: with the candidate off, not one byte of Mantine CSS is in the
 * document. Verified in e2e by asserting the `--mantine-*` variables are absent
 * from `:root` on the baseline load.
 *
 * Load order is Mangrove -> host layout -> tokens -> Mantine -> our CSS, so the
 * host can style its own canaries before any candidate CSS is parsed, and our
 * scoped repairs sit last where they can win at equal specificity.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";

import { App } from "./App.js";

const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

async function mount(): Promise<void> {
  if (candidateEnabled) {
    // ./mantine-styles.css is Mantine's stylesheet minus its global baseline.
    // See the header comment in that file for why, and what it costs.
    await import("./mantine-styles.css");
    await import("./demo.css");
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in index.html");

  createRoot(container).render(
    <StrictMode>
      <App candidateEnabled={candidateEnabled} />
    </StrictMode>,
  );
}

void mount();
