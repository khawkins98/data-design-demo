/**
 * Keep the existing app-local import surface while using the same context and
 * state helpers as the shared records capability. Delta-only utility strings
 * remain here because they describe this host rather than the shared React Aria
 * integration.
 */
export * from "@undrr-eval/integration-react-aria";

/**
 * Delta's own utility-class strings, reused verbatim so candidate chrome is
 * indistinguishable from host chrome.
 *
 * These are copied from `packages/host-delta/src/HostShell.tsx` rather than
 * written fresh, because of a hard constraint on this host: `host-delta.src.css`
 * declares `@source "./HostShell.tsx"`, so Tailwind emits ONLY the 75 utilities
 * the host shell itself uses. An app-level Tailwind class that the host does
 * not already use produces no CSS at all — silently, with no build error.
 *
 * That is not a candidate finding, it is a property of consuming a prebuilt
 * host stylesheet, and it is recorded in EVIDENCE.md because it bounds how far
 * "style it with Tailwind like Delta does" can go in any of the four Delta
 * pairings.
 */
export const DELTA_CARD_CLASS = "rounded border border-slate-300 bg-white p-4 shadow-sm";
export const DELTA_CARD_TITLE_CLASS = "font-semibold text-slate-900";
export const DELTA_CARD_BODY_CLASS = "mt-1 text-sm text-slate-600";
export const DELTA_BUTTON_BASE_CLASS =
  "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-semibold " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
export const DELTA_NAV_LINK_CLASS =
  "block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline " +
  "hover:border-sky-800 hover:bg-sky-50";
