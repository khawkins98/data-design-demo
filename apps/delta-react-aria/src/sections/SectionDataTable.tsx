/**
 * Section 6: data table over the 250-row fixture.
 *
 * Sortable, multi-select, filterable, paginated, with column resizing.
 *
 * React Aria gives the behaviour (`allowsSorting`, `selectionMode="multiple"`,
 * `ResizableTableContainer` + `ColumnResizer`) but no data layer: sorting,
 * filtering and pagination are application code. That is a deliberate library
 * boundary rather than a gap, but it is real implementation cost and is counted
 * as such in evidence.json.
 *
 * Pagination has no React Aria component at all, so the control below is custom.
 *
 * SELECT-ALL IS NOT FREE, and this run found that out by asserting it.
 * `selectionMode="multiple"` gives the selection *behaviour* — click, shift-click,
 * Ctrl/Cmd-click, keyboard — but React Aria renders no checkboxes at all. The
 * select-all control the brief asks for only exists once you add a selection
 * column and a `<Checkbox slot="selection">` in both the header and every row.
 * The slot supplies the indeterminate state and the localised accessible name;
 * the markup and its styling are ours. Recorded as `composed`, not `native`.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Cell,
  Checkbox,
  Column,
  ColumnResizer,
  Input,
  Label,
  ResizableTableContainer,
  Row,
  SearchField,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import type { Selection, SortDescriptor } from "react-aria-components";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LossRecord } from "@undrr-eval/fixtures";

import { filterRecords, sortRecords, useDemo } from "../demo-state.js";
import type { SortColumn } from "../demo-state.js";

const PAGE_SIZES = [10, 25, 50] as const;

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const [sort, setSort] = useState<SortDescriptor>({
    column: "eventDate",
    direction: "descending",
  });
  const [selected, setSelected] = useState<Selection>(new Set());
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);

  const numberFormat = useMemo(() => new Intl.NumberFormat(bcp47), [bcp47]);
  const decimalFormat = useMemo(
    () => new Intl.NumberFormat(bcp47, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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

  const visible = useMemo(() => {
    const filtered = filterRecords(LOSS_RECORDS, query);
    return sortRecords(
      filtered,
      (sort.column ?? "eventDate") as SortColumn,
      sort.direction ?? "ascending",
      bcp47,
    );
  }, [query, sort, bcp47]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = visible.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const selectedCount = selected === "all" ? visible.length : selected.size;

  return (
    <section className="demo-section" id="section-6" aria-labelledby="s6">
      <h3 className="demo-section__title" id="s6">
        6. Data table, {LOSS_RECORDS.length} rows
      </h3>

      <div className="demo-tabletools">
        <SearchField
          className="demo-field demo-field--inline"
          value={query}
          onChange={(next) => {
            setQuery(next);
            setPage(0);
          }}
        >
          <Label className="demo-label">{labels.actionFilter}</Label>
          <Input className="demo-input" />
        </SearchField>

        <div className="demo-field demo-field--inline">
          <label className="demo-label" htmlFor="page-size">
            Rows per page
          </label>
          {/* Native select: React Aria's Select is demonstrated in section 2,
              and a second one here would add cost without adding evidence. */}
          <select
            id="page-size"
            className="demo-input"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <p className="demo-tabletools__status" role="status">
          {visible.length} / {LOSS_RECORDS.length} · {selectedCount} selected
        </p>
      </div>

      {/* ResizableTableContainer + ColumnResizer give drag and keyboard resizing. */}
      <ResizableTableContainer className="demo-tablewrap">
        <Table
          className="demo-table"
          aria-label={labels.navRecords}
          sortDescriptor={sort}
          onSortChange={setSort}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={setSelected}
        >
          <TableHeader>
            {/* The select-all checkbox. Nothing renders here without it. */}
            <Column id="selection" minWidth={48} className="demo-table__column demo-table__column--select">
              <SelectionCheckbox />
            </Column>
            <Column id="country" isRowHeader allowsSorting minWidth={120} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colCountry}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="hazardType" allowsSorting minWidth={120} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colHazard}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="eventDate" allowsSorting minWidth={120} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colEventDate}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="reportedAt" allowsSorting minWidth={150} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colReportedAt}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="peopleAffected" allowsSorting minWidth={110} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colPeopleAffected}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="economicLossUsdMillions" allowsSorting minWidth={140} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colEconomicLoss}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="verificationStatus" allowsSorting minWidth={120} className="demo-table__column">
              <div className="demo-table__columnInner">
                <span>{labels.colStatus}</span>
                <ColumnResizerControl />
              </div>
            </Column>
            <Column id="reviewNote" minWidth={200} className="demo-table__column">
              {labels.colReviewNote}
            </Column>
          </TableHeader>

          <TableBody items={rows} renderEmptyState={() => <span>{labels.stateEmpty}</span>}>
            {(record: LossRecord) => (
              <Row id={record.id} className="demo-table__row">
                <Cell className="demo-table__cell demo-table__cell--select">
                  <SelectionCheckbox />
                </Cell>
                <Cell className="demo-table__cell">{record.country}</Cell>
                <Cell className="demo-table__cell">{record.hazardType}</Cell>
                <Cell className="demo-table__cell">
                  {dateFormat.format(new Date(`${record.eventDate}T00:00:00Z`))}
                </Cell>
                <Cell className="demo-table__cell">
                  {dateTimeFormat.format(new Date(record.reportedAt))}
                </Cell>
                <Cell className="demo-table__cell demo-table__cell--num">
                  {numberFormat.format(record.peopleAffected)}
                </Cell>
                <Cell className="demo-table__cell demo-table__cell--num">
                  {decimalFormat.format(record.economicLossUsdMillions)}
                </Cell>
                <Cell className="demo-table__cell">
                  <span
                    className={`demo-badge demo-badge--${record.verificationStatus}`}
                  >
                    {record.verificationStatus}
                  </span>
                </Cell>
                <Cell className="demo-table__cell">{record.reviewNote ?? "—"}</Cell>
              </Row>
            )}
          </TableBody>
        </Table>
      </ResizableTableContainer>

      {/* Custom: React Aria ships no pagination component. */}
      <nav className="demo-pagination" aria-label="Pagination">
        <Button
          className="demo-button"
          isDisabled={safePage === 0}
          onPress={() => setPage(safePage - 1)}
        >
          Previous
        </Button>
        <span className="demo-pagination__status" role="status">
          Page {safePage + 1} of {pageCount}
        </span>
        <Button
          className="demo-button"
          isDisabled={safePage >= pageCount - 1}
          onPress={() => setPage(safePage + 1)}
        >
          Next
        </Button>
      </nav>
    </section>
  );
}

/** Extracted only to keep the eight column definitions readable. */
function ColumnResizerControl(): ReactElement {
  return <ColumnResizer className="demo-table__resizer" />;
}

/**
 * Row and select-all checkbox.
 *
 * `slot="selection"` is what wires it up: in the header it becomes select-all
 * with a tri-state `isIndeterminate`, in a row it toggles that row, and React
 * Aria supplies the localised accessible name for both. What it does NOT supply
 * is any visible box — the library renders a visually hidden native input and
 * leaves the appearance entirely to us, so the `<span>` below is the checkbox
 * as far as a sighted user is concerned.
 */
function SelectionCheckbox(): ReactElement {
  return (
    <Checkbox slot="selection" className="demo-checkbox">
      {({ isSelected, isIndeterminate }) => (
        <span
          className="demo-checkbox__box"
          aria-hidden="true"
          data-selected={isSelected || undefined}
          data-indeterminate={isIndeterminate || undefined}
        >
          {isIndeterminate ? "–" : isSelected ? "✓" : ""}
        </span>
      )}
    </Checkbox>
  );
}
