/**
 * Entry point.
 *
 * antd's `reset.css` IS DELIBERATELY ABSENT. It is antd's documented global
 * reset and it writes to `html`, `body` and `*`, which would reach past the
 * candidate subtree and restyle the host's canary elements — the same reason
 * MUI's CssBaseline and Carbon's prebuilt stylesheet were omitted.
 *
 * antd needs it less than the others do, which is the interesting part. Its
 * component styles are emitted by @ant-design/cssinjs at runtime and are
 * self-contained rather than assuming a reset, so omitting it is a smaller
 * deviation here than `ScopedCssBaseline` was for MUI. Measured, not assumed:
 * see the global-stylesheet probe in EVIDENCE.md.
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
