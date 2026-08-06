/**
 * Ant Design theme mapped from the UNDRR tokens.
 *
 * antd's theming is a JavaScript object handed to `ConfigProvider`, like MUI's,
 * so the same caveat applies: the values below are a *copy* of the token values
 * resolved when this module is bundled, not live references. Changing a token
 * means rebuilding every consuming site. That is recorded under axis A5 and is
 * not a defect, but it is the opposite trade from Carbon and React Aria, which
 * consume `var(--undrr-*)` and follow a token change with no rebuild at all.
 *
 * antd v6 does have a CSS-variable mode (`cssVar` on the theme config) which
 * would change that answer. It is deliberately NOT enabled here for the same
 * reason MUI's `cssVariables` is not: it emits antd's own custom properties on a
 * `:root`-level selector, putting antd's palette in the same global scope as the
 * host and defeating the containment this evaluation measures. The trade is
 * recorded rather than silently taken - see EVIDENCE.md.
 *
 * Only seed tokens verified against antd 6.5.3's own
 * `theme/interface/seeds.d.ts` are set. antd derives roughly 100 alias tokens
 * from these, which is why 71 UNDRR tokens map onto far fewer antd inputs
 * without loss: setting `colorPrimary` produces the hover, active, border and
 * background variants that MUI and Mantine each need told separately.
 */

import type { ThemeConfig } from "antd";

import {
  color,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  space,
  zIndex,
} from "@undrr-eval/undrr-tokens";

/** antd expects unitless px numbers where the tokens carry rem strings. */
const px = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return value.endsWith("rem") ? Math.round(parsed * 16) : parsed;
};

/**
 * Seed tokens. antd computes its alias tokens from these, so this is the whole
 * palette contract rather than a starting point to be overridden per component.
 */
export const undrrAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: color.accent,
    colorLink: color.accent,
    colorError: color.error,
    colorWarning: color.warning,
    colorSuccess: color.success,
    colorInfo: color.info,
    colorTextBase: color.textPrimary,
    colorBgBase: color.surface,

    /*
     * A FINDING, not a tidy-up. antd derives its secondary, description,
     * placeholder and label colours from `colorTextBase` by lowering opacity, and
     * that derivation produced FOUR axe colour-contrast failures from a palette
     * whose own secondary text passes at 7.3:1. So "set colorPrimary and
     * colorTextBase, and everything follows" is true for hue and false for
     * contrast: the derived greys have to be pinned back to the token values by
     * hand. `colorTextSecondary` and `colorTextTertiary` are not in antd's alias
     * interface at all and cannot be set by name, which is why the reachable ones
     * are set here and the rest are handled per component below.
     */
    colorTextDescription: color.textSecondary,
    colorTextPlaceholder: color.textSecondary,
    colorTextHeading: color.textPrimary,
    colorTextLabel: color.textSecondary,

    borderRadius: px(radius.md),
    colorBorder: color.border,
    lineWidth: 1,
    lineType: "solid",

    fontFamily: fontFamily.sans,
    fontSize: px(fontSize.base),

    // The 4px token step is antd's `sizeUnit`; `controlHeight` then drives every
    // input, button and select height from one number.
    sizeUnit: px(space["1"]),
    sizeStep: px(space["1"]),
    controlHeight: 40,

    // The z-index tokens are strings; antd wants numbers.
    zIndexBase: Number(zIndex.base),
    zIndexPopupBase: Number(zIndex.popover),

    // antd's default is a "wireframe: false" filled look; the UNDRR tokens are a
    // flat bordered system, so borders are drawn rather than implied by shadow.
    wireframe: false,
  },
  components: {
    // Headings take the display face. antd has no seed token for this, so it is
    // set per component - one of the few places the seed layer is not enough.
    Typography: {
      fontFamilyCode: fontFamily.mono,
      titleMarginBottom: `${px(space["3"])}px`,
      titleMarginTop: "0",
    },
    Table: {
      headerBg: color.surfaceSunken,
      rowHoverBg: color.accentSubtle,
      borderColor: color.border,
    },
    Menu: {
      // antd's derived selected-item colour did not reach 4.5:1 against its own
      // selected background. Both are pinned to tokens instead.
      itemSelectedColor: color.textPrimary,
      itemSelectedBg: color.accentSubtle,
      itemHoverColor: color.textPrimary,
    },
    Card: {
      // Both hosts draw flat bordered cards; antd ships a shadowed one.
      headerBg: "transparent",
      boxShadowTertiary: "none",
    },
    Layout: {
      bodyBg: "transparent",
      headerBg: color.surfaceSunken,
    },
  },
  // `cssVar` is deliberately not enabled - see the note at the top of this file.
  // antd 6.5.3 types it as an object rather than a boolean, so it is omitted
  // entirely instead of being set to false.
  hashed: true,
};

/**
 * Line height is applied through a plain style rather than a token: antd derives
 * `lineHeight` from `fontSize` and exposes no seed token for it, so this is the
 * documented way to reach it. Exported so both apps apply it identically.
 */
export const CANDIDATE_BASE_STYLE = {
  lineHeight: lineHeight.normal,
} as const;
