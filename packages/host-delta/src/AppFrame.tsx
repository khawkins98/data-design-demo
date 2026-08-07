/**
 * Delta application frame: the candidate owns the viewport.
 *
 * The mirror image of the Mangrove island. There, the candidate is a guest in
 * someone else's page; here it carries a whole DELTA screen - application chrome,
 * page header, filters, data table, modal flow. That is the realistic DELTA case,
 * and it asks a question no kitchen sink asks: does the library carry LAYOUT AND
 * NAVIGATION, or only form controls? Expect the candidates to diverge here more
 * than anywhere else, because a component inventory rewards breadth while a whole
 * screen rewards composition.
 *
 * THE CHROME IS REBUILT FROM DELTA'S OWN MENU BAR AND FROM THE DLDTS DESIGN FILE,
 * because the first version did not read as DELTA to anyone who uses DELTA. It had
 * a UNDRR wordmark and a left-hand sidebar of section links. Real DELTA has
 * NEITHER: `app/components/RegularMenuBar.tsx` puts everything in one horizontal
 * bar - a `DELTA` / `Resilience` lockup, a divider, the current site, then
 * uppercase top-level items (`DATA`, `ANALYSIS`, `ABOUT`, `SETTINGS`) each opening
 * a submenu, then an avatar - and `app/frontend/container.tsx` wraps every page
 * body in `mg-container` with the title in a `dts-page-header` block. A sidebar is
 * not a small liberty: it changes how much horizontal room the candidate gets, and
 * therefore what its tables and filter rows have to survive.
 *
 * WHERE THIS FOLLOWS THE DESIGN FILE OVER THE SHIPPED CODE, and it is worth being
 * precise about which is which. Shipped DELTA renders a `Site` label above the site
 * name. The DLDTS screens replace that with a country switcher - flag, country,
 * an `OFFICIAL` badge, a disclosure caret - and add an icon plus a caret to each
 * nav item with an underline under the active one. This frame follows the design
 * file, because the evaluation is choosing a library for what DELTA is becoming.
 *
 * NO PRIMEREACT, WHICH COSTS SOMETHING HERE. Real DELTA composes that bar from
 * PrimeReact's `Menubar`, `Avatar` and `Divider`, and PrimeReact is deliberately
 * absent from this evaluation - it is the incumbent being replaced, and its
 * presence would prejudge the comparison. So the bar is reproduced with Tailwind
 * utilities and inline SVG. What that loses is PrimeReact's own cascade: a
 * candidate that would have collided with `p-menubar` will not collide with
 * anything here. Recorded in docs/host-derivation.md rather than papered over.
 *
 * WHY THIS FRAME CARRIES `mg-` CLASSES, AND WHAT THAT CURRENTLY DOES NOT PROVE.
 *
 * Measured against a DELTA checkout, real DELTA is not "Tailwind instead of
 * Mangrove" - it is both, in the same markup: `mg-button` 33 files, `mg-grid`,
 * `mg-container`, plus local `dts-*` classes, with `app/frontend/container.tsx`
 * wrapping every page in `mg-container`. So this frame carries those class names,
 * because markup a reviewer holds against DELTA's own should be the same shape.
 *
 * THE CLASSES ARE INERT ON THIS HOST, AND THIS FILE USED TO CLAIM OTHERWISE. It
 * said the frame made "a candidate's own base styles meet Mangrove specificity and
 * Tailwind Preflight together". They do not meet anything. Measured in the built
 * page: ZERO `.mg-button` rules are loaded, and both `mg-button` elements compute
 * to `background: rgba(0,0,0,0)`, `border-width: 0px`, `padding: 0px` - Preflight's
 * reset and nothing else. The Delta host loads its Tailwind sheet, the tokens, the
 * known-issues sheet and the candidate theme; no Mangrove stylesheet is among them.
 * The three e2e specs that "verify" this assert `toHaveClass(/mg-button/)`, which a
 * class name satisfies whether or not it styles anything.
 *
 * REAL DELTA LOADS ONE FIRST, WHICH IS THE GAP. `app/root.tsx` links
 * `/assets/css/style-dts.css` - 67KB, 81 `.mg-button` rules - BEFORE the Tailwind
 * sheet. Adding that here would make the coexistence real and would make this the
 * hardest view in the evaluation. It would also reopen every A4 result measured on
 * the Delta host, so it is a decision to take deliberately rather than a detail to
 * slip into a layout change. Recorded in the known-issues register as
 * `delta-host-has-no-mangrove-stylesheet`.
 *
 * Until then, the buttons below carry Tailwind utilities ALONGSIDE their `mg-`
 * classes. Without them they render as bare text, because nothing styles `mg-`
 * here - which is what the page actually looked like before this was measured.
 * See docs/host-derivation.md.
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
  /** Application title, rendered as the page heading. */
  readonly title: string;
  /** The candidate library's subtree. It owns the whole application region. */
  readonly children: ReactNode;
  /** Document direction, driven by the demo's locale switcher. */
  readonly dir?: "ltr" | "rtl";
  /**
   * Host-level chrome, rendered OUTSIDE the candidate root.
   *
   * Exists for the known-issues box, which every demo must render and which must
   * sit outside the candidate subtree so that no candidate stylesheet can restyle
   * it. Without this slot a demo has two bad options: render it inside
   * `data-candidate-root`, where it becomes restylable and pollutes the
   * `?candidate=off` baseline the leakage assertion requires to be empty, or omit
   * it and lose the box. Both were tried before this prop existed.
   */
  readonly notices?: ReactNode;
  /**
   * Page-level chrome, rendered full width beneath the menu bar and above the
   * page header — the `ViewSwitcher`, in practice. Same slot, same reasons, as
   * `HostShell`'s: it is the frame around the page, so it sits where the frame
   * is, not inside `main` beside the content.
   *
   * Distinct from `notices` on purpose. Both are host chrome, but the
   * known-issues box is a caveat ABOUT this page and belongs with the content;
   * the switcher is the way OFF it and belongs with the chrome.
   */
  readonly pageHeader?: ReactNode;
}

