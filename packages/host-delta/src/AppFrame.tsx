/**
 * Delta application frame: the candidate owns the viewport.
 *
 * The mirror image of the Mangrove island. There, the candidate is a guest in
 * someone else's page; here it carries a whole DELTA screen - application shell,
 * sidebar navigation, toolbar, data table, detail panel, modal flow. That is the
 * realistic DELTA case, and it asks a question no kitchen sink asks: does the
 * library carry LAYOUT AND NAVIGATION, or only form controls? Expect the
 * candidates to diverge here more than anywhere else, because a component
 * inventory rewards breadth while a whole screen rewards composition.
 *
 * Modelled on the real DELTA records screen (`app/frontend/disaster-event/
 * DisasterEventsPage.tsx`, 935 lines): page header with summary text, a
 * collapsible filter card, a data table with row-action icon buttons and status
 * pills, pagination, and a delete confirmation dialog.
 *
 * WHY THIS FRAME CARRIES `mg-` CLASSES. Measured against a DELTA checkout, real
 * DELTA is not "Tailwind instead of Mangrove" - it is both, in the same markup:
 * `mg-button` 72 times, `mg-grid` 68, `mg-container` 14, plus local `dts-*`
 * classes, with `app/frontend/container.tsx` wrapping every page in
 * `mg-container`. `HostShell` models Delta as Tailwind-only, which is a
 * simplification in the candidates' favour, because no demo has to survive both
 * cascades at once. This frame closes that gap: the toolbar deliberately mixes
 * Tailwind utilities with a real `mg-button`, so a candidate's own base styles
 * meet Mangrove specificity and Tailwind Preflight together. See
 * docs/host-derivation.md.
 *
 * LEAKAGE IS MEASURED DIFFERENTLY HERE, and honestly so. When the candidate owns
 * the viewport there is almost no host markup left to leak onto, so a clean
 * leakage result from this view would mean less than the same result from the
 * kitchen sink - not because the candidate improved, but because the target
 * shrank. The frame therefore keeps a host strip below the application region:
 * enough host markup for the existing assertion to remain meaningful, positioned
 * where a real DELTA page would carry footer content. Read this view for layout
 * coverage; read the kitchen sink and the island for leakage.
 *
 * Import only, on the same terms as `HostShell`.
 */

import type { ReactElement, ReactNode } from "react";

import { DELTA_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

import { HostCanaries } from "./HostShell.js";

export interface AppFrameProps {
  /** Application title, rendered in the frame's toolbar. */
  readonly title: string;
  /** The candidate library's subtree. It owns the whole application region. */
  readonly children: ReactNode;
  /** Document direction, driven by the demo's locale switcher. */
  readonly dir?: "ltr" | "rtl";
}

/**
 * Sidebar destinations, taken from DELTA's own menu structure. Host chrome, so
 * English in every locale.
 */
const SIDEBAR_ITEMS = [
  { href: "#events", label: "Disaster events" },
  { href: "#records", label: "Loss records" },
  { href: "#approvals", label: "Approvals" },
  { href: "#organizations", label: "Organizations" },
  { href: "#settings", label: "Settings" },
];

export function AppFrame({ title, children, dir = "ltr" }: AppFrameProps): ReactElement {
  return (
    <div dir={dir} className="min-h-screen bg-slate-50 text-slate-900">
      {/*
       * Application toolbar. Tailwind utilities for layout, a real `mg-button`
       * for the action - the mixture DELTA actually ships.
       */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 bg-white px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-bold uppercase tracking-widest text-sky-800">UNDRR</span>
          {/*
           * Carries `heading-1` because `HostShell` puts that canary on its own
           * page title, not inside the canary block. Without it this frame would
           * render 13 of the contract's 14.
           */}
          <h1 data-canary="heading-1" className="text-lg font-semibold">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/*
           * A genuine Mangrove button inside a Tailwind page. This is the
           * coexistence real DELTA imposes and no other demo view tests.
           */}
          <button
            type="button"
            className="mg-button mg-button-primary mg-button--small"
            data-frame-canary="frame-mangrove-in-delta"
          >
            New record
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            data-frame-canary="frame-toolbar-button"
          >
            Export
          </button>
        </div>
      </header>

      <div className="grid items-start md:grid-cols-[14rem_minmax(0,1fr)]">
        {/*
         * Carries the existing `nav` / `nav-link` canaries rather than frame-
         * specific duplicates: this IS the host navigation, and `HostShell`
         * renders its own nav outside the canary block for the same reason.
         */}
        <nav
          data-canary="nav"
          className="border-e border-slate-300 bg-white p-3 md:min-h-[calc(100vh-3.5rem)]"
          aria-label="Application"
        >
          <ul>
            {SIDEBAR_ITEMS.map((item, index) => (
              <li key={item.href} className="mt-1 first:mt-0">
                <a
                  className="block rounded border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline hover:border-sky-800 hover:bg-sky-50"
                  href={item.href}
                  {...(index === 0 ? { "data-canary": "nav-link" } : {})}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/*
         * `mg-container` because that is what DELTA wraps every page in. The
         * candidate owns everything inside the application region.
         */}
        <main className="mg-container min-w-0 p-6">
          <p className="mb-4 max-w-prose text-sm text-slate-600" data-frame-canary="frame-prose-before">
            Everything below this line is rendered by the candidate library: the
            page header, filters, table, pagination and dialogs. The toolbar and
            sidebar above are host chrome.
          </p>

          {/* The candidate library renders here, and nowhere else. */}
          <section className="min-w-0" data-candidate-root="">
            {children}
          </section>

          {/*
           * The host strip. Retained so the leakage assertion still has host
           * markup to compare, in the position a real DELTA page carries footer
           * content. See the note at the top of this file about why leakage from
           * this view reads differently.
           */}
          <div className="mt-10 border-t-2 border-dashed border-slate-300 pt-8">
            <p className="mb-6 max-w-prose text-sm text-slate-600" data-frame-canary="frame-prose-after">
              Host reference markup resumes here, so leakage remains measurable in
              a layout the candidate otherwise owns entirely.
            </p>
            <HostCanaries />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Re-exported so demos can assert they rendered every frame canary. */
export { DELTA_FRAME_CANARY_IDS };
