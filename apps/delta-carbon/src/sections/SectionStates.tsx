/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * Carbon covers three of the four natively and has nothing for the fourth.
 *
 *   loading   `DataTableSkeleton` renders a shaped placeholder table with the
 *             right column count — better than a spinner, and better than MUI's
 *             linear-progress overlay, because the layout does not jump when the
 *             real rows arrive. For the form, `InlineLoading` is a single
 *             component with a `status` prop covering active → finished → error,
 *             which is the whole form lifecycle in one place. No other candidate
 *             has that.
 *   error     `InlineNotification kind="error"`, `role="alert"` already set.
 *   success   `InlineNotification kind="success"`, `role="status"`.
 *   empty     NOTHING. Carbon has no empty-state component and `DataTable` has no
 *             empty slot — it renders a table with a header row and no body rows,
 *             which reads as a rendering bug rather than as "no results". The
 *             empty state below is our own markup. That is the gap: MUI has
 *             `localeText.noRowsLabel` and a `noRowsOverlay` slot; React Aria has
 *             `renderEmptyState` on `TableBody`. Carbon has neither, so
 *             `table-states` is `composed`.
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
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

const INLINE_LOADING_STATUS: Readonly<Record<LoadState, "active" | "finished" | "error" | "inactive">> =
  {
    loading: "active",
    success: "finished",
    error: "error",
    empty: "inactive",
  };

export function SectionStates(): ReactElement {
  const { labels } = useDemo();
  const [tableState, setTableState] = useState<LoadState>("success");
  const [formState, setFormState] = useState<LoadState>("success");

  const rows = recordsForState(tableState, LOSS_RECORDS).slice(0, 3);
  const columns = [labels.colCountry, labels.colHazard, labels.colStatus];

  return (
    <section id="section-7" className="demo__section">
      <h3 className="demo__heading">7. Loading, empty, error and success states</h3>

      <div className="demo__row">
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

      <div style={{ marginBlockEnd: "var(--undrr-space-8)" }}>
        {tableState === "error" ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={labels.stateError}
            subtitle={labels.longVerificationBanner}
          />
        ) : null}

        {tableState === "success" ? (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title={labels.stateSuccess}
            subtitle={labels.longMethodologyNotice}
          />
        ) : null}

        {tableState === "loading" ? (
          <DataTableSkeleton
            columnCount={columns.length}
            rowCount={3}
            headers={columns.map((header) => ({ key: header, header }))}
            aria-label={labels.stateLoading}
          />
        ) : null}

        {tableState === "empty" ? (
          /* Carbon has no empty-state component and DataTable has no empty slot. */
          <div
            role="status"
            style={{
              border: "1px dashed var(--undrr-color-border-strong)",
              borderRadius: "var(--undrr-radius-md)",
              padding: "var(--undrr-space-8)",
              textAlign: "center",
              color: "var(--undrr-color-text-secondary)",
            }}
          >
            {labels.stateEmpty}
          </div>
        ) : null}

        {tableState === "success" ? (
          <div className="demo__table-scroll">
            <Table aria-label={`${labels.navRecords} (${tableState})`}>
            <TableHead>
              <TableRow>
                {columns.map((header) => (
                  <TableHeader key={header}>{header}</TableHeader>
                ))}
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
          </div>
        ) : null}
      </div>

      <div className="demo__row">
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

      <div
        style={{
          padding: "var(--undrr-space-4)",
          border: "1px solid var(--undrr-color-border)",
          borderRadius: "var(--undrr-radius-md)",
          minHeight: "8rem",
        }}
      >
        {formState === "empty" ? (
          <p style={{ color: "var(--undrr-color-text-secondary)" }}>{labels.stateEmpty}</p>
        ) : (
          <>
            <TextInput
              id="states-country"
              labelText={labels.fieldCountry}
              defaultValue="Mozambique"
              disabled={formState === "loading"}
            />
            <div style={{ marginBlockStart: "var(--undrr-space-4)" }}>
              {/* One component, whole lifecycle. */}
              <InlineLoading
                status={INLINE_LOADING_STATUS[formState]}
                description={
                  formState === "loading"
                    ? labels.stateLoading
                    : formState === "error"
                      ? labels.stateError
                      : labels.stateSuccess
                }
                iconDescription={labels.stateLoading}
              />
            </div>
          </>
        )}

        {formState === "error" ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={labels.stateError}
            subtitle={labels.validationServer}
          />
        ) : null}
      </div>

      <p className="demo__note">
        Loading, error and success are Carbon components. The empty state is ours:
        Carbon ships no empty-state component and DataTable has no empty slot.
      </p>
    </section>
  );
}
