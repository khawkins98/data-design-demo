/**
 * Entry point.
 *
 * Stylesheet order is load-bearing:
 *
 *   1. Mangrove's real published stylesheet, by deep path (its `main` field
 *      points at a `dist/` the tarball does not ship — see
 *      docs/host-derivation.md finding 2).
 *   2. The host's layout supplement.
 *   3. The UNDRR tokens, scoped to `.undrr-tokens` rather than `:root`.
 *   4. This demo's own CSS, which has to undo some of (1) inside the candidate
 *      subtree — Mangrove styles bare `input`, `label`, `legend` and `ul`
 *      elements, and those rules reach inside MUI components.
 *
 * CssBaseline IS DELIBERATELY ABSENT. It is MUI's documented global reset and it
 * writes styles to `html`, `body` and `*`, which would reach straight past the
 * candidate subtree and restyle the host's canary elements. Including it would
 * fail the leakage assertion by design rather than by accident.
 *
 * The consequence is recorded honestly in EVIDENCE.md: MUI components are built
 * expecting CssBaseline, so omitting it is a real deviation from the library's
 * intended setup, not a free win. On this host the deviation bites harder than
 * on Delta, because CssBaseline is exactly what would have neutralised
 * Mangrove's element-level input styling.
 *
 * ScopedCssBaseline is used instead — it applies the same reset bounded to a
 * wrapper element, which is the containment this evaluation needs.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr/undrr-mangrove/css/style.css";
import "@undrr-eval/host-mangrove/host.css";
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