/**
 * Top-level menu items, from DELTA's own `RegularMenuBar`: uppercased labels, each
 * with an icon and a submenu. Host chrome, so English in every locale.
 *
 * `DATA` is marked current because this frame renders a data screen. Real DELTA
 * marks the section containing the route.
 */
const MENU_ITEMS = [
  { href: "#data", label: "Data", icon: "database", current: true },
  { href: "#analysis", label: "Analysis", icon: "chart", current: false },
  { href: "#about", label: "About", icon: "info", current: false },
  { href: "#settings", label: "Settings", icon: "cog", current: false },
];

/**
 * The nav icons, inline rather than from an icon font.
 *
 * DELTA uses PrimeReact's PrimeIcons (`pi pi-database`), which arrives with
 * PrimeReact - excluded here. A webfont for four glyphs would also be a network
 * dependency in a page whose whole job is to render identically every time.
 */
const ICON_PATHS: Record<string, string> = {
  database: "M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Zm0 0v12c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12c0 1.1 3.6 2 8 2s8-.9 8-2",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  info: "M12 8h.01M11 12h1v5h1M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.8-.5-.4-1 .9-1.6-1.6-1.6-1.6.9-1-.4L13 4h-2l-.5 1.8-1 .4-1.6-.9L6.3 6.9l.9 1.6-.4 1L5 11v2l1.8.5.4 1-.9 1.6 1.6 1.6 1.6-.9 1 .4L11 20h2l.5-1.8 1-.4 1.6.9 1.6-1.6-.9-1.6.4-1L20 13v-1Z",
};

function NavIcon({ name }: { readonly name: string }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICON_PATHS[name] ?? ""} />
    </svg>
  );
}

