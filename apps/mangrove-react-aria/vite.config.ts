import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `base` is left at the default so `vite build --base /<repo>/<app>/` from the
 * Pages workflow controls it. Hard-coding it here would break local preview.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 5190, strictPort: true },
  preview: { port: 5191, strictPort: true },
});
