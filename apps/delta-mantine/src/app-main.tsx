/**
 * Entry point for the full-application view (`app.html`).
 *
 * `@mantine/core/styles.css` IS STILL NOT IMPORTED, for the reason `main.tsx`
 * gives: its first file, `baseline.css`, styles `body`, which the host's canaries
 * inherit. `src/mantine-styles.css` imports the 98 per-component sheets instead,
 * in Mantine's own order.
 *
 * ONE DELIBERATE DIFFERENCE FROM `main.tsx`: the Mantine stylesheet is imported
 * DYNAMICALLY here, inside the `candidate=on` branch.
 *
 * The leakage assertion loads a page twice and diffs the host canaries' computed
 * styles across the two loads. Mantine ships plain CSS rather than injecting it at
 * render time, so a static import is present in BOTH loads and any leakage it
 * carries cancels itself out — the assertion then passes without measuring
 * anything. `main.tsx` imports it statically and compensates with the `?baseline=on`
 * counterfactual; this entry does not need to compensate, because deferring the
 * import costs nothing and makes the assertion real. The mangrove-mantine run
 * reached the same conclusion for its own entries. Recorded as a finding rather
 * than quietly diverging.
 *
 * dayjs locales are registered even though this view renders no calendar: the
 * import graph reaches `@mantine/dates` through `mantine-styles.css` only, so this
 * is belt-and-braces for the day a date filter is added, and costs four locale
 * files that are already in the other entry's bundle.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import dayjs from "dayjs";
import "dayjs/locale/en-gb.js";
import "dayjs/locale/fr.js";
import "dayjs/locale/de.js";
import "dayjs/locale/ar.js";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";

import { AppView } from "./AppView.js";

/** en-GB is the fixture's baseline locale and the harness's Playwright locale. */
dayjs.locale("en-gb");

const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

async function mount(): Promise<void> {
  if (candidateEnabled) {
    await import("./mantine-styles.css");
    await import("./demo.css");
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in app.html");

  createRoot(container).render(
    <StrictMode>
      <AppView candidateEnabled={candidateEnabled} />
    </StrictMode>,
  );
}

void mount();
