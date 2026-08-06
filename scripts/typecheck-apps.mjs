#!/usr/bin/env node
/**
 * Typechecks every app under `apps/`.
 *
 * This exists because `pnpm verify` did not. The root `tsconfig.json` references
 * only `packages/*`, and app tsconfigs are `noEmit` with `composite: false`, so
 * they cannot be project references and `tsc --build` never visited them. Every
 * app's `src/` and `e2e/` had therefore never been typechecked by the verify
 * step or by CI.
 *
 * It was found the hard way: four type errors in a new pairing passed
 * `pnpm typecheck` and only appeared when the app was checked directly. The
 * existing eight apps turned out to be clean, so nothing was hiding - but the
 * gap was real and would have swallowed the next mistake.
 *
 * Apps are checked one at a time rather than as one program, because each has
 * its own `types` and its own candidate library.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const APPS = join(ROOT, "apps");

const apps = existsSync(APPS)
  ? readdirSync(APPS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(APPS, d.name, "tsconfig.json")))
      .map((d) => d.name)
      .sort()
  : [];

if (apps.length === 0) {
  process.stdout.write("no apps to typecheck\n");
  process.exit(0);
}

const failed = [];

for (const app of apps) {
  try {
    execFileSync("node", [join(ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", join("apps", app, "tsconfig.json")], {
      cwd: ROOT,
      stdio: "inherit",
    });
    process.stdout.write(`typecheck ok   ${app}\n`);
  } catch {
    failed.push(app);
    process.stdout.write(`TYPECHECK FAIL ${app}\n`);
  }
}

if (failed.length > 0) {
  process.stderr.write(`\n${failed.length} app(s) failed typecheck: ${failed.join(", ")}\n`);
  process.exit(1);
}

process.stdout.write(`\n${apps.length} apps typechecked\n`);