/** A disclosure caret. `aria-hidden`: the link text already carries the meaning. */
function Caret(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3 shrink-0 opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AppFrame({
  title,
  children,
  dir = "ltr",
  notices,
  pageHeader,
}: AppFrameProps): ReactElement {
  return (
    <div dir={dir} className="min-h-screen bg-white text-slate-900">
      {/*
       * The menu bar. One horizontal band, as DELTA ships: brand lockup, site
       * switcher, sections, account. No sidebar - see the note at the top of this
       * file about why that is not a cosmetic difference.
       */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mg-container flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          {/* Brand lockup: the tile, then DELTA over RESILIENCE. */}
          <a className="flex items-center gap-2.5 no-underline" href="#home">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#004F91] text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-xl font-bold tracking-tight text-[#004F91]">DELTA</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                Resilience
              </span>
            </span>
          </a>

          <span aria-hidden="true" className="hidden h-8 w-px bg-slate-200 md:block" />

          {/*
           * The site switcher. A real `mg-button` in a Tailwind bar - the coexistence
           * DELTA imposes and no other demo view tests - so it carries the
           * `frame-mangrove-in-delta` canary.
           */}
          <button
            type="button"
            className="mg-button mg-button-secondary mg-button--small flex items-center gap-2 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50"
            data-frame-canary="frame-mangrove-in-delta"
            aria-haspopup="true"
          >
            <span aria-hidden="true">🇾🇪</span>
            <span className="font-semibold">Yemen</span>
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900">
              Official
            </span>
            <Caret />
          </button>

          {/*
           * Carries the existing `nav` / `nav-link` canaries rather than frame-
           * specific duplicates: this IS the host navigation, and `HostShell`
           * renders its own nav outside the canary block for the same reason.
           *
           * `ms-auto` rather than `ml-auto`, so the bar mirrors in Arabic.
           */}
          <nav data-canary="nav" className="ms-auto" aria-label="Sections">
            <ul className="flex flex-wrap items-center gap-x-1">
              {MENU_ITEMS.map((item, index) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-haspopup="true"
                    {...(item.current ? { "aria-current": "page" as const } : {})}
                    {...(index === 0 ? { "data-canary": "nav-link" } : {})}
                    className={`flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide no-underline ${
                      item.current
                        ? "border-[#004F91] text-[#004F91]"
                        : "border-transparent text-slate-600 hover:text-[#004F91]"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                    <Caret />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <span aria-hidden="true" className="hidden h-8 w-px bg-slate-200 md:block" />

          {/* Account. A button, because in DELTA it opens the profile menu. */}
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-bold text-slate-600"
            aria-label="Account"
            aria-haspopup="true"
          >
            KH
          </button>
        </div>
      </header>

      {/* Spans the whole page: it navigates the page, not the content column. */}
      {pageHeader ? <div className="mg-container px-4 pt-4">{pageHeader}</div> : null}

      {/*
       * `mg-container` because that is what DELTA wraps every page in, and the
       * `dts-` classes because that is what its page header block is called. Both
       * are undefined in a DELTA checkout - Mangrove does not ship them either - so
       * the layout below them is ours, and the class names are carried so that the
       * markup a reviewer compares against DELTA's own is the same shape.
       */}
      <main className="mg-container px-4 pb-10">
        {/* Host chrome. Outside the candidate root, so it is not restylable. */}
        {notices}

        <div className="dts-page-header flex flex-wrap items-start justify-between gap-4 pt-5 pb-4">
          <header className="dts-page-title min-w-0">
            <h1 data-canary="heading-1" className="dts-heading-1 text-xl font-bold">
              {title}
            </h1>
            {/*
             * DELTA's page header carries a one-line description under the title.
             * This one earns its place twice over, because it is also the host prose
             * the leakage assertion reads immediately above the candidate region.
             */}
            <p
              className="mt-1 max-w-prose text-sm text-slate-600"
              data-frame-canary="frame-prose-before"
            >
              Everything below this line is rendered by the candidate library: the
              filters, table, pagination and dialogs. The menu bar above and this
              header are host chrome.
            </p>
          </header>

          {/*
           * Page-level actions, where DELTA puts them. The primary action is host
           * chrome rather than the candidate's, so the candidate's own buttons in
           * the region below can be compared against a fixed reference on the same
           * screen.
           */}
          <div className="flex shrink-0 items-center gap-2">
            {/*
             * "Import CSV" and "Add disaster event", not "Export"/"Add new record":
             * both are real DELTA actions (`app/frontend/csv_import.tsx`, and the
             * add-event wizard the DLDTS screens show), and neither collides with
             * the export button the candidate region renders for itself. Two
             * buttons a few centimetres apart labelled "Export list" and "Export"
             * read as one duplicated control rather than as host versus candidate.
             */}
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              data-frame-canary="frame-toolbar-button"
            >
              Import CSV
            </button>
            <button
              type="button"
              className="mg-button mg-button-primary mg-button--small rounded bg-[#004F91] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#003c6e]"
            >
              Add disaster event
            </button>
          </div>
        </div>

        {/* The candidate library renders here, and nowhere else. */}
        <section className="min-w-0" data-candidate-root="">
          {children}
        </section>

        {/*
         * The host strip. Retained so the leakage assertion still has host markup
         * to compare, in the position a real DELTA page carries footer content. See
         * the note at the top of this file about why leakage from this view reads
         * differently.
         */}
        <div className="mt-10 border-t-2 border-dashed border-slate-300 pt-8">
          <p className="mb-6 max-w-prose text-sm text-slate-600" data-frame-canary="frame-prose-after">
            Host reference markup resumes here, so leakage remains measurable in a
            layout the candidate otherwise owns entirely.
          </p>
          <HostCanaries />
        </div>
      </main>
    </div>
  );
}

/** Re-exported so demos can assert they rendered every frame canary. */
export { DELTA_FRAME_CANARY_IDS };
