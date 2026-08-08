#!/usr/bin/env node
/**
 * Assembles the full comparison site into `_site/`.
 *
 * Landing page at the root, each built demo beneath it at its own subpath —
 * exactly the layout GitHub Pages serves. Run locally to click through every
 * demo from one URL:
 *
 *   pnpm site
 *
 * This is the same script the Pages workflow calls. It used to be inline bash
 * in the workflow, which meant the thing you browsed locally and the thing that
 * got published were assembled by two different pieces of code. Now there is
 * one.
 *
 * Assumes the apps are already built. `pnpm site` handles that ordering.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SITE = join(ROOT, "_site");
const DOCS = join(ROOT, "docs");
const APPS = join(ROOT, "apps");

// Copy Mangrove's compiled stylesheet into docs/ so generated HTML pages can
// reference it. The file is not committed — it is a build artifact derived from
// the npm package the demo apps already depend on.
const MANGROVE_CSS = join(
  ROOT,
  "packages/host-mangrove/node_modules/@undrr/undrr-mangrove/css/style.css",
);
copyFileSync(MANGROVE_CSS, join(DOCS, "mangrove.css"));
process.stdout.write("copied mangrove.css → docs/\n");

/** Directory entries under apps/ that are actual apps. */
function appDirs() {
  if (!existsSync(APPS)) return [];
  return readdirSync(APPS)
    .filter((name) => {
      const path = join(APPS, name);
      return statSync(path).isDirectory();
    })
    .sort();
}

/**
 * Refuse to assemble a demo whose Vite base was overwritten by a later direct
 * app build. `build-apps.mjs` checks this immediately after building, but dist
 * is mutable: running `vite build` in one app afterwards resets its URLs to
 * `/assets/...`. Without this second check, site assembly copies a successful
 * but blank demo into `_site/`.
 *
 * Pages adds a repository prefix before the app name, while local preview does
 * not, so checking for the app's own path segment works in both environments.
 */
function assertAppBase(name, dist) {
  const appSegment = `/${name}/`;
  const entries = readdirSync(dist).filter((file) => file.endsWith(".html"));

  for (const entry of entries) {
    const html = readFileSync(join(dist, entry), "utf8");
    const absoluteRefs = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(
      (match) => match[1],
    );
    const wrongBase = absoluteRefs.filter((ref) => !ref.includes(appSegment));

    if (wrongBase.length > 0) {
      throw new Error(
        `${name}/dist/${entry} was built for the wrong base. Offending refs:\n` +
          wrongBase.map((ref) => `  ${ref}`).join("\n") +
          "\nRebuild with `node scripts/build-apps.mjs` before assembling the site.",
      );
    }
  }
}

// Regenerate the landing page first, so it always reflects the evidence.json
// files present on this commit. This used to be a separate `docs:index` step
// that both `pnpm site` and CI had to remember to call; folding it in here means
// the site can never be assembled around a stale index.
// The known-issues JSON first, because the landing page reads it. It is
// transcribed from the TypeScript registry the demo pages import, so the cards
// and the box on each demo cannot disagree about what is known.
execFileSync(
  "node",
  ["--experimental-strip-types", join(HERE, "build-known-issues-json.mjs")],
  { cwd: ROOT, stdio: "inherit" },
);

execFileSync("node", [join(HERE, "build-docs-index.mjs")], { cwd: ROOT, stdio: "inherit" });

// And the side-by-side comparison, for the same reason: it is derived entirely
// from apps/*/evidence.json, so it must be rebuilt from whatever is present now.
execFileSync("node", [join(HERE, "build-comparison.mjs")], { cwd: ROOT, stdio: "inherit" });

// The axis scores, which read both evidence.json and the apps' own stylesheets
// and build output. This runs after build:apps for that reason: the A5
// propagation measurement inspects shipped CSS, and reports "not built" without
// it rather than guessing.
execFileSync("node", [join(HERE, "build-axes.mjs")], { cwd: ROOT, stdio: "inherit" });

// Architecture options — hand-written markdown rendered to HTML for the site nav.
execFileSync("node", [join(HERE, "build-architecture.mjs")], { cwd: ROOT, stdio: "inherit" });

// Issues register — all known issues rendered to a filterable HTML page.
execFileSync(
  "node",
  ["--experimental-strip-types", join(HERE, "build-issues-page.mjs")],
  { cwd: ROOT, stdio: "inherit" },
);

// Scores page doubles as the landing page since it carries the overview grid,
// recommendation, and the six framing questions.
execFileSync(
  "node",
  ["--experimental-strip-types", join(HERE, "build-scores.mjs")],
  { cwd: ROOT, stdio: "inherit" },
);

const built = [];
const missing = [];

for (const name of appDirs()) {
  const dist = join(APPS, name, "dist");
  if (!existsSync(dist)) {
    missing.push(name);
    continue;
  }
  assertAppBase(name, dist);
  built.push(name);
}

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });

// docs/ carries the generated pages and markdown reference documents.
cpSync(DOCS, SITE, { recursive: true });

// scores.html is the landing page.
copyFileSync(join(SITE, "scores.html"), join(SITE, "index.html"));

for (const name of built) {
  cpSync(join(APPS, name, "dist"), join(SITE, name), { recursive: true });
}

process.stdout.write(`assembled _site/\n`);
process.stdout.write(`  landing page: _site/index.html\n`);
for (const name of built) {
  process.stdout.write(`  demo:         _site/${name}/\n`);
}

if (missing.length > 0) {
  // Not an error: a pairing that has not been built yet is a legitimate state,
  // and the landing page renders it as "not started". But say so, because a
  // silently absent demo looks identical to one that was never attempted.
  process.stdout.write(`\nnot built, so the landing page will show them as pending:\n`);
  for (const name of missing) {
    process.stdout.write(`  ${name}\n`);
  }
}

if (built.length === 0) {
  process.stdout.write(`\nNo demos built yet. Run \`pnpm build\` first, or use\n`);
  process.stdout.write(`\`pnpm preview\` to inspect the scaffold on its own.\n`);
}
