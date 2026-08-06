/**
 * Entry point for the embedded-island view (`island.html`).
 *
 * MANTINE'S STYLESHEET IS LOADED DYNAMICALLY HERE FOR THE SAME REASON AS IN
 * `main.tsx`, AND IT MATTERS MORE IN THIS VIEW, NOT LESS.
 *
 * The leakage assertion loads the page twice — `?candidate=off`, then
 * `?candidate=on` — and diffs the host canaries' computed styles. Mantine ships a
 * plain stylesheet rather than injecting styles at render time, so a static
 * `import "./mantine-styles.css"` would be present in BOTH loads and its leakage
 * would cancel itself out. The island is the view whose leakage result carries the
 * most weight, because the candidate sits between real host prose on both sides;
 * a vacuous pass here would be the most misleading result in the whole run.
 *
 * So the import is awaited inside the `candidate=on` branch. With the candidate
 * off, not one byte of Mantine CSS is in the document, and `e2e/island.spec.ts`
 * asserts that by checking the `--mantine-*` custom properties are absent from
 * `:root` on the baseline load.
 *
 * Load order is Mangrove -> host layout -> tokens -> known-issues -> Mantine ->
 * our CSS, identical to `main.tsx`, so the host styles its own canaries before any
 * candidate CSS is parsed and our scoped repairs sit last where they can win at
 * equal specificity.
 *
 * A separate HTML entry rather than a route, because a real page load per view is
 * what keeps import-time stylesheet injection inside the measurement.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";

import { IslandView } from "./IslandView.js";

/*
 * No dayjs locale registration here, unlike `main.tsx`: the island renders no
 * date-picking component, so `@mantine/dates` is not in this entry's graph at
 * all. Dates in the table are formatted with `Intl` from the fixture ISO strings.
 */

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
  if (!container) throw new Error("No #root element in island.html");

  createRoot(container).render(
    <StrictMode>
      <IslandView candidateEnabled={candidateEnabled} />
    </StrictMode>,
  );
}

void mount();
