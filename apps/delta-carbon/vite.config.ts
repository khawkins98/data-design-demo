import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

/**
 * Duplicated from `@undrr-eval/undrr-tokens`'s `TOKEN_SCOPE_CLASS` rather than
 * imported. The workspace packages publish TypeScript source through their
 * `exports` field, and Vite externalises workspace dependencies when it bundles
 * this config file, so a real import here fails to resolve at config-load time
 * unless the packages have been compiled first. A build config that depends on
 * another package's build step is worse than a duplicated string constant.
 */
const TOKEN_SCOPE_CLASS = "undrr-tokens";

/**
 * Rewrites the single `:root` rule Carbon's layer module emits so it lands on
 * the token scope class instead of the document root.
 *
 * WHY THIS EXISTS. Even with the global reset excluded (see src/carbon.scss),
 * `@carbon/styles/scss/components/*` pulls in `scss/layer`, which emits:
 *
 *     :root {
 *       --cds-layer: var(--cds-layer-01, #f4f4f4);
 *       ... 15 more layer/field/border aliases ...
 *     }
 *
 * Those are custom-property declarations, so they change nothing about the host
 * canaries on their own — the leakage assertion passes either way, and that was
 * measured, not assumed. But they do put Carbon's names in the document's global
 * scope, which is the thing this evaluation is trying to keep score of. Moving
 * them onto `.undrr-tokens` means the shipped stylesheet contains ZERO selectors
 * that can match host markup.
 *
 * It is an escape hatch and is recorded as one in evidence.json. The important
 * point for UNDRR is that Carbon gives you no supported way to do this: there is
 * no `$emit-layer-at` option, and the `:root` emit is not behind a feature flag.
 *
 * Deliberately narrow: it only touches this app's `src/carbon.scss`. Rewriting
 * `:root` globally would break the host, whose Tailwind 4 stylesheet declares
 * its entire theme layer on `:root, :host`.
 *
 * `enforce` is omitted on purpose so this runs as a normal-order plugin, which
 * is after Vite's own `vite:css` (a pre plugin) has compiled the Sass and before
 * `vite:css-post` turns the result into a JS module. A `post` plugin would see
 * the JS wrapper instead of the CSS.
 */
function scopeCarbonRoot(): Plugin {
  return {
    name: "undrr:scope-carbon-root",
    transform(code, id) {
      if (!id.includes("src/carbon.scss")) return null;
      if (!code.includes(":root")) return null;

      let rewrites = 0;

      // Only `:root` in rule-selector position, i.e. immediately followed by a
      // block. Carbon emits no `:root` in a media condition or a var() fallback,
      // and a `:root` inside `@media { }` would be correct to rewrite anyway.
      const next = code.replace(/:root(\s*\{)/g, (_match, block: string) => {
        rewrites += 1;
        return `.${TOKEN_SCOPE_CLASS}${block}`;
      });

      if (rewrites === 0) {
        // Loud rather than silent: if Carbon stops emitting `:root` the note in
        // EVIDENCE.md is stale and someone should find out.
        this.warn("carbon.scss contained ':root' but no rule selector matched");
      }

      return { code: next, map: null };
    },
  };
}

/**
 * `base` is deliberately absent: scripts/build-apps.mjs supplies it for both
 * local and Pages builds and then verifies it applied. Hard-coding it here
 * would break `pnpm site`.
 */
export default defineConfig({
  plugins: [react(), scopeCarbonRoot()],
  css: {
    preprocessorOptions: {
      scss: {
        // Carbon's Sass carries deprecation warnings from its own internals;
        // quieting dependency noise keeps the build output readable.
        quietDeps: true,
        silenceDeprecations: ["global-builtin", "import"],
      },
    },
  },
  server: { port: 5198, strictPort: true },
  preview: { port: 5199, strictPort: true },
  /**
   * Vite emits only the entries an app declares. Without `app` here the build
   * would still succeed and silently drop the full-application view; see
   * apps/README.md.
   */
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
    },
  },
});
