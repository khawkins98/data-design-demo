/**
 * Cross-view navigation strip.
 *
 * A reader arriving on `island.html` from a shared link previously had no route
 * to the other views, to the same candidate on the other host, or back to the
 * landing page. Three pages per candidate with no navigation between them is
 * three dead ends.
 *
 * It belongs in host chrome, beside where the known-issues box renders, for the
 * same reasons: it sits outside `data-candidate-root`, so no candidate stylesheet
 * can restyle it and it cannot pollute the `?candidate=off` baseline; and being in
 * the host packages it is inherited by every pairing rather than reimplemented ten
 * times.
 *
 * Rendered only when a demo passes `views`. The pairings without the realistic
 * layouts render nothing, so their existing screenshots and leakage baselines are
 * untouched.
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
    <nav className="mg-viewswitcher" aria-label="Demo views">
      <p className="mg-viewswitcher__where">
        <strong>{pairingName}</strong>
        {current ? <span className="mg-viewswitcher__hint"> — {current.hint}</span> : null}
      </p>

      <ul className="mg-viewswitcher__list">
        <li className="mg-viewswitcher__label">Viewing:</li>
        {views.map((view) => (
          <li key={view.href} className="mg-viewswitcher__item">
            {view.current ? (
              <span className="mg-viewswitcher__current" aria-current="page">
                {view.label}
              </span>
            ) : (
              <a className="mg-viewswitcher__link" href={`./${view.href}`}>
                {view.label}
              </a>
            )}
          </li>
        ))}
        {otherHost ? (
          <li className="mg-viewswitcher__item mg-viewswitcher__item--other">
            <a className="mg-viewswitcher__link" href={otherHost.href}>
              {otherHost.label}
            </a>
          </li>
        ) : null}
        <li className="mg-viewswitcher__item mg-viewswitcher__item--other">
          <a className="mg-viewswitcher__link" href="../">
            All pairings
          </a>
        </li>
      </ul>
    </nav>
  );
}
