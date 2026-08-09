import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `base` is left at the default so `vite build --base /<repo>/<app>/` from the
 * Pages workflow controls it. Hard-coding it here would break local preview.
 *
 * Every root `.html` file has to be listed below. Vite emits only the entries an
 * app declares, and omitting one still produces a successful build with a valid
 * `dist/index.html` — the extra view simply vanishes. `scripts/build-apps.mjs`
 * fails the build when a root `.html` has no `dist` counterpart, which is the
 * only thing that catches it.
 *
 * `app.html` is absent on purpose: the full-application view belongs to the Delta
 * host, and lives in `apps/delta-react-aria`.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5190, strictPort: true },
  preview: { port: 5191, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        island: resolve(__dirname, "island.html"),
      },
    },
  },
});
