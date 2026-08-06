/**
 * Section 6: data table over the 250-row fixture.
 *
 * Sortable, multi-select, filterable, paginated, with column reordering.
 *
 * Carbon's `DataTable` is the most complete data layer of any candidate in this
 * evaluation. It is a headless controller with render props, and it owns:
 *
 *   sorting     `isSortable` on a header plus its own comparator, which handles
 *               numbers numerically, strings by `localeCompare`, and unwraps
 *               React elements to compare their text. Read from
 *               DataTable/tools/sorting.js, not assumed.
 *   filtering   `onInputChange` from `TableToolbarSearch`, with a default
 *               predicate over every cell value.
 *   selection   `getSelectionProps` for both `TableSelectAll` and
 *               `TableSelectRow`, including the indeterminate state.
 *   batch bar   `getBatchActionProps` renders the "n items selected" action bar.
 *
 * Two things it does NOT own:
 *
 *   pagination        `Pagination` exists as a component, with a page-size
 *                     select, but nothing connects it to the table. Slicing is
 *                     ours: composed.
 *   column resize     absent. No resizing, no reordering, no `resizable` flag
 *   or reorder        anywhere in the package — grepped, not guessed. The
 *                     reorder below is entirely ours: custom.
 *
 * The sort correctness point is worth spelling out because it bit the other runs:
 * rows are handed to `DataTable` holding RAW fixture values, and formatting
 * happens at render time. Passing pre-formatted strings would make the comparator
 * sort "1.234.567" before "999".
 */

