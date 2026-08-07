/**
 * Page header, Delta host: breadcrumbs, view tabs, and the cross-host link.
 *
 * The Mangrove twin is `packages/host-mangrove/src/ViewSwitcher.tsx` and the full
 * rationale lives there, including why these are links styled as tabs rather than
 * ARIA tabs, and why the header is not sticky. Same markup and same props; Tailwind
 * utilities instead of hand-written CSS, which is the split the two `HostShell`s
 * already take.
 *
 * Every directional utility here is logical (`ms-`, `ps-`, `border-s`) so the header
 * mirrors in Arabic without a second rule.
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

const TAB = "block px-3.5 py-2 text-sm no-underline border border-transparent border-b-0 -mb-px";
const TAB_CURRENT = "font-bold text-slate-900 bg-white border-slate-300 border-b-white";
const TAB_LINK = "text-sky-800 hover:bg-slate-100";

export function ViewSwitcher({
  views,
  pairingName,
  otherHost,
}: ViewSwitcherProps): ReactElement | null {
  if (views.length === 0) return null;

  const current = views.find((view) => view.current);

  return (
    <div className="mb-6 border-b border-slate-300">
      {/* The way out, where readers look for it. */}
      <nav aria-label="Breadcrumb">
        <ol className="mb-2 flex flex-wrap gap-x-2 gap-y-1 text-[0.8125rem] text-slate-600">
          <li>
            <a className="text-sky-800 underline underline-offset-2" href="../">
              All pairings
            </a>
          </li>
          <li className="before:me-2 before:text-slate-400 before:content-['›'] rtl:before:content-['‹']">{pairingName}</li>
          {current ? (
            <li
              className="font-bold text-slate-900 before:me-2 before:font-normal before:text-slate-400 before:content-['›'] rtl:before:content-['‹']"
              aria-current="page"
            >
              {current.label}
            </li>
          ) : null}
        </ol>
      </nav>

      {/*
       * Kept as `aria-label="Demo views"`: several e2e specs locate this region by
       * that name, and renaming it would break them for no reader benefit.
       */}
      <nav
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2"
        aria-label="Demo views"
      >
        <ul className="flex flex-wrap gap-1">
          {views.map((view) => (
            <li key={view.href}>
              {view.current ? (
                <span className={`${TAB} ${TAB_CURRENT}`} aria-current="page">
                  {view.label}
                </span>
              ) : (
                <a className={`${TAB} ${TAB_LINK}`} href={`./${view.href}`}>
                  {view.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        {otherHost ? (
          <p className="mb-2 text-[0.8125rem] text-slate-600">
            Same library, other host:{" "}
            <a className="text-sky-800 underline underline-offset-2" href={otherHost.href}>
              {otherHost.label}
            </a>
          </p>
        ) : null}
      </nav>

      {/* What the view you are on is for. */}
      {current ? (
        <p className="mb-3 mt-2.5 text-[0.8125rem] text-slate-600">{current.hint}</p>
      ) : null}
    </div>
  );
}
