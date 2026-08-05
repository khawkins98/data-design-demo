/**
 * Delta host shell.
 *
 * Derived from https://github.com/PreventionWeb/delta (Apache-2.0). Delta styles
 * itself with Tailwind CSS 4, imported as a single `@import "tailwindcss"` in
 * app/styles/all.css, and composes UI from PrimeReact on top of that.
 *
 * This shell reproduces the Tailwind-utility convention, including Preflight.
 * Preflight is the consequential part: it resets buttons, inputs, headings and
 * lists globally, which is exactly the kind of thing candidate libraries
 * collide with. A Delta host without it would flatter every candidate.
 *
 * PrimeReact is deliberately NOT included: it is Delta's incumbent component
 * library and this evaluation is about what might replace it. Its presence
 * would prejudge the comparison. Recorded in docs/host-derivation.md.
 *
 * Import only. Brief 1 forbids modifying this package.
 */

import type { ReactNode } from "react";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";

export interface HostShellProps {
  /** Page title rendered in the shell header. */
  readonly title: string;
  /** The candidate library's subtree. */
  readonly children: ReactNode;
  /** Document direction, driven by the demo's locale switcher. */
  readonly dir?: "ltr" | "rtl";
}

/** Nav items are host chrome, so they stay in English in every locale. */
const NAV_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#records", label: "Loss records" },
  { href: "#submissions", label: "Submissions" },
  { href: "#verification", label: "Verification queue" },
];

const TABLE_ROWS = [
  { region: "Asia-Pacific", reports: "1,284", updated: "2026-06-11" },
  { region: "Africa", reports: "946", updated: "2026-06-09" },
  { region: "Americas", reports: "731", updated: "2026-06-12" },
];

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-semibold " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

/**
 * The leakage canaries.
 *
 * Structurally identical to the Mangrove host's canaries, differing only in
 * class names, so a difference between the two hosts is attributable to host
 * styling rather than to different markup.
 */
function Canaries(): JSX.Element {
  return (
    <section aria-labelledby="canary-heading" className="border-b-2 border-dashed border-slate-300 pb-8 mb-8">
      <h2 id="canary-heading" data-canary="heading-2" className="text-2xl font-bold text-slate-900">
        Host reference elements
      </h2>
      <h3 data-canary="heading-3" className="mt-2 text-lg font-semibold text-slate-700">
        These are styled entirely by the host
      </h3>

      <p data-canary="paragraph" className="mt-3 max-w-prose text-slate-700">
        Every element in this block is plain host markup. If a candidate library
        changes how any of it renders, that is style leakage. Reference:{" "}
        <a
          data-canary="link"
          href="https://www.undrr.org/"
          className="text-sky-800 underline underline-offset-2 hover:text-sky-900"
        >
          undrr.org
        </a>
        .
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          data-canary="button-primary"
          type="button"
          className={`${BUTTON_BASE} bg-sky-800 text-white hover:bg-sky-900`}
        >
          Primary action
        </button>
        <button
          data-canary="button-secondary"
          type="button"
          className={`${BUTTON_BASE} border border-sky-800 text-sky-800 hover:bg-sky-50`}
        >
          Secondary action
        </button>
        <button
          data-canary="button-disabled"
          type="button"
          disabled
          className={`${BUTTON_BASE} bg-slate-300 text-slate-500`}
        >
          Disabled action
        </button>
      </div>

      <table data-canary="table" className="mt-6 w-full border-collapse text-left text-sm">
        <caption className="pb-2 text-left text-slate-600">Reports received by region</caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Region
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Reports
            </th>
            <th scope="col" className="py-2 font-semibold">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, index) => (
            <tr key={row.region} className="border-b border-slate-200">
              <th
                scope="row"
                className="py-2 pr-4 font-normal"
                {...(index === 0 ? { "data-canary": "table-cell" } : {})}
              >
                {row.region}
              </th>
              <td className="py-2 pr-4 tabular-nums">{row.reports}</td>
              <td className="py-2 tabular-nums">{row.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article
          data-canary="card-first"
          className="rounded border border-slate-300 bg-white p-4 shadow-sm"
        >
          <h3 className="font-semibold text-slate-900">Sendai Framework Monitor</h3>
          <p className="mt-1 text-sm text-slate-600">
            National reporting against the seven global targets.
          </p>
        </article>
        <article
          data-canary="card-second"
          className="rounded border border-slate-300 bg-white p-4 shadow-sm"
        >
          <h3 className="font-semibold text-slate-900">DesInventar Sendai</h3>
          <p className="mt-1 text-sm text-slate-600">
            Historical loss databases maintained at national level.
          </p>
        </article>
      </div>
    </section>
  );
}

export function HostShell({ title, children, dir = "ltr" }: HostShellProps): JSX.Element {
  return (
    <div dir={dir} className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-baseline gap-4 border-b border-slate-300 bg-white px-6 py-4">
        <span className="font-bold uppercase tracking-widest text-sky-800">UNDRR</span>
        <h1 data-canary="heading-1" className="text-xl font-bold">
          {title}
        </h1>
      </header>

      <div className="grid items-start gap-6 p-6 md:grid-cols-[16rem_minmax(0,1fr)]">
        <nav data-canary="nav" aria-label="Sections">
          <ul>
            {NAV_ITEMS.map((item, index) => (
              <li key={item.href} className="mt-1 first:mt-0">
                <a
                  href={item.href}
                  className="block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline hover:border-sky-800 hover:bg-sky-50"
                  {...(index === 0 ? { "data-canary": "nav-link" } : {})}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">
          <Canaries />
          {/* The candidate library renders here, and nowhere else. */}
          <section className="min-w-0" data-candidate-root="">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

/** Re-exported so demos can assert they rendered every canary. */
export { CANARY_IDS };
