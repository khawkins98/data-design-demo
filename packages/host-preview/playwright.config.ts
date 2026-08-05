import { createPlaywrightConfig } from "@undrr-eval/test-harness";

/**
 * Uses the shared config so the preview exercises exactly the setup the eight
 * demos will use. If the harness config is broken, this finds out first.
 */
export default createPlaywrightConfig({
  webServerCommand: "pnpm preview",
  port: 5181,
});
