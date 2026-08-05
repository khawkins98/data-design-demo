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

export { HostShell, CANARY_IDS } from "./HostShell.js";
export type { HostShellProps } from "./HostShell.js";

/** Identifies which host a demo was built against, for evidence.json. */
export const HOST_NAME = "mangrove" as const;

/** Pinned so every demo renders against the same design system build. */
export const MANGROVE_VERSION = "1.8.1" as const;
