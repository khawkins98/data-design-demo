/**
 * Class names for portalled overlays.
 *
 * THE PROBLEM THIS SOLVES, which is a finding in its own right.
 *
 * `packages/undrr-tokens` scopes its custom properties to a class rather than
 * `:root`, deliberately: tokens at `:root` would theme the host's canary
 * elements and defeat the leakage assertion.
 *
 * React Aria portals every overlay — Popover, Modal, Tooltip — to a container
 * appended to `document.body`, which is OUTSIDE the token-scoped element. CSS
 * custom properties inherit down the DOM tree, so inside a portal every
 * `var(--undrr-*)` resolves to nothing. The consequences are not subtle:
 *
 *   background: var(--undrr-color-surface)              -> rgba(0,0,0,0)
 *   border: 1px solid var(--undrr-color-border-strong)  -> 0px (whole
 *                                                          declaration voided)
 *   z-index: var(--undrr-z-popover)                     -> React Aria's inline
 *                                                          default of 100000
 *
 * A transparent, borderless calendar rendered over the page content, which is
 * exactly how it looked.
 *
 * The fix is to put the token scope class on each portalled overlay so the
 * properties are declared on the overlay itself and inherit from there. Three
 * lines, but you have to know to do it, and nothing warns you: a failed `var()`
 * is silent.
 *
 * Recorded in EVIDENCE.md and in docs/requirements.md, since every candidate
 * that portals overlays will hit this against class-scoped tokens.
 */

import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

/** Popover-family overlays: Select, ComboBox, DatePicker, Popover. */
export const POPOVER_CLASS = `${TOKEN_SCOPE_CLASS} demo-popover`;

/** Popover with its own padding, for standalone content rather than a listbox. */
export const POPOVER_PADDED_CLASS = `${TOKEN_SCOPE_CLASS} demo-popover demo-popover--padded`;

/** The modal's backdrop, which is also portalled. */
export const MODAL_OVERLAY_CLASS = `${TOKEN_SCOPE_CLASS} demo-modal__overlay`;

/** Tooltips are portalled too, and were rendering with no background. */
export const TOOLTIP_CLASS = `${TOKEN_SCOPE_CLASS} demo-tooltip`;
