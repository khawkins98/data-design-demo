/**
 * Mangrove island frame: a believable UNDRR page with the candidate owning ONE
 * embedded region.
 *
 * The kitchen sink proves a candidate's components exist and that tokens reach
 * them. It does not show what adoption looks like, because it hands the whole
 * content column to the candidate. The realistic Mangrove case is the opposite:
 * the library arrives inside a page that already exists, and has to coexist with
 * real page chrome above it and real host prose either side of it.
 *
 * What that surfaces which a component inventory cannot:
 *
 * - leakage in both directions with real neighbouring content, not just a canary
 *   block the candidate happens to sit after
 * - typographic scale and font mismatch at the boundary between host prose and
 *   candidate components
 * - focus-ring and colour conflicts against Mangrove's own interactive chrome
 * - vertical rhythm breaking where Mangrove prose meets a candidate component
 *
 * Derived from the real published UNDRR page frame in `shared-web-assets-files`
 * (`projects/hips/index.html`), whose markup this reproduces: the four-colour
 * `mg-page-header__decoration` bar, `mg-page-header--default` with its toolbar
 * wrapper and logo block, the `mg-mega-topbar` navigation with its `role`
 * semantics, and a `mg-container mg-page-content--padded` content region.
 *
 * NO FOOTER, deliberately. `mg-page-footer` is not published in
 * `shared-web-assets-files` and the real footer carries behaviour outside this
 * evaluation's scope. Its absence costs little: the header is the leakage-
 * relevant chrome, because it is what sits closest to the candidate.
 *
 * The navigation's `role="menubar"` semantics are a deliberate adversary for the
 * axe run. A candidate rendering its own menu beside this either agrees with
 * Mangrove on ARIA semantics or does not, and A7 should hear about it.
 *
 * Import only. Like `HostShell`, a Brief 1 run must not modify this file: if it
 * cannot express what a run needs, that is a finding for EVIDENCE.md.
 */

import type { ReactElement, ReactNode } from "react";

import { MANGROVE_FRAME_CANARY_IDS } from "@undrr-eval/test-harness/frame-canaries";

import { HostCanaries } from "./HostShell.js";

export interface IslandFrameProps {
  /** Page title, rendered as the content region's `h1`. */
  readonly title: string;
  /** The candidate library's subtree. It owns this region and nothing else. */
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
   * Page-level chrome, rendered beneath the masthead navigation and above the
   * content region — the `ViewSwitcher`, in practice. Same slot, same reasons,
   * as `HostShell`'s: it is the frame around the page, so it sits with the
   * frame's own navigation rather than inside the content.
   *
   * Distinct from `notices` on purpose. Both are host chrome, but the
   * known-issues box is a caveat ABOUT this page and belongs with the content;
   * the switcher is the way OFF it and belongs with the chrome.
   */
  readonly pageHeader?: ReactNode;
}

/**
 * Masthead navigation. Links to the real sibling pages so the topbar is
 * functional navigation, not decoration. Every demo app sits one directory
 * below the site root, so `../` reaches the doc pages.
 */
const TOPBAR_ITEMS = [
  { href: "../", label: "Ranking" },
  { href: "../axes.html", label: "Decision axes" },
  { href: "../comparison.html", label: "Requirement matrix" },
  { href: "../issues.html", label: "Findings" },
  { href: "../architecture-options.html", label: "Architecture" },
];

/** The UNDRR logo, from the same CDN path the real page frame uses. */
const LOGO_SRC = "https://assets.undrr.org/static/logos/undrr/undrr-logo-horizontal.svg";

export function IslandFrame({
  title,
  children,
  dir = "ltr",
  notices,
  pageHeader,
}: IslandFrameProps): ReactElement {
  return (
    <div className="mg-host mg-island" dir={dir}>
      <header id="header" className="mg-page-header mg-page-header--default">
        {/*
         * Four bars, four UNDRR brand colours. Reproduced from the real frame,
         * including the empty divs - the colours come from Mangrove's own CSS.
         */}
        <div className="mg-page-header__decoration" data-frame-canary="frame-decoration" aria-hidden="true">
          <div />
          <div />
          <div />
          <div />
        </div>

        <div className="mg-page-header__toolbar-wrapper" data-vf-google-analytics-region="undrr-black-bar">
          <div className="mg-page-header__container mg-container">
            <div className="mg-page-header__region mg-page-header__region--toolbar">
              <section className="mg-page-header__block mg-page-header__block--logo">
                <a href="#home" data-frame-canary="frame-logo">
                  <img
                    alt="UNDRR"
                    width={324}
                    height={47}
                    title="UNDRR"
                    className="mg-page-header__logo-img"
                    src={LOGO_SRC}
                  />
                </a>
              </section>
            </div>
          </div>
        </div>
      </header>

      {/*
       * Carries the existing `nav` / `nav-link` canaries rather than frame-
       * specific duplicates: this IS the host navigation, and `HostShell` renders
       * its own nav outside the canary block for the same reason.
       */}
      <nav data-canary="nav" className="mg-mega-wrapper" aria-label="Main Navigation">
        <ul
          className="mg-mega-topbar | mg-container mg-container-full-width"
          role="menubar"
          aria-label="Main navigation menu"
        >
          {TOPBAR_ITEMS.map((item, index) => (
            <li key={item.href} className="mg-mega-topbar__item" role="none">
              <a
                className="mg-mega-topbar__item-link"
                href={item.href}
                role="menuitem"
                {...(index === 0 ? { "data-canary": "nav-link" } : {})}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/*
       * Directly under the masthead navigation, in its own `mg-container` so it
       * lines up with the content below rather than running to the viewport edge.
       */}
      {pageHeader ? (
        <div className="mg-container mg-island__pageheader">{pageHeader}</div>
      ) : null}

      <div className="mg-container mg-page-content--padded">
        {/*
         * Carries the `heading-1` canary because `HostShell` puts that canary on
         * its own page title rather than inside the canary block. Without it the
         * frame would render 13 of the contract's 14 and the leakage assertion
         * would silently cover less than it does in the kitchen sink.
         */}
        <h1 data-canary="heading-1">{title}</h1>

        {/* Host chrome. Outside the candidate root, so it is not restylable. */}
        {notices}

        {/*
         * Host prose ABOVE the candidate. This is the boundary the kitchen sink
         * never tests: Mangrove's own `p` and `a` styling running straight into
         * the candidate's first component.
         */}
        <p data-frame-canary="frame-prose-before">
          The table below is rendered by the candidate library. Everything around
          it - this paragraph, the heading above, the masthead and navigation - is
          Mangrove's own markup, styled by Mangrove's own published stylesheet. A
          candidate that changes how any of it renders is leaking.
        </p>

        {/* The existing leakage contract, unchanged, as real neighbouring content. */}
        <HostCanaries />

        {/* The candidate library renders here, and nowhere else. */}
        <section className="mg-island__candidate" data-candidate-root="">
          {children}
        </section>

        {/*
         * Host prose BELOW the candidate. Both boundaries matter: a candidate
         * whose last component collapses its bottom margin, or whose stylesheet
         * resets `p`, shows up here and not above.
         */}
        <p data-frame-canary="frame-prose-after">
          Host prose resumes here. Vertical rhythm across this boundary is part of
          what the island layout measures: spacing that looks correct inside a
          component inventory can read as broken once real content sits beneath
          it.
        </p>
      </div>
    </div>
  );
}

/** Re-exported so demos can assert they rendered every frame canary. */
export { MANGROVE_FRAME_CANARY_IDS };
