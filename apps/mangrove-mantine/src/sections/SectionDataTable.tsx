/**
 * Section 6: data table over the 250-row fixture.
 *
 * THE SECTION THAT SEPARATES MANTINE FROM THE OTHER CANDIDATES, and not
 * favourably. `@mantine/core`'s `Table` is presentational: it renders the table
 * elements with spacing, striping, hover and sticky-header props, and provides
 * NO behaviour at all. There is no `sortable`, no `checkboxSelection`, no filter
 * model, no pagination model and no column sizing.
 *
 * What Mantine did contribute here, and it is not nothing:
 *   - `Table` + `Table.ScrollContainer` for the markup and the overflow
 *   - `Checkbox` with a real `indeterminate` prop for the select-all
 *   - `Pagination`, a complete accessible pager with ellipsis and edge controls
 *   - `Select` for the page-size control, `TextInput` for the filter
 *   - `Badge` for the status column
 *
 * What we had to write: the comparator, the filter predicate, the page slice,
 * the selection set, the `aria-sort` contract, the sort buttons, and the whole
 * of column resizing. See table-behaviour.ts and use-column-resize.ts.
 *
 * So: `table-render` is native, `table-sort`/`table-multiselect`/`table-filter`/
 * `table-paginate` are composed, `table-column-resize-or-reorder` is custom.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Badge,
  Checkbox,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";

import { LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { VerificationStatus } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { OVERLAY_CLASS } from "../overlay-class.js";
import {
  ariaSortFor,
  compareRecords,
  matchesFilter,
  pageCount,
  pageSlice,
} from "../table-behaviour.js";
import type { ColumnKind, SortState, SortableKey } from "../table-behaviour.js";
import { useColumnResize } from "../use-column-resize.js";

const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: "green",
  pending: "yellow",
  disputed: "red",
  withdrawn: "gray",
};

const COLUMN_WIDTHS: Record<SortableKey, number> = {
  country: 150,
  hazardType: 160,
  eventDate: 140,
  reportedAt: 170,
  peopleAffected: 150,
  economicLossUsdMillions: 180,
  verificationStatus: 160,
  reviewNote: 260,
};

const PAGE_SIZES = ["10", "25", "50"];

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const [sort, setSort] = useState<SortState>({ key: "eventDate", direction: "desc" });
  const [query, setQuery] = useState("");
  const [hazardType, setHazardType] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const resize = useColumnResize(COLUMN_WIDTHS);

  const formatters = useMemo(
    () => ({
      integer: new Intl.NumberFormat(bcp47),
      decimal: new Intl.NumberFormat(bcp47, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      date: new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
      dateTime: new Intl.DateTimeFormat(bcp47, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      }),
      collator: new Intl.Collator(bcp47, { numeric: true, sensitivity: "base" }),
    }),
    [bcp47],
  );

  const columns: ReadonlyArray<{
    key: SortableKey;
    label: string;
    kind: ColumnKind;
    numeric?: boolean;
  }> = useMemo(
    () => [
      { key: "country", label: labels.colCountry, kind: "string" },
      { key: "hazardType", label: labels.colHazard, kind: "enum" },
      { key: "eventDate", label: labels.colEventDate, kind: "date" },
      { key: "reportedAt", label: labels.colReportedAt, kind: "datetime" },
      { key: "peopleAffected", label: labels.colPeopleAffected, kind: "int", numeric: true },
      {
        key: "economicLossUsdMillions",
        label: labels.colEconomicLoss,
        kind: "float",
        numeric: true,
      },
      { key: "verificationStatus", label: labels.colStatus, kind: "enum" },
      { key: "reviewNote", label: labels.colReviewNote, kind: "nullable" },
    ],
    [labels],
  );

  /** Filter, then sort, then page: the pipeline a DataGrid owns internally. */
  const filtered = useMemo(
    () =>
      LOSS_RECORDS.filter((record) =>
        matchesFilter(record, { query, hazardType: hazardType ?? "" }),
      ),
    [query, hazardType],
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRecords(a, b, sort, formatters.collator)),
    [filtered, sort, formatters.collator],
  );

  const size = Number(pageSize);
  const totalPages = pageCount(sorted.length, size);
  const currentPage = Math.min(page, totalPages);
  const visible = pageSlice(sorted, currentPage, size);

  const allVisibleSelected =
    visible.length > 0 && visible.every((record) => selected.has(record.id));
  const someVisibleSelected =
    visible.some((record) => selected.has(record.id)) && !allVisibleSelected;

  function toggleAllVisible(): void {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visible.forEach((record) => next.delete(record.id));
      } else {
        visible.forEach((record) => next.add(record.id));
      }
      return next;
    });
  }

  function toggleRow(id: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSort(key: SortableKey): void {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
    setPage(1);
  }

  function cellValue(
    record: (typeof LOSS_RECORDS)[number],
    key: SortableKey,
  ): ReactElement | string {
    switch (key) {
      case "eventDate":
        return formatters.date.format(new Date(`${record.eventDate}T00:00:00Z`));
      case "reportedAt":
        return formatters.dateTime.format(new Date(record.reportedAt));
      case "peopleAffected":
        return formatters.integer.format(record.peopleAffected);
      case "economicLossUsdMillions":
        return formatters.decimal.format(record.economicLossUsdMillions);
      case "verificationStatus":
        return (
          <Badge color={STATUS_COLOUR[record.verificationStatus]} radius="pill" variant="light">
            {record.verificationStatus}
          </Badge>
        );
      case "reviewNote":
        return record.reviewNote ?? "—";
      default:
        return String(record[key]);
    }
  }

  return (
    <section id="section-6">
      <Title order={3} mb="md">
        6. Data table, {LOSS_RECORDS.length} rows
      </Title>

      <Group mb="sm" align="flex-end" wrap="wrap">
        <TextInput
          label={labels.actionFilter}
          placeholder={labels.colCountry}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setPage(1);
          }}
        />
        <Select
          label={labels.colHazard}
          data={OPTIONS_SMALL.map((o) => ({ value: o.value, label: o.label }))}
          value={hazardType}
          onChange={(next) => {
            setHazardType(next);
            setPage(1);
          }}
          clearable
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
          placeholder={labels.actionClearFilters}
          comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
        />
        <Select
          label="Rows per page"
          data={PAGE_SIZES}
          value={pageSize}
          onChange={(next) => {
            setPageSize(next ?? "10");
            setPage(1);
          }}
          w={110}
          allowDeselect={false}
          comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
        />
        <Text size="sm" c="dimmed" data-testid="table-count">
          {sorted.length} of {LOSS_RECORDS.length} rows, {selected.size} selected
        </Text>
      </Group>

      <Table.ScrollContainer minWidth={900}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          tabularNums
          layout="fixed"
          aria-label={labels.navRecords}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={44}>
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={toggleAllVisible}
                />
              </Table.Th>
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  className="demo-th"
                  w={resize.widths[column.key]}
                  aria-sort={ariaSortFor(column.key, sort)}
                  ta={column.numeric ? "end" : undefined}
                >
                  <UnstyledButton
                    className="demo-sort"
                    data-numeric={column.numeric ? "true" : undefined}
                    onClick={() => toggleSort(column.key)}
                    aria-label={`Sort by ${column.label}`}
                  >
                    <Text span size="sm" fw="semibold" className="demo-sort__label">
                      {column.label}
                    </Text>
                    <span aria-hidden="true" className="demo-sort__indicator">
                      {sort.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </UnstyledButton>
                  {/* No Mantine primitive exists for this. See use-column-resize.ts. */}
                  <span {...resize.handleProps(column.key, column.label)} />
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map((record) => (
              <Table.Tr
                key={record.id}
                {...(selected.has(record.id) ? { "data-selected": true } : {})}
              >
                <Table.Td>
                  <Checkbox
                    aria-label={`Select ${record.country} ${record.eventDate}`}
                    checked={selected.has(record.id)}
                    onChange={() => toggleRow(record.id)}
                  />
                </Table.Td>
                {columns.map((column) => (
                  <Table.Td key={column.key} ta={column.numeric ? "end" : undefined}>
                    {cellValue(record, column.key)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
            {visible.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length + 1}>{labels.stateEmpty}</Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Group mt="md" justify="space-between" wrap="wrap">
        {/*
          `getControlProps` is needed for accessibility, not polish. Mantine's
          first/previous/next/last controls are icon-only `<button>`s with NO
          accessible name of their own, which axe reports as a CRITICAL
          `button-name` violation out of the box. The numbered controls are fine
          because their text content names them. Recorded in EVIDENCE.md: it is
          fixable through the public API, but the default is inaccessible.
        */}
        <Pagination
          total={totalPages}
          value={currentPage}
          onChange={setPage}
          withEdges
          siblings={1}
          getControlProps={(control) => ({
            "aria-label": {
              first: "First page",
              previous: "Previous page",
              next: "Next page",
              last: "Last page",
            }[control],
          })}
        />
        <Text size="sm" c="dimmed">
          Page {currentPage} of {totalPages}
        </Text>
      </Group>
    </section>
  );
}
