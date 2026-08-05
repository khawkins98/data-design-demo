#!/usr/bin/env node
/**
 * Builds every app under `apps/` with the correct `base` for its subpath.
 *
 * Each demo is served from `<prefix>/<app>/`, so Vite needs a matching `base`
 * or every asset URL resolves to the site root and 404s. The prefix differs
 * between local and Pages:
 *
 *   local:  /mangrove-react-aria/            (BASE_PREFIX unset)
 *   Pages:  /data-design-demo/mangrove-react-aria/
 *
 * Set BASE_PREFIX to the repository name for a Pages build:
 *
 *   BASE_PREFIX=/data-design-demo node scripts/build-apps.mjs
 *
 * Shared by `pnpm site` and the Pages workflow so a base-path bug cannot show
 * up in one and not the other.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");

/** Trailing slashes are normalised away so the join below is unambiguous. */
const prefix = (process.env["BASE_PREFIX"] ?? "").replace(/\/+$/, "");

function appNames() {
  if (!existsSync(APPS)) return [];
  return readdirSync(APPS)
    .filter((name) => statSync(join(APPS, name)).isDirectory())
    .sort();
}

const names = appNames();

if (names.length === 0) {
  process.stdout.write("No apps under apps/ yet. Nothing to build.\n");
  process.exit(0);
}

let failed = 0;

for (const name of names) {
  const base = `${prefix}/${name}/`;
  process.stdout.write(`\n=== ${name} (base ${base}) ===\n`);
  try {
    // No `--` before --base. pnpm 10 forwards trailing args to the script
    // directly, and a `--` is consumed by pnpm's own parser instead of being
    // passed through, so `build -- --base X` silently builds with base "/".
    // That produced a site whose every asset 404'd, and it looked fine because
    // the dev server falls back to index.html. Hence the check below.
    execFileSync("pnpm", ["--filter", `./apps/${name}`, "build", "--base", base], {
      cwd: ROOT,
      stdio: "inherit",
    });
  } catch {
    // Keep going: one broken demo should not hide whether the others build.
    // A blocked pairing is a legitimate outcome in this evaluation.
    process.stderr.write(`\nbuild FAILED: ${name}\n`);
    failed += 1;
    continue;
  }

  // Verify the base actually landed in the output. A wrong base produces a site
  // that serves but cannot load, which is worse than a build error.
  const indexHtml = join(APPS, name, "dist", "index.html");
  if (!existsSync(indexHtml)) {
    process.stderr.write(`\nbuild produced no dist/index.html: ${name}\n`);
    failed += 1;
    continue;
  }

  const html = readFileSync(indexHtml, "utf8");
  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const localRefs = assetRefs.filter((ref) => ref?.startsWith("/"));
  const wrongBase = localRefs.filter((ref) => !ref?.startsWith(base));

  if (localRefs.length === 0) {
    process.stderr.write(`\nno absolute asset refs found in ${name}/dist/index.html\n`);
    failed += 1;
  } else if (wrongBase.length > 0) {
    process.stderr.write(
      `\nbase "${base}" did not apply to ${name}. Offending refs:\n` +
        wrongBase.map((r) => `  ${r}\n`).join(""),
    );
    failed += 1;
  } else {
    process.stdout.write(`  base verified on ${localRefs.length} asset ref(s)\n`);
  }
}

process.stdout.write(`\n${names.length - failed}/${names.length} apps built\n`);

if (failed > 0) {
  process.stderr.write(`${failed} app(s) failed to build.\n`);
  process.exit(1);
}
