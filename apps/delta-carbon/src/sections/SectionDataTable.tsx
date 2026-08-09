/**
 * Section 6: data table over the 250-row fixture.
 *
 * Carbon's `DataTable` sits between MUI's `DataGrid` and React Aria's `Table` in
 * how much it does for you, and the split is worth being precise about because it
 * is the single biggest effort difference in the evaluation.
 *
 * WHAT CARBON OWNS
 *   Sorting     `isSortable` on the table plus per-header. The default comparator
 *               handles numbers numerically, strings via `localeCompare` with a
 *               numeric-aware fallback, and coerces `null` to `""` — so the
 *               integer, float, ISO-date, ISO-datetime, enum, string and nullable
 *               columns all sort correctly with no comparator written. Verified by
 *               reading `DataTable/tools/sorting.ts`, not assumed.
 *   Selection   `getSelectionProps()` with `TableSelectAll` / `TableSelectRow`,
 *               including the indeterminate header state and the batch-action bar.
 *   Filtering   `onInputChange` + `TableToolbarSearch`. Filters across every cell.
 *   Pagination  the `Pagination` control itself, with a page-size select.
 *
 * WHAT IS OURS
 *   Cell formatting.  Carbon has no `valueFormatter`. A cell renders whatever you
 *                     put in it, so every `Intl` call is at the call site. That is
 *                     a consequence of `DataTable` being a render-prop shell over
 *                     your own markup rather than a grid that owns its cells — the
 *                     same reason the enum column can be a `Tag` with no escape
 *                     hatch, where MUI needs `renderCell`.
 *   Paging the rows.  `Pagination` is presentation only. It reports
 *                     `{ page, pageSize }` and you slice. The slice happens INSIDE
 *                     the render prop, where `rows` is already filtered and
 *                     sorted, so paging composes correctly with both — but nothing
 *                     in the API tells you that, and slicing outside would have
 *                     silently made search page-local.
 *   Column reorder.   Carbon has NO column resize and NO column reorder, at any
 *                     tier. Neither `DataTable` nor `Table` has a prop for either,
 *                     and the compiled stylesheet contains no resizer element.
 *                     The brief accepts one of the two, so reorder is implemented
 *                     here from scratch: an ordered key array plus a keyboard-
 *                     operable move-left/move-right control per column. Status:
 *                     `custom`. This is the one requirement where Carbon is
 *                     behind both MUI (resize, free) and React Aria (a resizing
 *                     hook).
 *
 * The reorder control is a separate toolbar row rather than buttons inside the
 * header cells, because `TableHeader` with `isSortable` renders the header label
 * inside a `<button>`, and nesting a button inside a button is invalid HTML.
 */

import { useMemo, useState } from "react";
import type { ComponentProps, ReactElement } from "react";
import {
  Button,
  DataTable,
  Pagination,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
} from "@carbon/react";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LabelSet, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";

import { asProps } from "../carbon-props.js";
import { formattersFor, useDemo } from "../demo-state.js";
import type { Formatters } from "../demo-state.js";

type ColumnKey =
  | "country"
  | "hazardType"
  | "eventDate"
  | "reportedAt"
  | "peopleAffected"
  | "economicLossUsdMillions"
  | "dataSource"
  | "verificationStatus"
  | "reviewNote"
  | "narrative";

const DEFAULT_ORDER: readonly ColumnKey[] = [
  "country",
  "hazardType",
  "eventDate",
  "reportedAt",
  "peopleAffected",
  "economicLossUsdMillions",
  "dataSource",
  "verificationStatus",
  "reviewNote",
  "narrative",
];

const HEADER_LABEL: Readonly<Record<ColumnKey, keyof LabelSet>> = {
  country: "colCountry",
  hazardType: "colHazard",
  eventDate: "colEventDate",
  reportedAt: "colReportedAt",
  peopleAffected: "colPeopleAffected",
  economicLossUsdMillions: "colEconomicLoss",
  dataSource: "colDataSource",
  verificationStatus: "colStatus",
  reviewNote: "colReviewNote",
  narrative: "colNarrative",
};

