/**
 * Mantine theme mapped from the UNDRR tokens.
 *
 * Mantine themes through a JavaScript object passed to `createTheme`, which it
 * then serialises into its own `--mantine-*` custom properties at runtime. So
 * the theme is a build-time COPY of the token values, not a live reference:
 * changing a token needs a rebuild, where a `var()`-based consumer would pick it
 * up immediately. The upside is that portalled overlays keep their colours,
 * because by the time the CSS is written the `var(--undrr-*)` lookups have
 * already happened. Same trade as MUI. Verified in e2e, not assumed.
 *
 * THE ONE STRUCTURAL MISMATCH between the token set and Mantine's theme:
 * Mantine requires every colour to be a **ten-shade tuple**, and
 * `theme.primaryColor` must be a KEY of `theme.colors` — a hex string is
 * rejected by `validateMantineTheme`. The UNDRR token set gives four accent
 * stops, six neutrals and one stop per status colour. Ten shades per colour is
 * therefore more than the tokens can supply.
 *
 * The response here is to REPEAT token values rather than interpolate new ones,
 * so that every colour Mantine renders is a value a designer actually chose. The
 * cost is that shades Mantine expects to differ do not: a component reaching for
 * shade 3 gets the same value as shade 2, which flattens some of its hover and
 * press differentiation. Where Mantine genuinely needs a darker step for a
 * status colour that the tokens do not define — filled hover on
 * `color="red"` — the library's own documented `darken()` helper supplies it,
 * which keeps the derivation inside the candidate rather than inside our
 * judgement. Recorded in evidence.json under theming.
 */

import { createTheme, darken } from "@mantine/core";
import type { MantineColorsTuple, MantineThemeOverride } from "@mantine/core";

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

/* ------------------------------------------------------------------ *
 * Colour tuples. Token values only, repeated where Mantine wants more
 * shades than the token set defines.
 * ------------------------------------------------------------------ */

/** Positions 0-9. `base` sits at 6, which is what `primaryShade` points at. */
function tuple(shades: readonly string[]): MantineColorsTuple {
  return shades as unknown as MantineColorsTuple;
}

/**
 * Accent. Every entry is a real token: shades 0-5 are `accentSubtle`, 6 is
 * `accent`, 7 is `accentHover`, 8 and 9 are `accentActive`.
 */
const undrrAccent = tuple([
  color.accentSubtle,
  color.accentSubtle,
  color.accentSubtle,
  color.accentSubtle,
  color.accentSubtle,
  color.accentSubtle,
  color.accent,
  color.accentHover,
  color.accentActive,
  color.accentActive,
]);

/**
 * A status colour from its two tokens. Shades 7 and 8 are the only derived
 * values in this file, produced by Mantine's own `darken()` because a filled
 * button with no hover change reads as broken.
 */
function statusTuple(subtle: string, base: string): MantineColorsTuple {
  return tuple([
    subtle,
    subtle,
    subtle,
    subtle,
    subtle,
    subtle,
    base,
    darken(base, 0.15),
    darken(base, 0.3),
    darken(base, 0.3),
  ]);
}

/**
 * Neutrals. `gray` is OVERRIDDEN rather than added alongside, because Mantine's
 * own defaults reach for it constantly and leaving it at Mantine's grey would
 * have left the neutral half of the page unthemed:
 *
 *   gray-3 -> --table-border-color
 *   gray-4 -> --mantine-color-default-border, i.e. every input border
 *   gray-5 -> --mantine-color-placeholder
 *   gray-6 -> --mantine-color-dimmed, i.e. every `c="dimmed"` Text
 *
 * The mapping is chosen so each of those four lands on the token that means it.
 * An earlier version interpolated an even ramp through the six neutral tokens
 * instead, which put an invented #75838f at shade 6 and produced FIVE serious
 * axe `color-contrast` violations on dimmed text at 3.9:1. Pinning shade 6 to
 * `textSecondary` (7.4:1 on white) removed all five. Worth recording: Mantine's
 * ten-shade requirement turned a token-mapping decision into an accessibility
 * outcome, silently.
 */
const undrrGray = tuple([
  color.canvas,
  color.surfaceSunken,
  color.border,
  color.border,
  color.border,
  color.borderStrong,
  color.textSecondary,
  color.textSecondary,
  color.textPrimary,
  color.textPrimary,
]);

export const undrrMantineTheme: MantineThemeOverride = createTheme({
  /* Mantine derives --mantine-color-text and --mantine-color-body from these. */
  white: color.surface,
  black: color.textPrimary,

  colors: {
    undrr: undrrAccent,
    /* The four status names Mantine's own components default to, remapped so
       `color="red"` on an Alert lands on the token palette rather than
       Mantine's. */
    red: statusTuple(color.errorSubtle, color.error),
    green: statusTuple(color.successSubtle, color.success),
    yellow: statusTuple(color.warningSubtle, color.warning),
    blue: statusTuple(color.infoSubtle, color.info),
    gray: undrrGray,
  },
  primaryColor: "undrr",
  primaryShade: { light: 6, dark: 6 },

  fontFamily: fontFamily.sans,
  fontFamilyMonospace: fontFamily.mono,
  headings: {
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.bold,
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

  fontSizes: {
    xs: fontSize.xs,
    sm: fontSize.sm,
    md: fontSize.base,
    lg: fontSize.lg,
    xl: fontSize.xl,
    /* Extra keys so the display sizes are reachable through `fz` as well. */
    "2xl": fontSize["2xl"],
    "3xl": fontSize["3xl"],
    "4xl": fontSize["4xl"],
  },

  lineHeights: {
    xs: lineHeight.tight,
    sm: lineHeight.snug,
    md: lineHeight.normal,
    lg: lineHeight.normal,
    xl: lineHeight.relaxed,
  },

  fontWeights: {
    regular: fontWeight.regular,
    medium: fontWeight.medium,
    bold: fontWeight.bold,
    /* Mantine's tuple is regular/medium/bold only, so semibold needs an extra
       key. Reachable via `fw="semibold"`. */
    semibold: fontWeight.semibold,
  },

  radius: {
    xs: radius.none,
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.lg,
    pill: radius.pill,
  },
  defaultRadius: "md",

  spacing: {
    xs: space["1"],
    sm: space["2"],
    md: space["4"],
    lg: space["6"],
    xl: space["8"],
    /* The rest of the four-point scale, so `mb="12"` is a token not a guess. */
    "0": space["0"],
    "3": space["3"],
    "5": space["5"],
    "10": space["10"],
    "12": space["12"],
    "16": space["16"],
    "20": space["20"],
  },

  focusRing: "auto",
  cursorType: "pointer",
  respectReducedMotion: true,

  components: {
    /**
     * Mantine has no theme-level z-index scale: its layers live in
     * `--mantine-z-index-*` written by the static stylesheet, which the theme
     * object cannot reach. Per-component `defaultProps` is the only documented
     * route to the token layers, and it only covers the components that expose a
     * `zIndex` prop. The remaining z tokens are unreachable.
     */
    Modal: { defaultProps: { zIndex: Number(zIndex.modal) } },
    Drawer: { defaultProps: { zIndex: Number(zIndex.drawer) } },
    Popover: { defaultProps: { zIndex: Number(zIndex.popover) } },
    Tooltip: { defaultProps: { zIndex: Number(zIndex.tooltip) } },
    Notification: { defaultProps: { zIndex: Number(zIndex.toast) } },
    Overlay: { defaultProps: { zIndex: Number(zIndex.overlay) } },
  },
});
