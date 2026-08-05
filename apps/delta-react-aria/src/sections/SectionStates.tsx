/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * React Aria covers part of this and not the rest, which is the finding:
 * `TableBody` has a documented `renderEmptyState`, and `ProgressBar` gives an
 * accessible indeterminate loader. Error and success banners have no component
 * — they are `role="alert"` and `role="status"` markup we write.
 *
 * All four states are mocked at the fixture boundary, per Brief 1 constraint 7.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Cell,
  Column,
  Input,
  Label,
  ProgressBar,
  Row,
  Table,
  TableBody,
  TableHeader,
  TextField,
} from "react-aria-components";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

export function SectionStates(): ReactElement {
  const { labels } = useDemo();
  const [tableState, setTableState] = useState<LoadState>("success");
  const [formState, setFormState] = useState<LoadState>("success");

  const rows = recordsForState(tableState).slice(0, 3);

  return (
    <section className="demo-section" id="section-7" aria-labelledby="s7">
      <h3 className="demo-section__title" id="s7">
        7. Loading, empty, error and success states
      </h3>

      <div className="demo-row" role="group" aria-label="Table state">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            className="demo-button"
            data-active={state === tableState ? "true" : undefined}
            onPress={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </div>

      <div className="demo-statebox">
        {tableState === "loading" ? (
          <ProgressBar
            className="demo-progress"
            isIndeterminate
            aria-label={labels.stateLoading}
          >
            <span className="demo-progress__label">{labels.stateLoading}</span>
            <span className="demo-progress__track">
              <span className="demo-progress__fill" />
            </span>
          </ProgressBar>
        ) : null}

        {tableState === "error" ? (
          <p className="demo-status demo-status--error" role="alert">
            {labels.stateError}
          </p>
        ) : null}

        {tableState === "success" ? (
          <p className="demo-status demo-status--success" role="status">
            {labels.stateSuccess}
          </p>
        ) : null}

        {tableState !== "loading" && tableState !== "error" ? (
          <Table className="demo-table" aria-label={`${labels.navRecords} (${tableState})`}>
            <TableHeader>
              <Column id="country" isRowHeader className="demo-table__column">
                {labels.colCountry}
              </Column>
              <Column id="hazardType" className="demo-table__column">
                {labels.colHazard}
              </Column>
              <Column id="verificationStatus" className="demo-table__column">
                {labels.colStatus}
              </Column>
            </TableHeader>
            <TableBody
              items={rows}
              renderEmptyState={() => (
                <span className="demo-empty">{labels.stateEmpty}</span>
              )}
            >
              {(record) => (
                <Row id={record.id} className="demo-table__row">
                  <Cell className="demo-table__cell">{record.country}</Cell>
                  <Cell className="demo-table__cell">{record.hazardType}</Cell>
                  <Cell className="demo-table__cell">{record.verificationStatus}</Cell>
                </Row>
              )}
            </TableBody>
          </Table>
        ) : null}
      </div>

      <div className="demo-row" role="group" aria-label="Form state">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            className="demo-button"
            data-active={state === formState ? "true" : undefined}
            onPress={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </div>

      <div className="demo-statebox">
        {formState === "loading" ? (
          <ProgressBar className="demo-progress" isIndeterminate aria-label={labels.stateLoading}>
            <span className="demo-progress__label">{labels.stateLoading}</span>
            <span className="demo-progress__track">
              <span className="demo-progress__fill" />
            </span>
          </ProgressBar>
        ) : null}

        {formState === "error" ? (
          <p className="demo-status demo-status--error" role="alert">
            {labels.stateError}
          </p>
        ) : null}

        {formState === "success" ? (
          <p className="demo-status demo-status--success" role="status">
            {labels.stateSuccess}
          </p>
        ) : null}

        {formState === "empty" ? (
          <p className="demo-empty">{labels.stateEmpty}</p>
        ) : (
          <TextField className="demo-field" isDisabled={formState === "loading"}>
            <Label className="demo-label">{labels.fieldCountry}</Label>
            <Input className="demo-input" defaultValue="Mozambique" />
          </TextField>
        )}
      </div>
    </section>
  );
}
