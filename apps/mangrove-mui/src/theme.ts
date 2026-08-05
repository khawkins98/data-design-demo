/**
 * MUI theme mapped from the UNDRR tokens.
 *
 * MUI's theming is a JavaScript object, not CSS custom properties, so tokens are
 * read from the TypeScript export rather than referenced as `var(--x)`. That is
 * the documented route and it works, but it means the theme is a *copy* of the
 * token values resolved at build time: changing a token requires a rebuild,
 * where a CSS-variable consumer would pick it up at runtime.
 *
 * `cssVariables: true` is deliberately NOT enabled. It makes MUI emit its own
 * `--mui-*` custom properties on a `:root`-level selector, which would place
 * MUI's palette in the same global scope as the host and defeat the point of
 * scoping. See EVIDENCE.md.
 *
 * The theme body below is identical to `apps/delta-mui/src/theme.ts`. That is
 * deliberate and it is a result, not laziness: the token mapping did not change
 * between the two hosts, so everything the Mangrove host cost is isolated in
 * `demo.css`, where it can be counted. See EVIDENCE.md.
 *
 * Mangrove 1.8.1 is NOT themed against here. Its compiled stylesheet declares
 * zero custom properties (docs/host-derivation.md finding 1), so its palette is
 * unreachable at runtime; the Mangrove 2.0 preview tokens were also not used, so
 * the numbers in evidence.json measure `packages/undrr-tokens` only.
 */

import { createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";

import { color, fontFamily, fontSize, radius, space, zIndex } from "@undrr-eval/undrr-tokens";

/** MUI expects unitless px numbers for spacing and radius. */
const remToPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return value.endsWith("rem") ? parsed * 16 : parsed;
};

const options: ThemeOptions = {
  // The token scale is 4px-based; MUI's spacing(n) multiplies this.
  spacing: remToPx(space["1"]),

  shape: {
    borderRadius: remToPx(radius.md),
  },

  typography: {
    fontFamily: fontFamily.sans,
    fontSize: remToPx(fontSize.base),
    h1: { fontFamily: fontFamily.display, fontSize: fontSize["3xl"] },
    h2: { fontFamily: fontFamily.display, fontSize: fontSize["2xl"] },
    h3: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
    h4: { fontFamily: fontFamily.display, fontSize: fontSize.lg },
    button: {
      // MUI uppercases button labels by default, which mangles the German and
      // Arabic fixture labels. Turned off explicitly.
      textTransform: "none",
      fontWeight: 600,
    },
  },

  palette: {
    mode: "light",
    primary: {
      main: color.accent,
      dark: color.accentActive,
      light: color.accentSubtle,
      contrastText: color.onAccent,
    },
    error: { main: color.error, light: color.errorSubtle },
    warning: { main: color.warning, light: color.warningSubtle },
    success: { main: color.success, light: color.successSubtle },
    info: { main: color.info, light: color.infoSubtle },
    text: {
      primary: color.textPrimary,
      secondary: color.textSecondary,
      disabled: color.textDisabled,
    },
    background: {
      default: color.surface,
      paper: color.surface,
    },
    divider: color.border,
  },

  zIndex: {
    // Aligned to the token layers so MUI overlays cannot sit above host chrome
    // by accident. MUI's defaults start at 1000+ and would win regardless of
    // what the host intended.
    appBar: Number(zIndex.header),
    drawer: Number(zIndex.drawer),
    modal: Number(zIndex.modal),
    tooltip: Number(zIndex.tooltip),
    snackbar: Number(zIndex.toast),
  },

  components: {
    // Focus ring: the token palette keeps focus distinct from both accent and
    // error, and MUI has no focus colour of its own to point at.
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": {
            outline: `2px solid ${color.focus}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: color.focus,
            borderWidth: 2,
          },
        },
      },
    },
  },
};

export const undrrMuiTheme = createTheme(options);
