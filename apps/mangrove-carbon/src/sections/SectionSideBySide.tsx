/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * The left column is plain Mangrove markup, the right is Carbon. Putting them
 * adjacent is the quickest way to see how much theming closed the gap and where
 * it did not — which is the substance of the `theming` block in evidence.json.
 *
 * For this pairing the comparison carries a second meaning. In the default
 * global-CSS build, the left column is NOT purely Mangrove: Carbon's reset and
 * element-level type rules have already reached it. Read the two columns as
 * "Mangrove after Carbon landed on the page" against "Carbon themed to the
 * tokens", not as a clean before-and-after.
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
  TableContainer,
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
    <section className="demo-section" id="section-9" aria-labelledby="s9">
      <h3 className="demo-section__title" id="s9">
        9. Host and candidate, side by side
      </h3>

      <div className="demo-sbs">
        <div className="demo-sbs__col">
          <h4 className="demo-sbs__heading">Mangrove host markup</h4>

          <button type="button" className="mg-button mg-button-primary">
            {labels.actionSave}
          </button>

          <table className="mg-table mg-table--striped demo-sbs__table">
            <thead>
              <tr>
                <th scope="col">{labels.colCountry}</th>
                <th scope="col">{labels.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id}>
                  <th scope="row">{record.country}</th>
                  <td>{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mg-card">
            <div className="mg-card__content">
              <h5 className="mg-card__title">{labels.navRecords}</h5>
              <p className="mg-card__description">{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <ul className="demo-sbs__nav">
            {navItems.map((item) => (
              <li key={item.id}>
                <a href="#section-9">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="demo-sbs__col">
          <h4 className="demo-sbs__heading">Carbon, themed</h4>

          <Button kind="primary">{labels.actionSave}</Button>

          <TableContainer className="demo-sbs__table">
            <Table size="sm">
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
          </TableContainer>

          <Tile className="demo-card">
            <h5 className="demo-card__title">{labels.navRecords}</h5>
            <p className="demo-card__description">{labels.longMethodologyNotice}</p>
          </Tile>

          <div className="demo-sidenav-wrap">
            <SideNav
              aria-label={`${labels.navOverview} (candidate)`}
              expanded
              isFixedNav={false}
              isChildOfHeader={false}
              className="demo-sidenav"
            >
              <SideNavItems>
                {/* `aria-current` is ours: Carbon's `isActive` only paints a class.
                    See the note in sections/SectionChrome.tsx. */}
                {navItems.map((item, index) => (
                  <SideNavLink
                    key={item.id}
                    href="#section-9"
                    isActive={index === 1}
                    {...(index === 1 ? { "aria-current": "page" as const } : {})}
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
