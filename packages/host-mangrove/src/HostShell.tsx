/**
 * Mangrove host shell.
 *
 * Derived from https://github.com/unisdr/undrr-mangrove (Apache-2.0). Rather
 * than reimplement Mangrove's CSS, this shell loads the design system's real
 * published stylesheet and uses its real class names, so the canary elements
 * are styled by Mangrove itself. See docs/host-derivation.md.
 *
 * Import only. Brief 1 forbids modifying this package.
 */

import type { ReactElement, ReactNode } from "react";

import { CANARY_IDS } from "@undrr-eval/test-harness/canaries";

export interface HostShellProps {
  /** Page title rendered in the shell header. */
  readonly title: string;
  /** The candidate library's subtree. */
  readonly children: ReactNode;
  /** Document direction, driven by the demo's locale switcher. */
  readonly dir?: "ltr" | "rtl";
  /**
   * Page-level chrome, rendered full width directly beneath the masthead and
   * ABOVE the body — the `ViewSwitcher`, in practice.
   *
   * A slot rather than `children` because position is the whole point. Passed as
   * a child, the switcher landed inside `<main>` below the canary block, so the
   * navigation for the page appeared a screen down, after a wall of host
   * reference markup, reading as something belonging to the content rather than
   * as the frame around it. Navigation that frames a page has to sit where the
   * frame is.
   *
   * Outside `data-candidate-root`, like `HostCanaries`, so no candidate
   * stylesheet can restyle it and it cannot pollute the `?candidate=off`
   * baseline.
   */
  readonly pageHeader?: ReactNode;
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

/**
 * The leakage canaries.
 *
 * Plain, hand-written markup using Mangrove's own classes. A candidate library
 * must not change how any of this renders. The `data-canary` attributes are the
 * harness's handles; the structure is identical to the Delta host so the two
 * are comparable.
 *
 * Headings and links carry no class on purpose. Mangrove styles bare `h1`-`h6`
 * and `a` elements in `_foundational.scss` and ships no `mg-heading-*` or
 * `mg-link` class, so element-level styling is the faithful reproduction. An
 * earlier version invented those classes; they were inert and implied an API
 * Mangrove does not have.
 */
export function HostCanaries(): ReactElement {
  return (
    <section className="mg-host-canaries" aria-labelledby="canary-heading">
      <h2 id="canary-heading" data-canary="heading-2">
        Host reference elements
      </h2>
      <h3 data-canary="heading-3">
        These are styled entirely by the host
      </h3>

      <p data-canary="paragraph">
        Every element in this block is plain host markup. If a candidate library
        changes how any of it renders, that is style leakage. Reference:{" "}
        <a data-canary="link" href="https://www.undrr.org/">
          undrr.org
        </a>
        .
      </p>

      <div className="mg-host-canaries__buttons">
        <button data-canary="button-primary" type="button" className="mg-button mg-button-primary">
          Primary action
        </button>
        <button
          data-canary="button-secondary"
          type="button"
          className="mg-button mg-button-secondary"
        >
          Secondary action
        </button>
        <button
          data-canary="button-disabled"
          type="button"
          className="mg-button mg-button-primary"
          disabled
        >
          Disabled action
        </button>
      </div>

      <table data-canary="table" className="mg-table mg-table--striped">
        <caption>Reports received by region</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Reports</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, index) => (
            <tr key={row.region}>
              <th scope="row" {...(index === 0 ? { "data-canary": "table-cell" } : {})}>
                {row.region}
              </th>
              <td>{row.reports}</td>
              <td>{row.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mg-host-canaries__cards">
        <article data-canary="card-first" className="mg-card">
          <div className="mg-card__content">
            <h3 className="mg-card__title">Sendai Framework Monitor</h3>
            <p className="mg-card__description">
              National reporting against the seven global targets.
            </p>
          </div>
        </article>
        <article data-canary="card-second" className="mg-card">
          <div className="mg-card__content">
            <h3 className="mg-card__title">DesInventar Sendai</h3>
            <p className="mg-card__description">
              Historical loss databases maintained at national level.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export function HostShell({
  title,
  children,
  dir = "ltr",
  pageHeader,
}: HostShellProps): ReactElement {
  return (
    <div className="mg-host" dir={dir}>
      <header className="mg-host__header">
        <span className="mg-host__brand">UNDRR</span>
        <h1 data-canary="heading-1">
          {title}
        </h1>
      </header>

      {/*
       * Full width, above the body grid, so the page navigation spans the page
       * it navigates rather than sitting in one column of it.
       */}
      {pageHeader ? <div className="mg-host__pageheader">{pageHeader}</div> : null}

      <div className="mg-host__body">
        <nav data-canary="nav" className="mg-host__nav" aria-label="Sections">
          <ul className="mg-host__nav-list">
            {NAV_ITEMS.map((item, index) => (
              <li key={item.href} className="mg-host__nav-item">
                <a
                  className="mg-host__nav-link"
                  href={item.href}
                  {...(index === 0 ? { "data-canary": "nav-link" } : {})}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="mg-host__main">
          <HostCanaries />
          {/* The candidate library renders here, and nowhere else. */}
          <section className="mg-host__candidate" data-candidate-root="">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

/** Re-exported so demos can assert they rendered every canary. */
export { CANARY_IDS };
