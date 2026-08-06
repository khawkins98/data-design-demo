import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `base` is deliberately absent: scripts/build-apps.mjs supplies it for both
 * local and Pages builds and then verifies it applied. Hard-coding it here
 * would break `pnpm site`.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5204, strictPort: true },
  preview: { port: 5205, strictPort: true },
  /**
   * Vite emits only the entries an app declares. Without `island` here the build
   * would still succeed, still produce a valid `dist/index.html`, and silently
   * drop the embedded-island view; see apps/README.md.
   */
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        island: resolve(__dirname, "island.html"),
      },
    },
  },
});
