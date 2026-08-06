/**
 * Entry point.
 *
 * TWO THINGS ABOUT THE STYLESHEET ORDER ARE DELIBERATE.
 *
 * 1. `@mantine/core/styles.css` IS NOT IMPORTED. `src/mantine-styles.css`
 *    imports Mantine's per-component stylesheets individually and omits
 *    `baseline.css`, whose `body { font-family; font-size; line-height;
 *    background-color; color }` rule is inherited by the host's leakage canaries.
 *    The reasoning, and the empirical measurement behind it, are in
 *    mantine-styles.css and EVIDENCE.md. This is the Mantine equivalent of the
 *    delta-mui run omitting `CssBaseline`, and it is a real deviation from the
 *    library's documented setup rather than a free win.
 *
 * 2. `?baseline=on` injects `baseline.css` at runtime so the leakage cost of the
 *    documented setup can be MEASURED rather than asserted. `?url` gives Vite the
 *    emitted asset path without applying the stylesheet, and the link element is
 *    appended before React mounts so it is present for the first paint.
 *
 * dayjs locales are registered here because Mantine's date components format
 * through dayjs, and a locale that is not registered falls back to English
 * silently — the Arabic and German calendars would look translated-but-not.
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
import "./mantine-styles.css";
import "./demo.css";

import baselineHref from "@mantine/core/styles/baseline.css?url";

import { App } from "./App.js";

/** en-GB is the fixture's baseline locale and the harness's Playwright locale. */
dayjs.locale("en-gb");

const params = new URLSearchParams(window.location.search);

if (params.get("baseline") === "on") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = baselineHref;
  link.dataset["mantineBaseline"] = "on";
  document.head.append(link);
}

const container = document.getElementById("root");
if (!container) throw new Error("No #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
