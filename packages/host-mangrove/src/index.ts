/**
 * Mangrove host shell.
 *
 * Consumers must import both stylesheets, in this order:
 *
 *   import "@undrr/undrr-mangrove/css/style.css";
 *   import "@undrr-eval/host-mangrove/host.css";
 *
 * The design system's sheet comes first so our layout supplement can sit on top
 * of it. Note that Mangrove is imported by an explicit deep path: its
 * package.json declares `main: dist/index.js`, but the published tarball ships
 * no dist directory, so a bare import does not resolve. See
 * docs/host-derivation.md.
 */

export { HostShell, HostCanaries, CANARY_IDS } from "./HostShell.js";
export type { HostShellProps } from "./HostShell.js";

/**
 * The realistic island layout: a believable UNDRR page with the candidate owning
 * one embedded region. Derived from the real published page frame; see
 * IslandFrame.tsx.
 */
export { IslandFrame, MANGROVE_FRAME_CANARY_IDS } from "./IslandFrame.js";
export type { IslandFrameProps } from "./IslandFrame.js";

/** Cross-view navigation. Pass through a frame's `notices` slot. */
export { ViewSwitcher } from "./ViewSwitcher.js";
export type { ViewSwitcherProps } from "./ViewSwitcher.js";

/** Identifies which host a demo was built against, for evidence.json. */
export const HOST_NAME = "mangrove" as const;

/** Pinned so every demo renders against the same design system build. */
export const MANGROVE_VERSION = "1.8.1" as const;

/**
 * Mangrove 2.0 replaces SCSS variable theming with CSS custom properties. It is
 * unlanded and unpublished, so the stylesheet above is still 1.8.1, but the
 * forthcoming token API is available for theming work:
 *
 *   import "@undrr-eval/host-mangrove/mangrove-2-preview.css";
 *
 * Colours are space-separated RGB channels, so consume them as
 * `rgb(var(--mg-color-interactive))`, with alpha as
 * `rgb(var(--mg-color-interactive) / 0.1)`. Assigning a raw token to a colour
 * property yields an invalid value and fails silently.
 *
 * Ten colour tokens are hex or named colours rather than channels and do not
 * work with that pattern. See docs/host-derivation.md.
 */
export const MANGROVE_2_PREVIEW = Object.freeze({
  available: true,
  sourceBranch: "css-custom-properties-pilot",
  /** Colour tokens that break the rgb(var(--x)) pattern. */
  nonChannelColourTokens: [
    "--mg-color-green",
    "--mg-color-green-light",
    "--mg-color-green-dark",
    "--mg-color-yellow",
    "--mg-color-yellow-light",
    "--mg-color-yellow-dark",
    "--mg-color-azure",
    "--mg-color-azure-dark",
    "--mg-color-azure-light",
    "--mg-color-ebony-clay",
  ],
});
