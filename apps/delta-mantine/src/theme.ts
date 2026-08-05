/**
 * Mantine theme mapped from the UNDRR tokens.
 *
 * Mantine theming has two halves and both are used here, because neither alone
 * reaches the whole token set:
 *
 *   1. `createTheme()` — a JavaScript object, like MUI's. Mantine then emits its
 *      OWN `--mantine-*` custom properties from it, so the token values end up
 *      as literal CSS values in a `<style>` tag at `:root`.
 *   2. `cssVariablesResolver` — a function that adds or overrides individual
 *      `--mantine-*` variables that have no slot on the theme object
 *      (`--mantine-color-text`, `--mantine-color-default-border`, and so on).
 *
 * THE ONE STRUCTURAL MISMATCH, and it is the substance of this run's theming
 * finding: `theme.colors[name]` is typed `MantineColorsTuple`, a **10-shade
 * scale**. The UNDRR token set is semantic, not a scale — it gives one accent,
 * one hover, one active and one subtle tint. There is no honest way to fill ten
 * slots from four values, so `tuple()` below repeats them, and any Mantine
 * component that reaches for a shade nobody designed (`color="undrrAccent.3"`)
 * silently gets a duplicate. `variantColorResolver` pins the variants that
 * matter to exact token values so the visible result is correct, but the scale
 * underneath it is padding. A design system adopting Mantine has to publish a
 * 10-step ramp per colour or accept this.
 *
 * Nothing here reads `var(--undrr-*)`: the token values are imported from the
 * TypeScript export and resolved at build time. That is why Mantine's own
 * styling survives portalling to `document.body`, and equally why a token change
 * needs a rebuild.
 */

import { createTheme, defaultVariantColorsResolver } from "@mantine/core";
import type {
  CSSVariablesResolver,
  MantineColorsTuple,
  VariantColorsResolver,
} from "@mantine/core";

import {
  color,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  space,
  zIndex,
} from "@undrr-eval/undrr-tokens";

/**
 * Builds the 10-shade tuple Mantine's type demands out of the handful of
 * semantic values the token set actually has.
 *
 * `subtle` fills 0-3, `base` fills 4-6, `hover` 7 and `active` 8-9. The
 * distribution is chosen so that `primaryShade: 6` lands on the real accent and
 * Mantine's own hover derivation (shade + 1) lands on the real hover token.
 */
function tuple(subtle: string, base: string, hover: string, active: string): MantineColorsTuple {
  return [subtle, subtle, subtle, subtle, base, base, base, hover, active, active];
}

/** How many of the tuple's ten slots carry a value the token set defines. */
export const DESIGNED_SHADES_PER_TUPLE = 4;

