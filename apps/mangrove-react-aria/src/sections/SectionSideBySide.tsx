/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * The left column is plain Mangrove markup, the right is React Aria. Putting
 * them adjacent is the quickest way to see how much theming closed the gap and
 * where it did not — which is the substance of the `theming` block in
 * evidence.json.
 */

import type { ReactElement } from "react";
import { Button, Cell, Column, ListBox, ListBoxItem, Row, Table, TableBody, TableHeader } from "react-aria-components";

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
          <h4 className="demo-sbs__heading">Mangrove host</h4>

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
                <a href={`#section-9`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="demo-sbs__col">
          <h4 className="demo-sbs__heading">React Aria, themed</h4>

          <Button className="demo-button demo-button--primary">{labels.actionSave}</Button>

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
