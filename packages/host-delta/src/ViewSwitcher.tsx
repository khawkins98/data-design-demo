/**
 * Cross-view navigation strip, Delta host.
 *
 * The Mangrove twin is `packages/host-mangrove/src/ViewSwitcher.tsx`, and the
 * rationale for both is recorded there. Same markup, same props, Tailwind classes
 * instead of hand-written CSS - which is the same split the two `HostShell`s
 * already take, and keeps each host's chrome styled the way that host really
 * styles things.
 */

import type { ReactElement } from "react";

import type { ViewLink } from "@undrr-eval/test-harness/views";

export interface ViewSwitcherProps {
  /** Views this pairing ships, with the current one flagged. */
  readonly views: readonly ViewLink[];
  /** "MUI Community on Delta", for orientation after a cold arrival. */
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
    <nav
      className="mb-6 border border-slate-300 border-s-4 border-s-sky-800 bg-white px-4 py-3"
      aria-label="Demo views"
    >
      <p className="mb-1.5 text-sm">
        <strong>{pairingName}</strong>
        {current ? <span className="text-slate-600"> — {current.hint}</span> : null}
      </p>

      <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[0.8125rem]">
        <li className="font-bold">Viewing:</li>
        {views.map((view) => (
          <li key={view.href}>
            {view.current ? (
              <span className="font-bold" aria-current="page">
                {view.label}
              </span>
            ) : (
              <a className="text-sky-800 underline underline-offset-2" href={`./${view.href}`}>
                {view.label}
              </a>
            )}
          </li>
        ))}
        {otherHost ? (
          <li className="ms-2 border-s border-slate-300 ps-3">
            <a className="text-sky-800 underline underline-offset-2" href={otherHost.href}>
              {otherHost.label}
            </a>
          </li>
        ) : null}
        <li className="ms-2 border-s border-slate-300 ps-3">
          <a className="text-sky-800 underline underline-offset-2" href="../">
            All pairings
          </a>
        </li>
      </ul>
    </nav>
  );
}
