/**
 * Shared UNDRR/project design tokens for the evaluation.
 *
 * They exist as a fixed target so that "how deep could you theme this library"
 * is answerable and comparable across the demos. A candidate that can reach
 * every token scores differently from one that can only reach colour.
 *
 * The interactive family follows Mangrove's published UNDRR palette. Keeping
 * these values in the project-owned layer lets DELTA or another product replace
 * the palette without changing the semantic contract consumed by components.
 */

export const TOKEN_SCOPE_CLASS = "undrr-tokens";

/** CSS custom property prefix, matching TOKEN_SCOPE_CLASS. */
export const TOKEN_PREFIX = "--undrr";

export const color = Object.freeze({
  /** Page and surface backgrounds. */
  canvas: "#f4f6f8",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceSunken: "#e9edf1",

  /** Text. */
  textPrimary: "#14232e",
  textSecondary: "#4a5c69",
  textInverse: "#ffffff",
  textDisabled: "#8b9aa5",

  /** Borders and dividers. */
  border: "#c8d2da",
  borderStrong: "#8b9aa5",

  /** UNDRR interactive blue family: Mangrove blue 900, 700, 800 and 50. */
  accent: "#004f91",
  accentHover: "#3372a7",
  accentActive: "#1a619c",
  accentSubtle: "#e6edf4",
  onAccent: "#ffffff",

  /** Focus ring. Kept distinct from accent so focus is never ambiguous. */
  focus: "#b8531f",
  focusRingOffset: "#ffffff",

  /** Status. Error is separate from focus so both can be tested independently. */
  error: "#a11f2c",
  errorSubtle: "#fbe9eb",
  warning: "#8a6100",
  warningSubtle: "#fdf3dc",
  success: "#1f6b45",
  successSubtle: "#e4f2ea",
  info: "#004f91",
  infoSubtle: "#e6edf4",
});

/** Spacing scale in rem. Four-point base, so 1 = 4px at a 16px root. */
export const space = Object.freeze({
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
});

export const radius = Object.freeze({
  none: "0",
  sm: "2px",
  md: "4px",
  lg: "8px",
  pill: "999px",
});

/**
 * Type scale. Deliberately not a 1.25 modular scale, so a library substituting
 * its own defaults is visible rather than plausible.
 */
export const fontSize = Object.freeze({
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.375rem",
  "2xl": "1.75rem",
  "3xl": "2.25rem",
  "4xl": "3rem",
});

export const lineHeight = Object.freeze({
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.7",
});

export const fontWeight = Object.freeze({
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
});

export const fontFamily = Object.freeze({
  /** Body stack. Arabic fallbacks included so the RTL locale is not left to chance. */
  sans: '"Roboto", "Noto Sans Arabic", "Segoe UI", system-ui, -apple-system, sans-serif',
  /** Display stack, matching Mangrove's use of a condensed face for headings. */
  display: '"Roboto Condensed", "Noto Sans Arabic", "Segoe UI", system-ui, sans-serif',
  mono: '"Roboto Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
});

/**
 * Z-index layers.
 *
 * Included because overlay ordering is where host and candidate most often
 * collide: a library that hard-codes z-index: 1300 will sit above the host
 * header whatever the host intended.
 */
export const zIndex = Object.freeze({
  base: "0",
  raised: "10",
  sticky: "100",
  header: "200",
  drawer: "300",
  overlay: "400",
  modal: "500",
  popover: "600",
  tooltip: "700",
  toast: "800",
});

export const tokens = Object.freeze({
  color,
  space,
  radius,
  fontSize,
  lineHeight,
  fontWeight,
  fontFamily,
  zIndex,
});

export type Tokens = typeof tokens;

type TokenGroup = Readonly<Record<string, string>>;

const GROUP_PREFIXES: ReadonlyArray<readonly [string, TokenGroup]> = [
  ["color", color],
  ["space", space],
  ["radius", radius],
  ["font-size", fontSize],
  ["line-height", lineHeight],
  ["font-weight", fontWeight],
  ["font-family", fontFamily],
  ["z", zIndex],
];

/** Converts camelCase token names to the kebab-case used in CSS. */
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * The full custom-property name for a token, e.g.
 * `cssVarName("color", "accent")` gives `--undrr-color-accent`.
 */
export function cssVarName(group: string, name: string): string {
  return `${TOKEN_PREFIX}-${group}-${kebab(name)}`;
}

/**
 * Every token as a flat map of custom property name to value.
 *
 * The test harness uses this to count how many tokens a candidate actually
 * applied, which is what `theming.tokensApplied` in evidence.json reports.
 */
export function tokensAsCssVars(): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [groupName, group] of GROUP_PREFIXES) {
    for (const [name, value] of Object.entries(group)) {
      out[cssVarName(groupName, name)] = value;
    }
  }
  return Object.freeze(out);
}

/** Total number of tokens, the denominator for theming depth. */
export const TOKEN_COUNT = Object.keys(tokensAsCssVars()).length;