import { useMemo, useState } from "react";
import type { DragEvent, KeyboardEvent, ReactElement } from "react";
import {
  DataTable,
  Pagination,
  Table,
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
import type { LabelSet, LossRecord } from "@undrr-eval/fixtures";

import { asProps } from "../carbon-props.js";
import { STATUS_TAG_COLOUR, useDemo } from "../demo-state.js";

const PAGE_SIZES = [10, 25, 50];

/** Column keys in their default order. Reordering permutes this. */
const COLUMN_KEYS = [
  "country",
  "hazardType",
  "eventDate",
  "reportedAt",
  "peopleAffected",
  "economicLossUsdMillions",
  "verificationStatus",
  "reviewNote",
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABEL_KEYS: Readonly<Record<ColumnKey, keyof LabelSet>> = {
  country: "colCountry",
  hazardType: "colHazard",
  eventDate: "colEventDate",
  reportedAt: "colReportedAt",
  peopleAffected: "colPeopleAffected",
  economicLossUsdMillions: "colEconomicLoss",
  verificationStatus: "colStatus",
  reviewNote: "colReviewNote",
};

/** Which columns Carbon should offer a sort control on. */
const SORTABLE: ReadonlySet<ColumnKey> = new Set<ColumnKey>([
  "country",
  "hazardType",
  "eventDate",
  "reportedAt",
  "peopleAffected",
  "economicLossUsdMillions",
  "verificationStatus",
]);

/** A DataTable row: raw values only, so the comparator sees real types. */
type TableRowData = { readonly id: string } & Pick<LossRecord, ColumnKey>;

const ROWS: readonly TableRowData[] = LOSS_RECORDS.map((record) => ({
  id: record.id,
  country: record.country,
  hazardType: record.hazardType,
  eventDate: record.eventDate,
  reportedAt: record.reportedAt,
  peopleAffected: record.peopleAffected,
  economicLossUsdMillions: record.economicLossUsdMillions,
  verificationStatus: record.verificationStatus,
  reviewNote: record.reviewNote,
}));

/**
 * Carbon's DataTable render props do not typecheck against Carbon's own
 * components under `exactOptionalPropertyTypes: true`.
 *
 * `getSelectionProps()` is declared as returning `checked?: boolean | undefined`
 * while `TableSelectAll` declares `checked: boolean`; `getHeaderProps()` returns
 * `isSortable?: boolean | undefined` while `TableHeader` requires `isSortable:
 * boolean`; `getToolbarProps()` returns `size: 'xs' | 'sm' | undefined` while
 * `TableToolbar` accepts only `'xs' | 'sm' | 'lg'`.
 *
 * The values are correct at runtime — this is Carbon's own two type declarations
 * disagreeing with each other. Casting at the spread is the only route that does
 * not involve loosening the project's compiler settings, which would affect every
 * other app in the workspace. Recorded as a DX finding in EVIDENCE.md.
 */
/*
 * Moved to `../carbon-props.ts` when the realistic island layout needed the same
 * cast, so the two views share one documented escape hatch instead of two copies
 * of it. The explanation above is unchanged and still applies.
 */

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 10);
  const [order, setOrder] = useState<readonly ColumnKey[]>(COLUMN_KEYS);
  const [dragged, setDragged] = useState<ColumnKey | null>(null);

  const numberFormat = useMemo(() => new Intl.NumberFormat(bcp47), [bcp47]);
  const decimalFormat = useMemo(
    () =>
      new Intl.NumberFormat(bcp47, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [bcp47],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
    [bcp47],
  );
  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(bcp47, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [bcp47],
  );

  const headers = order.map((key) => ({
    key,
    header: labels[COLUMN_LABEL_KEYS[key]],
    isSortable: SORTABLE.has(key),
  }));

  /** Formats one cell for display. Sorting never sees these strings. */
  function renderCell(key: string, value: unknown): ReactElement | string {
    switch (key) {
      case "eventDate":
        return dateFormat.format(new Date(`${String(value)}T00:00:00Z`));
      case "reportedAt":
        return dateTimeFormat.format(new Date(String(value)));
      case "peopleAffected":
        return numberFormat.format(Number(value));
      case "economicLossUsdMillions":
        return decimalFormat.format(Number(value));
      case "verificationStatus": {
        const status = String(value) as LossRecord["verificationStatus"];
        return (
          <Tag type={STATUS_TAG_COLOUR[status]} size="sm">
            {status}
          </Tag>
        );
      }
      default:
        return value === null ? "—" : String(value);
    }
  }

  /**
   * Column reorder. Entirely ours — Carbon offers neither resize nor reorder.
   *
   * Drag and drop for pointer users, Ctrl+Shift+Arrow for keyboard users. The
   * keyboard half is the part a library normally gives you and the part
   * hand-rolled reordering usually omits.
   */
  function move(key: ColumnKey, delta: number): void {
    setOrder((current) => {
      const from = current.indexOf(key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, key);
      return next;
    });
  }

  function onHeaderKeyDown(event: KeyboardEvent<HTMLElement>, key: ColumnKey): void {
    if (!event.ctrlKey || !event.shiftKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(key, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(key, 1);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>, target: ColumnKey): void {
    event.preventDefault();
    if (dragged === null || dragged === target) return;
    setOrder((current) => {
      const next = current.filter((key) => key !== dragged);
      next.splice(current.indexOf(target), 0, dragged);
      return next;
    });
    setDragged(null);
  }

  return (
    <section className="demo-section" id="section-6" aria-labelledby="s6">
      <h3 className="demo-section__title" id="s6">
        6. Data table, {LOSS_RECORDS.length} rows
      </h3>

      <p className="demo-hint">
        Columns reorder by dragging a header, or with Ctrl+Shift+Arrow while a
        header has focus. Both are custom: Carbon ships neither resize nor
        reorder.
      </p>

      <DataTable rows={[...ROWS]} headers={headers} isSortable>
        {({
          rows,
          headers: renderHeaders,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getTableProps,
          getTableContainerProps,
          getToolbarProps,
          onInputChange,
          selectedRows,
        }) => {
          // Pagination: Carbon's own component, our slicing.
          const total = rows.length;
          const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
          const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

          return (
            <TableContainer
              title={labels.navRecords}
              description={`${total} / ${LOSS_RECORDS.length} rows · ${selectedRows.length} selected`}
              className="demo-tablewrap"
              {...getTableContainerProps()}
            >
              <TableToolbar {...asProps<typeof TableToolbar>(getToolbarProps())}>
                <TableToolbarContent>
                  <TableToolbarSearch
                    persistent
                    placeholder={labels.actionFilter}
                    labelText={labels.actionFilter}
                    onChange={(event) => {
                      onInputChange(event);
                      setPage(1);
                    }}
                  />
                </TableToolbarContent>
              </TableToolbar>

              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {/* Select-all covers every filtered row, not just this page. */}
                    <TableSelectAll {...asProps<typeof TableSelectAll>(getSelectionProps())} />
                    {renderHeaders.map((header) => {
                      const { key, ...headerProps } = getHeaderProps({ header });
                      return (
                        <TableHeader
                          key={key}
                          {...asProps<typeof TableHeader>(headerProps)}
                          draggable
                          onDragStart={() => setDragged(header.key as ColumnKey)}
                          onDragOver={(event: DragEvent<HTMLElement>) =>
                            event.preventDefault()
                          }
                          onDrop={(event: DragEvent<HTMLElement>) =>
                            onDrop(event, header.key as ColumnKey)
                          }
                          onKeyDown={(event: KeyboardEvent<HTMLElement>) =>
                            onHeaderKeyDown(event, header.key as ColumnKey)
                          }
                        >
                          {header.header}
                        </TableHeader>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((row) => {
                    const { key, ...rowProps } = getRowProps({ row });
                    return (
                      <TableRow key={key} {...rowProps}>
                        <TableSelectRow {...asProps<typeof TableSelectRow>(getSelectionProps({ row }))} />
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>
                            {renderCell(cell.info.header, cell.value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Pagination
                page={safePage}
                pageSize={pageSize}
                pageSizes={PAGE_SIZES}
                totalItems={total}
                onChange={({ page: nextPage, pageSize: nextSize }) => {
                  setPage(nextPage);
                  setPageSize(nextSize);
                }}
              />
            </TableContainer>
          );
        }}
      </DataTable>
    </section>
  );
}
