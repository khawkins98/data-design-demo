/**
 * Portal props for Mantine's overlays: token scope AND text direction.
 *
 * Two separate problems, both invisible in behavioural tests, both fixed through
 * the one channel `Portal` forwards — `className`.
 *
 * ---------------------------------------------------------------------------
 * PROBLEM 1: class-scoped tokens do not reach a portal.
 *
 * docs/requirements.md predicts that a candidate theming via a JavaScript object
 * is "probably immune" to this. For Mantine that is HALF true, and the half that
 * is false is easy to miss.
 *
 * Mantine does not inline literal values into component CSS. It emits its OWN
 * custom properties — `--mantine-color-body`, `--mantine-color-default-border`,
 * `--mantine-font-family` — from the theme object into a `<style>` tag whose
 * selector defaults to `:root, :host`. That selector is the document root, so
 * Mantine's variables DO reach a portal at `document.body`: the popover has a
 * background, the modal has a border. Verified in e2e.
 *
 * What does not reach it is anything WE write as `var(--undrr-*)`, because
 * `packages/undrr-tokens` scopes its properties to `.undrr-tokens`. In this demo
 * that is one thing, and it is not cosmetic: `theme.focusClassName` points at
 * `.demo-focus`, whose outline is `var(--undrr-color-focus)`. Inside a portal
 * that resolves to nothing, the whole `outline` declaration is voided, and every
 * focusable control inside a modal, popover or date dropdown loses its visible
 * focus indicator — silently, with the component still working.
 *
 * ---------------------------------------------------------------------------
 * PROBLEM 2: `dir` does not reach a portal either, and Mantine cannot pass it.
 *
 * `DirectionProvider` gives Mantine's React components the direction, and the
 * host shell puts `dir="rtl"` on its wrapper div. A portal appended to
 * `document.body` is outside that div, so the browser resolves direction from
 * `<html>` — which the host leaves `ltr`, and which the candidate has no business
 * rewriting. Result: in Arabic, every overlay renders left-to-right while the
 * page around it renders right-to-left. Measured, not assumed:
 * `test-results/rtl-*.json` records the portal's computed direction.
 *
 * `Portal` reads only `target`, `reuseTargetNode`, `className`, `style` and `id`
 * from its props when it builds the container node (`createPortalNode` in
 * `Portal.mjs`) — a `dir` prop is dropped. So the direction has to travel as a
 * class, which is what `demo-portal--rtl` is for.
 *
 * The cost of both fixes together: one hook, called at eight overlay sites.
 * Small, but nothing warns you, and a failed `var()` and a wrong-way modal are
 * both things a component screenshot of the LTR locale will never show.
 */

import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { useDemo } from "./demo-state.js";

export interface PortalProps {
  readonly className: string;
  /**
   * `false` on purpose. By default every Portal in the app shares ONE container
   * node appended to `document.body`, so the first overlay to mount decides that
   * node's className and every later overlay inherits it — including the
   * direction class, which then goes stale on a locale change. Opting out of
   * sharing makes both the token scope and the direction per-overlay.
   */
  readonly reuseTargetNode: false;
}

/** `portalProps` for Modal, Popover and Tooltip. */
export function usePortalProps(): PortalProps {
  const { dir } = useDemo();
  return {
    className: `${TOKEN_SCOPE_CLASS} demo-portal${dir === "rtl" ? " demo-portal--rtl" : ""}`,
    reuseTargetNode: false,
  };
}

/** `comboboxProps` for Select, MultiSelect and Autocomplete. */
export function useComboboxPortalProps(): { readonly portalProps: PortalProps } {
  return { portalProps: usePortalProps() };
}

/** `popoverProps` for DatePickerInput and DateTimePicker. */
export function useDatePopoverProps(): { readonly portalProps: PortalProps } {
  return { portalProps: usePortalProps() };
}
