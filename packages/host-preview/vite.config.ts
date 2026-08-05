import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // Fail loudly rather than silently moving to another port, so the
    // Playwright config and the documented URL stay in step.
    strictPort: true,
  },
  preview: {
    port: 5181,
    strictPort: true,
  },
});
