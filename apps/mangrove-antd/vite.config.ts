import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `base` is deliberately absent: scripts/build-apps.mjs supplies it for both
 * local and Pages builds and then verifies it applied. Hard-coding it here
 * would break `pnpm site`.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5208, strictPort: true },
  preview: { port: 5209, strictPort: true },
});
