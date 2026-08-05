#!/usr/bin/env node
/**
 * Generates packages/host-mangrove/src/mangrove-2-preview.css from the real
 * Mangrove 2.0 token source.
 *
 * Mangrove 2.0 moves colour and spacing tokens from SCSS variables to CSS
 * custom properties. At the time of writing it is unlanded and unpublished, so
 * host-mangrove still pins 1.8.1 for its stylesheet. This script extracts the
 * forthcoming token API so candidate demos can be themed against the real 2.0
 * contract now rather than against a guess.
 *
 * Tokens are transcribed, not invented: the values come from the branch. When
 * 2.0 publishes to npm, delete this script and its output, bump the
 * host-mangrove pin, and re-run the theming measurements.
 *
 *   node scripts/fetch-mangrove-2-tokens.mjs
 *
 * Requires the `gh` CLI, authenticated. Network access required.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "packages", "host-mangrove", "src", "mangrove-2-preview.css");

const REPO = "unisdr/undrr-mangrove";
const BRANCH = "css-custom-properties-pilot";
const SOURCE = "stories/assets/scss/_variables.scss";

/** Mangrove's root font-size anchor; mg-rem(px) is px/root rem. */
const ROOT_FONT_SIZE = 16;

function fetchSource() {
  const encoded = execFileSync(
    "gh",
    ["api", `repos/${REPO}/contents/${SOURCE}?ref=${BRANCH}`, "--jq", ".content"],
    { encoding: "utf8" },
  );
  return Buffer.from(encoded.replace(/\s/g, ""), "base64").toString("utf8");
}

/**
 * Resolves the SCSS interpolation Mangrove uses for spacing,
 * `#{mg-rem(10)}` -> `0.625rem`. Anything else is passed through verbatim so an
 * unrecognised construct is visible in the output rather than silently dropped.
 */
function resolveValue(raw) {
  const trimmed = raw.trim().replace(/;$/, "");
  const remMatch = trimmed.match(/^#\{mg-rem\(([\d.]+)\)\}$/);
  if (remMatch) {
    const px = Number.parseFloat(remMatch[1]);
    const rem = px / ROOT_FONT_SIZE;
    // Trim trailing zeros so 1rem does not render as 1.0000rem.
    return `${Number.parseFloat(rem.toFixed(6))}rem`;
  }
  return trimmed;
}

const source = fetchSource();

const tokens = [];
for (const match of source.matchAll(/^\s*(--mg-[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
  const [, name, value] = match;
  if (!name || !value) continue;
  tokens.push({ name, value: resolveValue(value) });
}

if (tokens.length === 0) {
  process.stderr.write(
    `error: extracted no tokens from ${SOURCE} on ${BRANCH}. ` +
      `The branch may have been rebased or the file renamed.\n`,
  );
  process.exit(1);
}

const unresolved = tokens.filter((t) => t.value.includes("#{"));

/**
 * Colour tokens that are NOT space-separated channels or var() aliases.
 *
 * These break the documented `rgb(var(--mg-color-x))` consumption pattern:
 * rgb(#008484) is not valid CSS. Surfaced loudly because a candidate demo
 * applying the pattern uniformly would hit silent failures on exactly these.
 */
const nonChannelColours = tokens.filter(
  (t) =>
    t.name.startsWith("--mg-color-") &&
    !/^[0-9]+ [0-9]+ [0-9]+$/.test(t.value) &&
    !t.value.startsWith("var(") &&
    !t.value.startsWith("rgb("),
);

const lines = [
  "/* GENERATED FILE - DO NOT EDIT BY HAND.",
  " *",
  ` * Mangrove 2.0 token preview, transcribed from ${REPO}`,
  ` * branch ${BRANCH}, ${SOURCE}.`,
  " *",
  " * Regenerate with: pnpm mangrove2:tokens",
  " *",
  " * WHY THIS EXISTS",
  " * Mangrove 2.0 replaces SCSS variable theming with CSS custom properties.",
  " * It is not yet landed or published, so host-mangrove still loads the 1.8.1",
  " * compiled stylesheet. This file exposes the forthcoming token API so a",
  " * candidate demo can be themed against the real 2.0 contract today.",
  " *",
  " * IMPORTANT: colours are space-separated RGB channels, not colour values.",
  " * Consume them as rgb(var(--mg-color-x)) or rgb(var(--mg-color-x) / 0.5).",
  " * Assigning one directly to a library's colour property produces an invalid",
  " * value and will silently fail.",
  " *",
  " * DELETE THIS FILE when 2.0 publishes to npm: bump the host-mangrove pin and",
  " * re-run the theming measurements against the real thing.",
  " */",
  "",
  ":root {",
];

let lastGroup = "";
for (const { name, value } of tokens) {
  const group = name.split("-").slice(0, 3).join("-");
  if (lastGroup && group !== lastGroup) lines.push("");
  lastGroup = group;

  if (value.includes("#{")) {
    // Still an SCSS expression, so it has no custom property equivalent and
    // cannot be resolved outside a Sass build. Emitted as a comment rather than
    // invalid CSS, so the gap is visible instead of silently dropped.
    lines.push(`  /* ${name}: ${value}; -- SCSS-only, no custom property */`);
    continue;
  }

  lines.push(`  ${name}: ${value};`);
}
lines.push("}", "");

writeFileSync(OUT, lines.join("\n"), "utf8");

process.stdout.write(`wrote ${OUT} (${tokens.length} tokens from ${BRANCH})\n`);

if (unresolved.length > 0) {
  process.stdout.write(
    `note: ${unresolved.length} token(s) are SCSS-only and were commented out: ` +
      `${unresolved.map((t) => t.name).join(", ")}\n`,
  );
}

if (nonChannelColours.length > 0) {
  process.stdout.write(
    `\nwarning: ${nonChannelColours.length} colour token(s) are not in channel format, so\n` +
      `rgb(var(--name)) does not work for them:\n` +
      nonChannelColours.map((t) => `  ${t.name}: ${t.value}`).join("\n") +
      `\n`,
  );
}
