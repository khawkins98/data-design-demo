import { createPlaywrightConfig } from "@undrr-eval/test-harness";

export default createPlaywrightConfig({
  webServerCommand: "pnpm preview",
  port: 5199,
});
