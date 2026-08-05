/**
 * Entry point.
 *
 * CssBaseline IS DELIBERATELY ABSENT. It is MUI's documented global reset and it
 * writes styles to `html`, `body` and `*`, which would reach straight past the
 * candidate subtree and restyle the host's canary elements. Including it would
 * fail the leakage assertion by design rather than by accident.
 *
 * The consequence is recorded honestly in EVIDENCE.md: MUI components are
 * built expecting CssBaseline, so omitting it is a real deviation from the
 * library's intended setup, not a free win.
 *
 * ScopedCssBaseline is used instead — it applies the same reset but scoped to a
 * wrapper element, which is exactly the containment this evaluation needs.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "./demo.css";

import { App } from "./App.js";

const container = document.getElementById("root");
if (!container) throw new Error("No #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
