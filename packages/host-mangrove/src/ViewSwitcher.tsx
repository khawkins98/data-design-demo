/**
 * Page header: breadcrumbs, view tabs, and the cross-host link.
 *
 * A reader arriving on `island.html` from a shared link previously had no route to
 * the other views, to the same candidate on the other host, or back to the landing
 * page. Three pages per candidate with no navigation between them is three dead
 * ends.
 *
 * WHY IT IS SHAPED LIKE THIS. The first version was one flat strip - "Viewing:
 * a | b | Carbon on Delta | All pairings" - which made three different jobs look
 * like one list of four peers. They are not peers:
 *
 *   - the VIEWS are alternatives to each other, one of which you are looking at.
 *     That is what a tab set is, so they are tabs.
 *   - the OTHER HOST is the same view of the same library somewhere else. It
 *     switches a different dimension, so it sits apart from the tabs.
 *   - ALL PAIRINGS is the way out. That belongs in a breadcrumb, where readers
 *     look for it, not at the end of a row of tabs.
 *
 * NOT ARIA TABS, deliberately. `role="tab"` requires tabpanels in the same
 * document, and these are links to separate pages. Announcing them as tabs would
 * promise a screen-reader user that activating one changes a panel in place, which
 * is false. They are links that look like tabs, with `aria-current="page"` on the
 * one you are on - which is what the pattern actually is.
 *
 * NOT STICKY, also deliberately. A fixed header would overlay candidate content in
 * every screenshot the harness captures, and those screenshots are evidence.
 *
 * WHERE IT SITS. Every frame takes it through a `pageHeader` slot that renders it
 * full width directly under the masthead, above the body. It first arrived through
 * the `notices` slot instead, beside the known-issues box, which put it a screen
 * down the page after the host canary block - so the navigation FOR the page read
 * as content WITHIN it. The two are host chrome on the same terms but answer
 * different questions: the known-issues box is a caveat about this page and
 * belongs with the content, the switcher is the way off it and belongs with the
 * frame.
 *
 * It stays host chrome for the reasons the known-issues box is: outside
 * `data-candidate-root`, so no candidate stylesheet can restyle it and it cannot
 * pollute the `?candidate=off` baseline; and living in the host packages, so every
 * pairing inherits it rather than reimplementing it ten times.
 */

import type { ReactElement } from "react";

import type { ViewLink } from "@undrr-eval/test-harness/views";

export interface ViewSwitcherProps {
  /** Views this pairing ships, with the current one flagged. */
  readonly views: readonly ViewLink[];
  /** "MUI Community on Mangrove", for orientation after a cold arrival. */
  readonly pairingName: string;
  /** Link to the same candidate on the other host, if it exists. */
  readonly otherHost?: { readonly label: string; readonly href: string };
}

export function ViewSwitcher({
  views,
  pairingName,
  otherHost,
}: ViewSwitcherProps): ReactElement | null {
  if (views.length === 0) return null;

  const current = views.find((view) => view.current);

  return (
    <div className="mg-pageheader">
      {/* The way out, where readers look for it. */}
      <nav aria-label="Breadcrumb" className="mg-pageheader__crumbs">
        <ol className="mg-pageheader__crumblist">
          <li className="mg-pageheader__crumb">
            <a href="../">All pairings</a>
          </li>
          <li className="mg-pageheader__crumb">{pairingName}</li>
          {current ? (
            <li className="mg-pageheader__crumb" aria-current="page">
              {current.label}
            </li>
          ) : null}
        </ol>
      </nav>

      {/*
       * Kept as `aria-label="Demo views"`: several e2e specs locate this region by
       * that name, and renaming it would break them for no reader benefit.
       */}
      <nav className="mg-pageheader__nav" aria-label="Demo views">
        <ul className="mg-pageheader__tabs">
          {views.map((view) => (
            <li key={view.href} className="mg-pageheader__tab">
              {view.current ? (
                <span className="mg-pageheader__tablink mg-pageheader__tablink--current" aria-current="page">
                  {view.label}
                </span>
              ) : (
                <a className="mg-pageheader__tablink" href={`./${view.href}`}>
                  {view.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        {otherHost ? (
          <p className="mg-pageheader__otherhost">
            Same library, other host: <a href={otherHost.href}>{otherHost.label}</a>
          </p>
        ) : null}
      </nav>

      {/* What the view you are on is for. */}
      {current ? <p className="mg-pageheader__hint">{current.hint}</p> : null}
    </div>
  );
}