export const undrrMantineTheme = createTheme({
  /* ---------------------------------------------------------------- colours */
  white: color.surface,
  black: color.textPrimary,

  colors: {
    undrrAccent: tuple(color.accentSubtle, color.accent, color.accentHover, color.accentActive),
    undrrError: tuple(color.errorSubtle, color.error, color.error, color.error),
    undrrWarning: tuple(color.warningSubtle, color.warning, color.warning, color.warning),
    undrrSuccess: tuple(color.successSubtle, color.success, color.success, color.success),
    undrrInfo: tuple(color.infoSubtle, color.info, color.info, color.info),
    // Neutral ramp, so `color="undrrNeutral"` reaches the border/surface tokens
    // rather than Mantine's own gray.
    undrrNeutral: tuple(color.surfaceSunken, color.borderStrong, color.textSecondary, color.textPrimary),
  },
  primaryColor: "undrrAccent",
  primaryShade: 6,

  /* -------------------------------------------------------------- typography */
  fontFamily: fontFamily.sans,
  fontFamilyMonospace: fontFamily.mono,

  fontSizes: {
    xs: fontSize.xs,
    sm: fontSize.sm,
    md: fontSize.base,
    lg: fontSize.lg,
    xl: fontSize.xl,
    // Extra keys: Mantine's size scale stops at xl, but the token scale does
    // not, and an unmapped token is an unreachable token.
    "2xl": fontSize["2xl"],
    "3xl": fontSize["3xl"],
    "4xl": fontSize["4xl"],
  },

  lineHeights: {
    xs: lineHeight.tight,
    sm: lineHeight.snug,
    md: lineHeight.normal,
    lg: lineHeight.relaxed,
    xl: lineHeight.relaxed,
  },

  fontWeights: {
    regular: fontWeight.regular,
    medium: fontWeight.medium,
    // `semibold` is not one of Mantine's three documented weight keys; the type
    // permits extra keys, so the token is reachable as --mantine-font-weight-semibold.
    semibold: fontWeight.semibold,
    bold: fontWeight.bold,
  },

  headings: {
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.semibold,
    textWrap: "pretty",
    sizes: {
      h1: { fontSize: fontSize["3xl"], lineHeight: lineHeight.tight },
      h2: { fontSize: fontSize["2xl"], lineHeight: lineHeight.tight },
      h3: { fontSize: fontSize.xl, lineHeight: lineHeight.snug },
      h4: { fontSize: fontSize.lg, lineHeight: lineHeight.snug },
      h5: { fontSize: fontSize.base, lineHeight: lineHeight.normal },
      h6: { fontSize: fontSize.sm, lineHeight: lineHeight.normal },
    },
  },

  /* -------------------------------------------------------- shape and space */
  radius: {
    xs: radius.none,
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.pill,
  },
  defaultRadius: "md",

  spacing: {
    xs: space["2"],
    sm: space["3"],
    md: space["4"],
    lg: space["6"],
    xl: space["8"],
    // The remaining seven steps of the token scale, declared so they are
    // reachable as --mantine-spacing-* and usable as `p="s10"` etc.
    s0: space["0"],
    s1: space["1"],
    s5: space["5"],
    s10: space["10"],
    s12: space["12"],
    s16: space["16"],
    s20: space["20"],
  },

  /* ---------------------------------------------------------------- focus */
  /**
   * Mantine's built-in focus ring is `--mantine-primary-color-filled`, i.e. the
   * accent. The token set keeps focus deliberately distinct from accent, and
   * Mantine has no theme slot for a focus colour, so the ring has to come from
   * a replacement class. `.demo-focus` lives in demo.css.
   */
  focusRing: "auto",
  focusClassName: "demo-focus",

  /**
   * Variant colours pinned to exact token values.
   *
   * Without this, Mantine derives hover and light variants arithmetically from
   * the ten-shade tuple, which for a padded tuple means the hover state can land
   * on the same value as the resting state.
   */
  variantColorResolver: ((input) => {
    const base = defaultVariantColorsResolver(input);

    if (input.color === "undrrAccent" || input.color === undefined) {
      if (input.variant === "filled") {
        return {
          background: color.accent,
          hover: color.accentHover,
          color: color.onAccent,
          border: `1px solid ${color.accent}`,
        };
      }
      if (input.variant === "outline" || input.variant === "default") {
        return {
          background: color.surface,
          hover: color.accentSubtle,
          color: color.accent,
          border: `1px solid ${input.variant === "outline" ? color.accent : color.border}`,
        };
      }
      if (input.variant === "light" || input.variant === "subtle") {
        return {
          background: input.variant === "light" ? color.accentSubtle : "transparent",
          hover: color.accentSubtle,
          color: color.accentActive,
          border: "1px solid transparent",
        };
      }
    }

    if (input.color === "undrrError" && input.variant === "filled") {
      return {
        background: color.error,
        hover: color.error,
        color: color.textInverse,
        border: `1px solid ${color.error}`,
      };
    }

    return base;
  }) satisfies VariantColorsResolver,

  /* ------------------------------------------------------------- z-index */
  /**
   * Mantine has NO theme-level z-index scale. Each overlay component takes its
   * own `zIndex` prop, so the token layers are applied as component defaultProps
   * instead. Five of the ten z-index tokens (base, raised, sticky, header,
   * toast) have no Mantine consumer at all and are recorded as unreachable.
   */
  components: {
    Modal: { defaultProps: { zIndex: Number(zIndex.modal) } },
    Drawer: { defaultProps: { zIndex: Number(zIndex.drawer) } },
    Popover: { defaultProps: { zIndex: Number(zIndex.popover) } },
    Tooltip: { defaultProps: { zIndex: Number(zIndex.tooltip) } },
    Overlay: { defaultProps: { zIndex: Number(zIndex.overlay) } },
    Combobox: { defaultProps: { zIndex: Number(zIndex.popover) } },

    // Table's striping, hover and border colours are props rather than theme
    // slots, so `canvas` and `accentSubtle` are only reachable through
    // defaultProps. Without this the 250-row table stripes in Mantine's own gray.
    Table: {
      defaultProps: {
        stripedColor: color.canvas,
        highlightOnHoverColor: color.accentSubtle,
        borderColor: color.border,
      },
    },
  },

  other: {
    /** Kept on the theme so sections can reach the raw token without re-importing. */
    tokenFocus: color.focus,
  },
});

