/**
 * Delta host shell.
 *
 * Consumers import the compiled stylesheet:
 *
 *   import "@undrr-eval/host-delta/host.css";
 *
 * That file is built from host-delta.src.css by Tailwind and includes
 * Preflight, Tailwind's global reset. Preflight is part of Delta's real styling
 * environment and is intentionally present: it is the most likely source of
 * collisions with a candidate library's own base styles.
 */

export { HostShell, CANARY_IDS } from "./HostShell.js";
export type { HostShellProps } from "./HostShell.js";

/** Identifies which host a demo was built against, for evidence.json. */
export const HOST_NAME = "delta" as const;

/** Tailwind major version this shell reproduces, matching Delta's own. */
export const TAILWIND_VERSION = "4" as const;
