/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Delta markup with Tailwind utilities; right is Carbon,
 * themed through the `--cds-*` → `--undrr-*` mapping in demo.css.
 *
 * The gap that remains after theming is almost entirely GEOMETRY, not colour.
 * Colour matches closely, because every colour Carbon draws with is a custom
 * property this demo redirects. What does not match:
 *
 *   - Corner radius. Carbon is square by design and has no radius token; the
 *     rounding on the candidate column comes from an explicit override.
 *   - Control height and padding. Carbon's spacing scale is compiled Sass
 *     literals with no `!default`, so it cannot be retargeted at all. Carbon
 *     buttons are 2.5rem tall with 1rem inline padding; Delta's are 0.5rem/1rem.
 *   - Table density. Carbon's default row height is 3rem against Delta's ~2.25rem.
 *     `size="sm"` narrows the gap and is used here.
 *   - Uppercase, letter-spacing and border-block treatment on table headers.
 *
 * That is a useful result for UNDRR: with Carbon, matching a host's palette is
 * nearly free and matching its density is nearly impossible without overriding
 * component CSS.
 */

import type { ReactElement } from "react";
import {
  Button,
  SideNav,
  SideNavItems,
  SideNavLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

const SAMPLE = LOSS_RECORDS.slice(0, 3);

export function SectionSideBySide(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { id: "overview", label: labels.navOverview },
    { id: "records", label: labels.navRecords },
    { id: "submissions", label: labels.navSubmissions },
  ];

  return (
    <section id="section-9" className="demo__section">
      <h3 className="demo__heading">9. Host and candidate, side by side</h3>

      <div className="demo__split demo__split--even">
        {/* Host column: plain markup with Delta's Tailwind utilities. */}
        <div style={{ minWidth: 0 }}>
          <h4 className="demo__column-label">Delta host</h4>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-sky-800 px-4 py-2 text-sm font-semibold text-white"
          >
            {labels.actionSave}
          </button>

          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  {labels.colCountry}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {labels.colStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id} className="border-b border-slate-200">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {record.country}
                  </th>
                  <td className="py-2">{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mt-3 rounded border border-slate-300 bg-white p-4">
            <div>
              <h5 className="font-semibold text-slate-900">{labels.navRecords}</h5>
              <p className="mt-1 text-sm text-slate-600">{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <ul className="mt-3">
            {navItems.map((item) => (
              <li key={item.id} className="mt-1 first:mt-0">
                <a
                  href="#section-9"
                  className="block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Candidate column: Carbon, themed to the same tokens. */}
        <div style={{ minWidth: 0 }}>
          <h4 className="demo__column-label">IBM Carbon, themed</h4>

          <Button kind="primary">{labels.actionSave}</Button>

          <div className="demo__table-scroll" style={{ marginBlockStart: "var(--undrr-space-3)" }}>
            <Table size="sm" aria-label={`${labels.navRecords} (candidate)`}>
              <TableHead>
                <TableRow>
                  <TableHeader>{labels.colCountry}</TableHeader>
                  <TableHeader>{labels.colStatus}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAMPLE.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.country}</TableCell>
                    <TableCell>{record.verificationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div style={{ marginBlockStart: "var(--undrr-space-3)" }}>
            <Tile>
              <h5 className="demo__subheading">{labels.navRecords}</h5>
              <p style={{ color: "var(--undrr-color-text-secondary)" }}>
                {labels.longMethodologyNotice}
              </p>
            </Tile>
          </div>

          <div style={{ marginBlockStart: "var(--undrr-space-3)" }}>
            <SideNav
              aria-label={`${labels.navOverview} (candidate)`}
              expanded
              isPersistent
              isChildOfHeader={false}
              addFocusListeners={false}
              addMouseListeners={false}
            >
              <SideNavItems>
                {navItems.map((item) => (
                  <SideNavLink
                    key={item.id}
                    href="#section-9"
                    isActive={item.id === "records"}
                  >
                    {item.label}
                  </SideNavLink>
                ))}
              </SideNavItems>
            </SideNav>
          </div>
        </div>
      </div>
    </section>
  );
}
