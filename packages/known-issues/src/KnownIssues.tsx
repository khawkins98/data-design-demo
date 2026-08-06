/**
 * The known-issues box that sits at the top of every demo page.
 *
 * Deliberately plain HTML styled from the UNDRR tokens, not from the candidate
 * library. Three reasons, and they are all load-bearing:
 *
 *   1. It must read identically on all ten demos. If it were built from the
 *      candidate's own components it would look different on every page, and a
 *      reader comparing two demos would be comparing the warning box as much as
 *      the content.
 *   2. It must not be restyled by the candidate. On the Mangrove host, Ant Design
 *      loses every conflict to unlayered host CSS - the box's own class-scoped
 *      rules would be caught in exactly that crossfire.
 *   3. It must not perturb what is being measured. It renders inside the
 *      candidate root, so it is included in the scoped axe run, and it is written
 *      to pass: a real heading, a real list, links with discernible names, and
 *      colours taken from tokens that already meet contrast.
 *
 * It is collapsed to a summary by default via <details>, so it informs without
 * pushing the actual demo below the fold. `open` on the first render would change
 * every screenshot's framing.
 */

import type { ReactElement } from "react";

import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { openIssuesFor } from "./issues.js";
import type { IssueSeverity, KnownIssue } from "./issues.js";

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  blocker: "Blocker",
  decision: "Decision needed",
  caveat: "Caveat",
  info: "Context",
};

/**
 * Owner labels, written for a reader whose first question is whose problem it is.
 *
 * "our own demo code" is deliberately blunt. A finding we caused must not be
 * mistaken for a property of the library on the page it appears on, and hedged
 * wording is how that mistake happens.
 */
const OWNER_LABEL: Record<KnownIssue["owner"], string> = {
  candidate: "the library",
  pairing: "this combination",
  "third party": "a dependency the library pulls in",
  host: "the host design system",
  "our implementation": "our own demo code, not the library",
  "this evaluation": "this evaluation's method",
};

export interface KnownIssuesProps {
  /** Candidate id, e.g. "antd". Must match the ids used in issues.ts. */
  readonly candidate: string;
  /** Host id: "delta" or "mangrove". */
  readonly host: string;
  /** Human-readable candidate name for the summary line. */
  readonly candidateName: string;
}

export function KnownIssues({ candidate, host, candidateName }: KnownIssuesProps): ReactElement | null {
  // Open issues only. Findings we fixed stay in the registry as the audit trail;
  // see openIssuesFor for why they do not belong in the box on a demo page.
  const issues = openIssuesFor(candidate, host);
  if (issues.length === 0) return null;

  const counts = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    return acc;
  }, {});

  const hasBlocker = issues.some((issue) => issue.severity === "blocker");

  // Ordered worst-first by issuesFor, so the summary reads in the same order.
  const summaryBits = (["blocker", "decision", "caveat", "info"] as const)
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${SEVERITY_LABEL[s].toLowerCase()}${counts[s] === 1 ? "" : "s"}`);

  /*
   * TOKEN_SCOPE_CLASS is applied here and it is not optional. The UNDRR tokens are
   * declared on `.undrr-tokens` rather than on `:root`, deliberately, so that the
   * leakage assertion stays honest. This box renders OUTSIDE the demo's own token
   * scope, so without the class every `var(--undrr-*)` below is invalid at
   * computed-value time and the box inherits whatever the host happens to set.
   *
   * That was not theoretical. On the Mangrove host the first version of this
   * component rendered with a transparent background and Mangrove's #1a1a1a
   * border, because the warning colour never resolved. It is the same mistake
   * portalled overlays caused in three earlier pairings, arriving from a new
   * direction.
   */
  return (
    <aside
      className={`${TOKEN_SCOPE_CLASS} undrr-known-issues`}
      aria-labelledby="known-issues-heading"
    >
      {/*
       * OPEN WHEN THERE IS A BLOCKER, collapsed otherwise.
       *
       * It used to be collapsed unconditionally, on the reasoning that `open` would
       * change every screenshot's framing. True, and it lost to a worse problem: a
       * reviewer looking at mangrove-antd sees three filter controls rendering
       * blank, and the explanation of why - which is the difference between "Ant
       * Design is broken" and "one cascade-layer setting is doing this, reversibly" -
       * was hidden behind a summary they had no reason to click. A project manager
       * reviewing the site reached the wrong conclusion for exactly this reason.
       *
       * So the framing cost is now paid only on the pairings that have a blocker,
       * which are the pairings where a reader most needs the text, and the screenshot
       * shows what a reader actually sees.
       */}
      <details className="undrr-known-issues__details" open={hasBlocker}>
        <summary className="undrr-known-issues__summary">
          <span id="known-issues-heading" className="undrr-known-issues__title">
            Known issues with this integration
          </span>{" "}
          <span className="undrr-known-issues__count">
            {summaryBits.join(", ")} recorded for {candidateName} on this host
          </span>
        </summary>

        <p className="undrr-known-issues__intro">
          These are measured findings from building this page, not general warnings.
          Figures come from the evidence files linked beside each item. An issue
          marked <strong>Decision needed</strong> is a trade-off for UNDRR to settle
          rather than a defect to fix.
        </p>

        <ul className="undrr-known-issues__list">
          {issues.map((issue) => (
            <li key={issue.id} className="undrr-known-issues__item">
              <p className="undrr-known-issues__item-head">
                <span
                  className={`undrr-known-issues__badge undrr-known-issues__badge--${issue.severity}`}
                >
                  {SEVERITY_LABEL[issue.severity]}
                </span>{" "}
                <strong className="undrr-known-issues__item-title">{issue.title}</strong>
              </p>
              <p className="undrr-known-issues__detail">{issue.detail}</p>
              <p className="undrr-known-issues__meta">
                <span className="undrr-known-issues__owner">
                  Belongs to {OWNER_LABEL[issue.owner]}.
                </span>{" "}
                {issue.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 ? " " : ""}
                    <a className="undrr-known-issues__link" href={link.href}>
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>

        <p className="undrr-known-issues__footer">
          <a className="undrr-known-issues__link" href="../axes.html">
            Decision axes for all ten pairings
          </a>{" "}
          <a className="undrr-known-issues__link" href="../comparison.html">
            Requirement matrix
          </a>
        </p>
      </details>
    </aside>
  );
}
