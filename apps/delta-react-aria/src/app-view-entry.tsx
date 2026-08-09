/**
 * Entry point for the full-application view.
 *
 * Named `app-view-entry.tsx` rather than `app.tsx` so it cannot be mistaken for
 * a component module: `App.tsx` already exists in this directory and macOS's
 * case-insensitive filesystem would treat `app.tsx` as the same file.
 *
 * Stylesheet order is the same contract `main.tsx` documents: the Delta host
 * sheet (Tailwind 4 with Preflight) first, then the UNDRR tokens, then the
 * candidate theme. `views.css` comes last because it is layout on top of
 * `theme.css`, not a replacement for it.
 *
 * `known-issues.css` sits before `theme.css` for the same reason the host sheet
 * does: the box is host chrome, rendered through the frame's `notices` prop
 * outside `data-candidate-root`, and it must be stylable without the candidate
 * theme having been parsed yet.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@undrr-eval/host-delta/host.css";
import "@undrr-eval/undrr-tokens/tokens.css";
import "@undrr-eval/known-issues/known-issues.css";
import "./theme.css";
import "@undrr-eval/integration-react-aria/records.css";
import "./views/views.css";

import { AppView } from "./AppView.js";

function mount(): void {
  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in app.html");

  createRoot(container).render(
    <StrictMode>
      <AppView />
    </StrictMode>,
  );
}

mount();