/** Carbon's Tag palette is colour-named, so status maps onto a hue. */
const STATUS_TAG: Readonly<Record<VerificationStatus, "green" | "warm-gray" | "red" | "gray">> = {
  verified: "green",
  pending: "warm-gray",
  disputed: "red",
  withdrawn: "gray",
};

/** Rows are the raw fixture values plus `id`: Carbon sorts on what it is given. */
type Row = { readonly id: string } & { readonly [K in ColumnKey]: LossRecord[K] };

const ROWS: readonly Row[] = LOSS_RECORDS.map((record) => ({
  id: record.id,
  country: record.country,
  hazardType: record.hazardType,
  eventDate: record.eventDate,
  reportedAt: record.reportedAt,
  peopleAffected: record.peopleAffected,
  economicLossUsdMillions: record.economicLossUsdMillions,
  dataSource: record.dataSource,
  verificationStatus: record.verificationStatus,
  reviewNote: record.reviewNote,
  narrative: record.narrative,
}));

/** All formatting is at the call site: Carbon has no valueFormatter. */
function renderCell(key: string, value: unknown, formatters: Formatters): ReactElement | string {
  switch (key as ColumnKey) {
    case "eventDate":
      return formatters.date.format(new Date(`${String(value)}T00:00:00Z`));
    case "reportedAt":
      return formatters.dateTime.format(new Date(String(value)));
    case "peopleAffected":
      return formatters.integer.format(Number(value));
    case "economicLossUsdMillions":
      return formatters.decimal.format(Number(value));
    case "verificationStatus": {
      const status = String(value) as VerificationStatus;
      return (
        <Tag type={STATUS_TAG[status]} size="sm">
          {status}
        </Tag>
      );
    }
    case "reviewNote":
      return value === null ? "—" : String(value);
    case "narrative":
      // Clamped, because a Carbon cell has no truncation affordance and the
      // 140-200 character fixture makes every row ~265px tall otherwise.
      return (
        <span className="demo__cell-clamp" title={String(value)}>
          {String(value)}
        </span>
      );
    default:
      return String(value);
  }
}

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();
  const formatters = useMemo(() => formattersFor(bcp47), [bcp47]);

  const [order, setOrder] = useState<readonly ColumnKey[]>(DEFAULT_ORDER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const headers = useMemo(
    () =>
      order.map((key) => ({
        key,
        header: labels[HEADER_LABEL[key]],
        isSortable: true,
      })),
    [order, labels],
  );

  /** Column reorder: the whole of it, because Carbon provides none. */
  const move = (key: ColumnKey, delta: -1 | 1): void => {
    setOrder((current) => {
      const index = current.indexOf(key);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  };

  return (
    <section id="section-6" className="demo__section">
      {/* `formatters.integer`, not a bare `{ROWS.length}`. Every count in this
          section sits beside cells that ARE Intl-formatted, so an unformatted one
          makes the same page show "1.234.567" in a cell and "1234567" in the heading
          in German. */}
      <h3 className="demo__heading">
        6. Data table, {formatters.integer.format(ROWS.length)} rows
      </h3>

      {/* Column reorder controls: custom, because Carbon has neither reorder
          nor resize. Buttons rather than drag, so keyboard users get it too. */}
      <div className="demo__row" aria-label="Column order" role="group">
        {order.map((key, index) => (
          <span
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--undrr-space-1)",
              border: "1px solid var(--undrr-color-border)",
              borderRadius: "var(--undrr-radius-md)",
              paddingInlineStart: "var(--undrr-space-2)",
            }}
          >
            <span style={{ fontSize: "var(--undrr-font-size-xs)" }}>
              {labels[HEADER_LABEL[key]]}
            </span>
            <Button
              kind="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => move(key, -1)}
              aria-label={`Move ${labels[HEADER_LABEL[key]]} earlier`}
            >
              ←
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={index === order.length - 1}
              onClick={() => move(key, 1)}
              aria-label={`Move ${labels[HEADER_LABEL[key]]} later`}
            >
              →
            </Button>
          </span>
        ))}
      </div>

      <DataTable rows={[...ROWS]} headers={headers} isSortable>
        {({
          rows,
          headers: renderHeaders,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getBatchActionProps,
          selectedRows,
          getTableProps,
          getToolbarProps,
          getTableContainerProps,
          onInputChange,
        }) => {
          // `rows` here is ALREADY filtered and sorted, so slicing for the page
          // composes with both. Slicing the input to DataTable instead would
          // have made search page-local.
          const total = rows.length;
          const start = (page - 1) * pageSize;
          const visible = rows.slice(start, start + pageSize);

          return (
            <TableContainer
              title={labels.navRecords}
              description={`${formatters.integer.format(total)} ${labels.navRecords.toLocaleLowerCase(bcp47)}`}
              {...getTableContainerProps()}
            >
              <TableToolbar {...asProps<ComponentProps<typeof TableToolbar>>(getToolbarProps())}>
                {/* The batch-action bar is Carbon's, including the count and the
                    cancel affordance. Nothing here is ours. */}
                <TableBatchActions
                  {...asProps<ComponentProps<typeof TableBatchActions>>(getBatchActionProps())}
                >
                  <TableBatchAction onClick={() => undefined}>
                    {labels.actionExport} ({selectedRows.length})
                  </TableBatchAction>
                  <TableBatchAction onClick={() => undefined}>
                    {labels.actionDelete}
                  </TableBatchAction>
                </TableBatchActions>
                <TableToolbarContent>
                  <TableToolbarSearch
                    onChange={onInputChange}
                    placeholder={labels.actionFilter}
                    labelText={labels.actionFilter}
                  />
                </TableToolbarContent>
              </TableToolbar>

              <div className="demo__table-scroll">
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      <TableSelectAll
                        {...asProps<ComponentProps<typeof TableSelectAll>>(getSelectionProps())}
                      />
                      {renderHeaders.map((header) => {
                        const { key, ...headerProps } = getHeaderProps({ header });
                        return (
                          <TableHeader
                            key={key}
                            {...asProps<ComponentProps<typeof TableHeader>>(headerProps)}
                          >
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((row) => {
                      const { key, ...rowProps } = getRowProps({ row });
                      return (
                        <TableRow key={key} {...asProps<ComponentProps<typeof TableRow>>(rowProps)}>
                          <TableSelectRow
                            {...asProps<ComponentProps<typeof TableSelectRow>>(
                              getSelectionProps({ row }),
                            )}
                          />
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>
                              {renderCell(cell.info.header, cell.value, formatters)}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/*
                * `itemsPerPageText` is deliberately NOT passed. It used to carry
                * `labels.navRecords`, which made the rows-per-page selector read
                * "Loss records" — it labels a control rather than naming a thing, so
                * Carbon's untouched "Items per page:" is more correct than the
                * substitution was. `itemRangeText` IS wired: the fixture set supplies
                * the noun it needs, and wiring it routes the numbers through `Intl`.
                * See AppView.tsx for the full list of nine text props Carbon uses
                * here in place of the `translateWithId` this component does not have.
                */}
              <Pagination
                page={page}
                pageSize={pageSize}
                pageSizes={[10, 25, 50]}
                totalItems={total}
                itemRangeText={(min, max, totalItems) =>
                  `${formatters.integer.format(min)}–${formatters.integer.format(max)} / ` +
                  `${formatters.integer.format(totalItems)} ` +
                  `${labels.navRecords.toLocaleLowerCase(bcp47)}`
                }
                onChange={({ page: nextPage, pageSize: nextPageSize }) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                }}
              />
            </TableContainer>
          );
        }}
      </DataTable>

      <p className="demo__note">
        Sorting, selection, select-all and search are Carbon&apos;s. Cell
        formatting, page slicing and the entire column-reorder control are ours:
        Carbon has no cell formatter, no pagination wiring and neither column
        resize nor reorder at any tier.
      </p>
    </section>
  );
}
