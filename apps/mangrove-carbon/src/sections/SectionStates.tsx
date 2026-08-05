/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * Carbon covers all four with named components, which is the best result of any
 * candidate here:
 *
 *   loading   `DataTableSkeleton` for the table — a shaped skeleton, not a
 *             spinner — and `InlineLoading` for the form, which also carries the
 *             success and error terminal states in one component.
 *   empty     no dedicated component, but `InlineNotification kind="info"` is
 *             the documented pattern and the empty <tbody> renders correctly.
 *   error     `InlineNotification kind="error"`, with role=alert built in.
 *   success   `InlineNotification kind="success"`, or `InlineLoading
 *             status="finished"`.
 *
 * `table-states` is therefore `composed` rather than `native` on one point only:
 * choosing which component represents which state, and the empty case having no
 * component of its own.
 *
 * All four states are mocked at the fixture boundary, per Brief 1 constraint 7.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  DataTableSkeleton,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

/** Maps a load state onto the InlineLoading status Carbon understands. */
const INLINE_STATUS: Readonly<Record<LoadState, "active" | "finished" | "error">> = {
  loading: "active",
  success: "finished",
  error: "error",
  empty: "finished",
};

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
            size="sm"
            kind={state === tableState ? "primary" : "tertiary"}
            onClick={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </div>

      <div className="demo-statebox">
        {tableState === "loading" ? (
          <DataTableSkeleton columnCount={3} rowCount={3} showHeader={false} showToolbar={false} />
        ) : null}

        {tableState === "error" ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={labels.stateError}
          />
        ) : null}

        {tableState === "empty" ? (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={labels.stateEmpty}
          />
        ) : null}

        {tableState === "success" ? (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title={labels.stateSuccess}
          />
        ) : null}

        {tableState !== "loading" && tableState !== "error" ? (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>{labels.colCountry}</TableHeader>
                  <TableHeader>{labels.colHazard}</TableHeader>
                  <TableHeader>{labels.colStatus}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.country}</TableCell>
                    <TableCell>{record.hazardType}</TableCell>
                    <TableCell>{record.verificationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </div>

      <div className="demo-row" role="group" aria-label="Form state">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="sm"
            kind={state === formState ? "primary" : "tertiary"}
            onClick={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </div>

      <div className="demo-statebox">
        {/*
          InlineLoading carries all three of active/finished/error in one
          component, with the spinner, tick and cross and an aria-live region.
          No other candidate in this evaluation has a single component for that.
        */}
        {formState === "empty" ? (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={labels.stateEmpty}
          />
        ) : (
          <InlineLoading
            status={INLINE_STATUS[formState]}
            description={
              formState === "loading"
                ? labels.stateLoading
                : formState === "error"
                  ? labels.stateError
                  : labels.stateSuccess
            }
          />
        )}

        {formState === "empty" ? null : (
          <TextInput
            id="states-country"
            labelText={labels.fieldCountry}
            defaultValue="Mozambique"
            disabled={formState === "loading"}
          />
        )}
      </div>
    </section>
  );
}
