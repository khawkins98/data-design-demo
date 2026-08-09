import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `base` is deliberately absent: scripts/build-apps.mjs supplies it for both
 * local and Pages builds and then verifies it applied. Hard-coding it here
 * would break `pnpm site`.
 *
 * Every root `.html` file has to be listed below. Vite emits only the entries an
 * app declares, and omitting one still produces a successful build with a valid
 * `dist/index.html` — the extra view simply vanishes. `scripts/build-apps.mjs`
 * fails the build when a root `.html` has no `dist` counterpart, which is the
 * only thing that catches it.
 *
 * `island.html` is absent on purpose: the embedded-island view belongs to the
 * Mangrove host, and lives in `apps/mangrove-react-aria`.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5194, strictPort: true },
  preview: { port: 5195, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
    },
  },
});