/**
 * Variables with no slot on the theme object.
 *
 * This is where Mantine is genuinely deeper than a pure JS-object theme: text,
 * dimmed text, placeholder, borders, body background and the "default" surface
 * are all plain custom properties, so they can be pointed straight at tokens.
 *
 * THE TRAP, AND IT FAILS SILENTLY. `cssVariablesResolver` returns three buckets,
 * and Mantine writes them at three different selectors:
 *
 *   variables -> :root, :host
 *   light     -> :root[data-mantine-color-scheme="light"]
 *   dark      -> :root[data-mantine-color-scheme="dark"]
 *
 * Every one of the variables below is ALSO declared by Mantine's own
 * `default-css-variables.css`, inside its light and dark scheme blocks. Those
 * selectors carry an attribute (specificity 0,1,1); the `variables` bucket does
 * not (0,1,0). So an override placed in `variables` LOSES to Mantine's default,
 * regardless of stylesheet order.
 *
 * That is exactly what happened on the first pass of this demo, and nothing
 * warned: the build succeeded, the theme "applied", and axe found `#868e96` for
 * dimmed text and `#fa5252` for error text — Mantine's gray-6 and red-6, not the
 * UNDRR tokens. The failure was only visible because axe measured contrast on
 * values that should never have been on the page.
 *
 * So every scheme-dependent variable goes in BOTH scheme buckets. Recorded in
 * evidence.json as an escape hatch, because getting this wrong is a theming
 * result that looks like a success.
 */
const SCHEME_VARIABLES = {
  "--mantine-color-text": color.textPrimary,
  "--mantine-color-dimmed": color.textSecondary,
  "--mantine-color-placeholder": color.textSecondary,
  "--mantine-color-bright": color.textPrimary,
  "--mantine-color-disabled": color.surfaceSunken,
  "--mantine-color-disabled-color": color.textDisabled,
  "--mantine-color-disabled-border": color.border,
  "--mantine-color-default": color.surfaceRaised,
  "--mantine-color-default-hover": color.surfaceSunken,
  "--mantine-color-default-border": color.border,
  "--mantine-color-default-color": color.textPrimary,
  "--mantine-color-anchor": color.accent,
  "--mantine-color-error": color.error,
  // The host owns the page background; this is only read by Mantine surfaces
  // inside the candidate subtree, and by portalled overlays.
  "--mantine-color-body": color.surface,
} as const;

export const undrrCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { ...SCHEME_VARIABLES },
  dark: { ...SCHEME_VARIABLES },
});

/** Count of token values this theme places into Mantine's generated CSS. */
export const TOKENS_APPLIED = 66;

/** Tokens with no Mantine consumer: z-index base, raised, sticky, header, toast. */
export const TOKENS_UNREACHABLE = 5;
