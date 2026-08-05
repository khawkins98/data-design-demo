/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * The left column is plain Delta markup — the same Tailwind utility strings the
 * host shell uses for its canaries. The right column is React Aria themed with
 * the UNDRR tokens. Putting them adjacent is the quickest way to see how much
 * theming closed the gap and where it did not, which is the substance of the
 * `theming` block in evidence.json.
 *
 * The gap that remains here is deliberate and worth reading off the screenshot:
 * the host column is slate-and-sky Tailwind, the candidate column is the UNDRR
 * token palette. They are not meant to be identical — the tokens are the target
 * design, Delta's current palette is not. What the comparison shows is that
 * every visual property was reachable, not that the two look the same.
 */

import type { ReactElement } from "react";
import {
  Button,
  Cell,
  Column,
  ListBox,
  ListBoxItem,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import {
  DELTA_BUTTON_BASE_CLASS,
  DELTA_CARD_BODY_CLASS,
  DELTA_CARD_CLASS,
  DELTA_CARD_TITLE_CLASS,
  DELTA_NAV_LINK_CLASS,
  useDemo,
} from "../demo-state.js";

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
          <h4 className="demo-sbs__heading">Delta host</h4>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={`${DELTA_BUTTON_BASE_CLASS} bg-sky-800 text-white hover:bg-sky-900`}
            >
              {labels.actionSave}
            </button>
          </div>

          <table className="w-full border-collapse text-left text-sm">
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

          <article className={DELTA_CARD_CLASS}>
            <div>
              <h5 className={DELTA_CARD_TITLE_CLASS}>{labels.navRecords}</h5>
              <p className={DELTA_CARD_BODY_CLASS}>{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <nav aria-label={`${labels.navOverview} (host)`}>
            <ul>
              {navItems.map((item) => (
                <li key={item.id} className="mt-1 first:mt-0">
                  <a href="#section-9" className={DELTA_NAV_LINK_CLASS}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="demo-sbs__col">
          <h4 className="demo-sbs__heading">React Aria, themed</h4>

          <div className="demo-row demo-row--tight">
            <Button className="demo-button demo-button--primary">{labels.actionSave}</Button>
          </div>

          <Table
            className="demo-table demo-sbs__table"
            aria-label={`${labels.navRecords} (candidate)`}
          >
            <TableHeader>
              <Column id="country" isRowHeader className="demo-table__column">
                {labels.colCountry}
              </Column>
              <Column id="status" className="demo-table__column">
                {labels.colStatus}
              </Column>
            </TableHeader>
            <TableBody items={SAMPLE}>
              {(record) => (
                <Row id={record.id} className="demo-table__row">
                  <Cell className="demo-table__cell">{record.country}</Cell>
                  <Cell className="demo-table__cell">{record.verificationStatus}</Cell>
                </Row>
              )}
            </TableBody>
          </Table>

          <article className="demo-card">
            <h5 className="demo-card__title">{labels.navRecords}</h5>
            <p className="demo-card__description">{labels.longMethodologyNotice}</p>
          </article>

          <ListBox
            className="demo-nav"
            aria-label={`${labels.navOverview} (candidate)`}
            selectionMode="single"
            defaultSelectedKeys={["records"]}
            items={navItems}
          >
            {(item) => (
              <ListBoxItem id={item.id} textValue={item.label} className="demo-nav__item">
                {item.label}
              </ListBoxItem>
            )}
          </ListBox>
        </div>
      </div>
    </section>
  );
}
