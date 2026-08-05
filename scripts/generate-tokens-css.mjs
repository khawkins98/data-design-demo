#!/usr/bin/env node
/**
 * Emits packages/undrr-tokens/src/tokens.css from tokens.ts.
 *
 * The brief requires the tokens to exist both as CSS custom properties and as a
 * JS/TS export of the same values. Generating one from the other is the only
 * way to be sure "the same values" stays true; tokens.test.ts fails if the
 * committed CSS drifts from the TS.
 *
 *   pnpm tokens:css
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TOKEN_SCOPE_CLASS, tokensAsCssVars } from "../packages/undrr-tokens/src/tokens.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "packages", "undrr-tokens", "src", "tokens.css");

const vars = tokensAsCssVars();

const lines = [
  "/* GENERATED FILE - DO NOT EDIT BY HAND.",
  " *",
  " * Produced from tokens.ts by scripts/generate-tokens-css.mjs.",
  " * Regenerate with: pnpm tokens:css",
  " *",
  " * Scoped to a class rather than :root on purpose. The host shells own the",
  " * document, and tokens that leaked to :root would theme the host's canary",
  " * elements too, which would defeat the leakage assertion.",
  " */",
  "",
  `.${TOKEN_SCOPE_CLASS} {`,
];

let lastGroup = "";
for (const [name, value] of Object.entries(vars)) {
  // Blank line between token groups keeps the generated file readable.
  const group = name.split("-").slice(2, 3).join("");
  if (lastGroup && group !== lastGroup) lines.push("");
  lastGroup = group;
  lines.push(`  ${name}: ${value};`);
}

lines.push("}", "");

writeFileSync(OUT, lines.join("\n"), "utf8");
process.stdout.write(`wrote ${OUT} (${Object.keys(vars).length} tokens)\n`);
