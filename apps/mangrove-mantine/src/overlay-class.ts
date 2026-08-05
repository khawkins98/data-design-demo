/**
 * Class names for Mantine's portalled overlays.
 *
 * Mantine portals Modal, Popover, Tooltip and every combobox/date dropdown to a
 * container appended to `document.body`, which is OUTSIDE the `.undrr-tokens`
 * element and outside `.demo`. Two consequences, and only one of them bites:
 *
 *   1. `var(--undrr-*)` inside a portal resolves to nothing. This is what left
 *      the react-aria run with transparent popovers. Mantine is largely immune
 *      because its own colours are `--mantine-*` values written at :root by the
 *      theme, not `var(--undrr-*)` lookups — but VERIFY, do not assume:
 *      e2e/demo.spec.ts checks the computed background-color of every overlay
 *      type. Anything WE style with a token inside a portal still needs the
 *      scope class, which is what `TOKEN_SCOPE_CLASS` below provides.
 *
 *   2. Our own `.demo`-scoped rules do not apply inside a portal either. That
 *      includes the scoped baseline reset and the token focus ring, so the
 *      overlay class doubles as the hook those rules need.
 */

import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

/** Applied to every portalled Mantine surface. Mirrors `.demo` in demo.css. */
export const OVERLAY_CLASS = `${TOKEN_SCOPE_CLASS} demo-overlay`;
