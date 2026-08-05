/**
 * Where Carbon puts its overlays, and what that means for class-scoped tokens.
 *
 * docs/requirements.md warns that a candidate portalling overlays to
 * `document.body` lands them OUTSIDE the `.undrr-tokens` element, where every
 * `var(--undrr-*)` resolves to nothing. This module records what was actually
 * found in Carbon 1.113.0 rather than assuming the warning applies.
 *
 * MEASURED, by grepping `createPortal` across `lib/components/`:
 *
 *   Menu/Menu.js   the ONLY component that portals.
 *
 * Modal, ComposedModal, Tooltip, Toggletip, Popover, Dropdown, ComboBox,
 * MultiSelect and the DataTable overflow menus all render in place in the React
 * tree. So Carbon is largely immune to the trap — not because its theming
 * survives portalling, but because it barely portals.
 *
 * THE ONE EXCEPTION, and it is a real one. Carbon's `DatePicker` is a wrapper
 * around flatpickr, which is not React and manipulates the DOM itself. By
 * default flatpickr appends `.flatpickr-calendar` to `document.body`. Carbon
 * even documents this in the prop:
 *
 *   appendTo?: HTMLElement   "The DOM element the flatpickr should be inserted
 *                             into `<body>` by default."
 *
 * Left at the default, the calendar renders outside the token scope. Because
 * Carbon's theming is `var(--cds-token, <white-theme-literal>)` — a fallback
 * chain, not a bare `var()` — the failure mode is NOT the transparent overlay
 * React Aria produced. The calendar renders in Carbon's stock white theme:
 * IBM grey #f4f4f4 fields, IBM blue #0f62fe selection, square corners. Visible,
 * usable, and silently off-brand, which is arguably harder to catch in review
 * than an invisible one.
 *
 * The fix is to pass `appendTo` a container inside the subtree, which is what
 * `useOverlayHost` supplies. The e2e run opens the calendar and asserts both
 * that it is inside `[data-candidate-root]` and that its background resolves to
 * the UNDRR surface token rather than Carbon's default.
 */

import { useEffect, useRef, useState } from "react";

import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

/**
 * Class for any element that must carry the token declarations itself.
 *
 * Kept even though Carbon does not portal, because `.demo` is where the whole
 * `--cds-*` mapping lives (see demo.css) and an overlay host outside it would
 * inherit nothing.
 */
export const OVERLAY_SCOPE_CLASS = `${TOKEN_SCOPE_CLASS} demo`;

/**
 * A container element inside the candidate subtree for flatpickr to append to.
 *
 * Returns `undefined` on the first render, before the ref is attached. Carbon
 * treats `appendTo: undefined` as "use document.body", so the calendar would be
 * mis-parented if it opened during that first frame — it cannot, because the
 * user has to click, but the state update is there to make the ref value a
 * render input rather than a mutable read.
 */
export function useOverlayHost(): {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly element: HTMLElement | undefined;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [element, setElement] = useState<HTMLElement | undefined>(undefined);

  useEffect(() => {
    if (ref.current) setElement(ref.current);
  }, []);

  return { ref, element };
}
