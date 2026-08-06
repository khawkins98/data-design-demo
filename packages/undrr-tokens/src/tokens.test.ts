/**
 * The important test here is CSS/TS parity.
 *
 * The brief requires the tokens to exist in both forms with the same values.
 * Nothing stops someone tweaking a hex code in one file and not the other, and
 * the resulting drift would be invisible until eight demos had already been
 * themed against inconsistent targets. So: fail loudly instead.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  TOKEN_COUNT,
  TOKEN_PREFIX,
  TOKEN_SCOPE_CLASS,
  color,
  cssVarName,
  tokens,
  tokensAsCssVars,
  zIndex,
} from "./index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, "tokens.css"), "utf8");

/** Parses `--name: value;` declarations out of the generated stylesheet. */
function parseCssVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*$/gim)) {
    const [, name, value] = match;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

describe("tokens.css and tokens.ts parity", () => {
  const fromCss = parseCssVars(CSS);
  const fromTs = tokensAsCssVars();

  it("declares the same token names in both files", () => {
    expect(Object.keys(fromCss).sort()).toEqual(Object.keys(fromTs).sort());
  });

  it("declares the same value for every token", () => {
    // Compared as whole objects so a mismatch names every offender at once.
    expect(fromCss).toEqual(fromTs);
  });

  it("reports a token count matching what it emits", () => {
    expect(TOKEN_COUNT).toBe(Object.keys(fromCss).length);
    expect(TOKEN_COUNT).toBeGreaterThan(50);
  });
});

describe("scoping", () => {
  it("scopes tokens to a class, never to :root", () => {
    expect(CSS).toContain(`.${TOKEN_SCOPE_CLASS} {`);
    // A :root block would theme the host canary elements and break the whole
    // premise of the leakage assertion.
    expect(CSS).not.toMatch(/(^|\})\s*:root\s*\{/);
  });

  it("prefixes every custom property consistently", () => {
    for (const name of Object.keys(tokensAsCssVars())) {
      expect(name.startsWith(`${TOKEN_PREFIX}-`), name).toBe(true);
    }
  });
});

describe("token coverage required by the brief", () => {
  it("covers every required group", () => {
    expect(Object.keys(tokens).sort()).toEqual([
      "color",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "radius",
      "space",
      "zIndex",
    ]);
  });

  it("includes distinct focus and error colours", () => {
    expect(color.focus).toBeTruthy();
    expect(color.error).toBeTruthy();
    // If these were equal, a demo could satisfy "focus is themed" by accident.
    expect(color.focus).not.toBe(color.error);
    expect(color.focus).not.toBe(color.accent);
  });

  it("orders z-index layers so overlays sit above chrome", () => {
    const n = (v: string) => Number.parseInt(v, 10);
    expect(n(zIndex.modal)).toBeGreaterThan(n(zIndex.header));
    expect(n(zIndex.tooltip)).toBeGreaterThan(n(zIndex.modal));
    expect(n(zIndex.toast)).toBeGreaterThan(n(zIndex.tooltip));
  });

  it("names an Arabic face explicitly in every text stack", () => {
    // The RTL locale must not silently fall back to a system default that renders
    // Arabic differently on each runner.
    //
    // THIS ASSERTION USED TO PROVE NOTHING. It was written as
    //   expect(stack).toMatch(/noto sans arabic|system-ui|ui-monospace/)
    // over every stack including `mono`. Since `sans` and `display` both end in
    // `system-ui` and `mono` contains `ui-monospace`, deleting "Noto Sans Arabic"
    // from every stack left it green - the exact failure its own comment named. The
    // alternation was doing the opposite of its stated job.
    //
    // `mono` is exempt deliberately and by name, not by a regex branch that
    // happens to match it: Arabic is not rendered in the monospace stack anywhere
    // in these demos, and no monospace face here carries Arabic coverage. If that
    // changes, this test should be the thing that notices.
    for (const key of ["sans", "display"] as const) {
      expect(tokens.fontFamily[key].toLowerCase(), `${key} stack`).toContain(
        "noto sans arabic",
      );
    }
    expect(Object.keys(tokens.fontFamily).sort()).toEqual(["display", "mono", "sans"]);
  });
});

describe("cssVarName", () => {
  it("kebab-cases camelCase token names", () => {
    expect(cssVarName("color", "textPrimary")).toBe("--undrr-color-text-primary");
    expect(cssVarName("color", "accent")).toBe("--undrr-color-accent");
  });

  it("leaves already-kebab and numeric names alone", () => {
    expect(cssVarName("space", "4")).toBe("--undrr-space-4");
    expect(cssVarName("font-size", "2xl")).toBe("--undrr-font-size-2xl");
  });
});
