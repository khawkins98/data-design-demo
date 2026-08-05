/**
 * Section 6: data table over the 250-row fixture.
 *
 * `@mantine/core`'s `Table` is presentational only. Sorting, filtering, row
 * selection, pagination and column sizing are all in `src/table-model.ts`, which
 * exists so the cost is countable. This file is the markup that consumes it:
 * `Table`, `Table.Th`, `Checkbox`, `Pagination`, `TextInput`, `Select` — all
 * native components, wired by hand.
 *
 * What Mantine DOES give, and it is not nothing:
 *   - `Table.ScrollContainer` with `minWidth`, which is what keeps the 8-column
 *     table from overflowing the document at 390px.
 *   - `tabularNums`, `stickyHeader`, `striped`, `highlightOnHover` as props.
 *   - `Pagination` as a complete, accessible control — React Aria has no
 *     equivalent at all.
 *
 * What it does not give is the model. Every behaviour below had to be decided as
 * well as written: whether nulls sort first or last, whether select-all covers
 * the page or the filtered set, whether resizing is available from the keyboard.
 * A built-in grid answers those; here they are our answers.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LabelSet, VerificationStatus } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { useComboboxPortalProps } from "../overlay-class.js";
import {
  EMPTY_FILTER,
  PAGE_SIZES,
  filterRecords,
  pageCount,
  pageSlice,
  sortRecords,
  useColumnResize,
  useSelection,
} from "../table-model.js";
import type { FilterState, PageSize, SortState, SortableKey } from "../table-model.js";

const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: "undrrSuccess",
  pending: "undrrWarning",
  disputed: "undrrError",
  withdrawn: "undrrNeutral",
};

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

interface ColumnSpec {
  readonly key: SortableKey;
  readonly labelKey: keyof LabelSet;
  readonly width: number;
  readonly numeric?: boolean;
}

const COLUMNS: readonly ColumnSpec[] = [
  { key: "country", labelKey: "colCountry", width: 140 },
  { key: "hazardType", labelKey: "colHazard", width: 150 },
  { key: "eventDate", labelKey: "colEventDate", width: 140 },
  { key: "reportedAt", labelKey: "colReportedAt", width: 170 },
  { key: "peopleAffected", labelKey: "colPeopleAffected", width: 150, numeric: true },
  { key: "economicLossUsdMillions", labelKey: "colEconomicLoss", width: 180, numeric: true },
  { key: "verificationStatus", labelKey: "colStatus", width: 160 },
  { key: "reviewNote", labelKey: "colReviewNote", width: 240 },
];

const INITIAL_WIDTHS: Readonly<Record<string, number>> = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.width]),
);

const MIN_TABLE_WIDTH = COLUMNS.reduce((total, column) => total + column.width, 48);

/** ARIA sort value for a header, which `Table.Th` does not compute. */
function ariaSort(sort: SortState | null, key: SortableKey): "ascending" | "descending" | "none" {
  if (sort?.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

export function SectionDataTable(): ReactElement {
  const { labels, bcp47, dir } = useDemo();
  const comboboxProps = useComboboxPortalProps();

  const [sort, setSort] = useState<SortState | null>({ key: "eventDate", direction: "desc" });
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

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
    }),
    [bcp47],
  );

  const filtered = useMemo(() => filterRecords(LOSS_RECORDS, filter), [filter]);
  const sorted = useMemo(() => sortRecords(filtered, sort), [filtered, sort]);
  const totalPages = pageCount(sorted.length, pageSize);
  const safePage = Math.min(page, totalPages);
  const visible = useMemo(() => pageSlice(sorted, safePage, pageSize), [sorted, safePage, pageSize]);

  const visibleIds = useMemo(() => visible.map((record) => record.id), [visible]);
  const selection = useSelection(visibleIds);
  const { widths, onResizeStart, onResizeKeyDown, resizingKey } = useColumnResize(
    INITIAL_WIDTHS,
    dir,
  );

  const toggleSort = (key: SortableKey): void => {
    setSort((previous) => {
      if (previous?.key !== key) return { key, direction: "asc" };
      if (previous.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  return (
    <Box component="section" id="section-6" mb="s16">
      <Title order={3} mb="md">
        6. Data table, {LOSS_RECORDS.length} rows
      </Title>

      <Text size="sm" c="dimmed" mb="md" maw="68ch">
        Mantine&apos;s <code>Table</code> is presentational. Sorting, filtering,
        selection, pagination and column resize below are application code — see
        <code> src/table-model.ts</code>.
      </Text>

      <Group gap="sm" mb="md" align="flex-end" wrap="wrap">
        <TextInput
          label={`${labels.actionFilter}: ${labels.colCountry}`}
          value={filter.country}
          onChange={(event) => {
            setFilter((previous) => ({ ...previous, country: event.currentTarget.value }));
            setPage(1);
          }}
          data-testid="filter-country"
        />
        <Select
          label={`${labels.actionFilter}: ${labels.colStatus}`}
          value={filter.status === "" ? null : filter.status}
          onChange={(next) => {
            setFilter((previous) => ({
              ...previous,
              status: (next ?? "") as VerificationStatus | "",
            }));
            setPage(1);
          }}
          data={STATUSES.map((status) => ({ value: status, label: status }))}
          clearable
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
          comboboxProps={comboboxProps}
          data-testid="filter-status"
        />
        <Button
          variant="outline"
          onClick={() => {
            setFilter(EMPTY_FILTER);
            selection.clear();
            setPage(1);
          }}
        >
          {labels.actionClearFilters}
        </Button>
      </Group>

      <Text size="sm" mb="xs" data-testid="table-summary">
        {sorted.length} / {LOSS_RECORDS.length} rows · {selection.selected.size} selected
      </Text>

      <Table.ScrollContainer minWidth={MIN_TABLE_WIDTH} type="native">
        <Table
          striped
          highlightOnHover
          withTableBorder
          tabularNums
          stickyHeader
          layout="fixed"
          aria-label={labels.navRecords}
        >
          <Table.Caption>
            {labels.navRecords} — {sorted.length} rows
          </Table.Caption>
          <colgroup>
            <col style={{ width: 48 }} />
            {COLUMNS.map((column) => (
              <col key={column.key} style={{ width: widths[column.key] ?? column.width }} />
            ))}
          </colgroup>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                {/* Select-all: indeterminate state is ours to compute. */}
                <Checkbox
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.toggleAll}
                  aria-label="Select all rows on this page"
                  data-testid="select-all"
                />
              </Table.Th>
              {COLUMNS.map((column) => (
                <Table.Th
                  key={column.key}
                  aria-sort={ariaSort(sort, column.key)}
                  style={{ position: "relative" }}
                >
                  <UnstyledButton
                    onClick={() => toggleSort(column.key)}
                    className="demo-sort"
                    data-testid={`sort-${column.key}`}
                  >
                    <span>{labels[column.labelKey]}</span>
                    <span aria-hidden="true" className="demo-sort__indicator">
                      {sort?.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                    <VisuallyHidden>
                      {sort?.key === column.key
                        ? `sorted ${sort.direction === "asc" ? "ascending" : "descending"}`
                        : "not sorted"}
                    </VisuallyHidden>
                  </UnstyledButton>

                  {/* Resize handle. role=separator + arrow keys, because a
                      pointer-only affordance would not be usable. */}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${labels[column.labelKey]}`}
                    aria-valuenow={widths[column.key] ?? column.width}
                    tabIndex={0}
                    className="demo-resize"
                    data-active={resizingKey === column.key ? "true" : undefined}
                    data-testid={`resize-${column.key}`}
                    onPointerDown={(event) => onResizeStart(column.key, event)}
                    onKeyDown={(event) => onResizeKeyDown(column.key, event)}
                  />
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map((record) => (
              <Table.Tr
                key={record.id}
                {...(selection.selected.has(record.id) ? { "data-selected": "true" } : {})}
              >
                <Table.Td>
                  <Checkbox
                    checked={selection.selected.has(record.id)}
                    onChange={() => selection.toggleRow(record.id)}
                    aria-label={`Select ${record.country} ${record.eventDate}`}
                  />
                </Table.Td>
                <Table.Td>{record.country}</Table.Td>
                <Table.Td>{record.hazardType}</Table.Td>
                <Table.Td>
                  {formatters.date.format(new Date(`${record.eventDate}T00:00:00Z`))}
                </Table.Td>
                <Table.Td>{formatters.dateTime.format(new Date(record.reportedAt))}</Table.Td>
                <Table.Td style={{ textAlign: "end" }}>
                  {formatters.integer.format(record.peopleAffected)}
                </Table.Td>
                <Table.Td style={{ textAlign: "end" }}>
                  {formatters.decimal.format(record.economicLossUsdMillions)}
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={STATUS_COLOUR[record.verificationStatus]}
                    variant="light"
                    radius="sm"
                  >
                    {record.verificationStatus}
                  </Badge>
                </Table.Td>
                <Table.Td>{record.reviewNote ?? "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Group gap="md" mt="md" justify="space-between" wrap="wrap">
        <Select
          label="Rows per page"
          value={String(pageSize)}
          onChange={(next) => {
            setPageSize(next === "all" ? "all" : (Number(next) as PageSize));
            setPage(1);
          }}
          data={PAGE_SIZES.map((size) => ({
            value: String(size),
            label: size === "all" ? `All (${LOSS_RECORDS.length})` : String(size),
          }))}
          w={140}
          comboboxProps={comboboxProps}
          data-testid="page-size"
        />
        {/* Pagination itself IS native, and complete. */}
        {/* Pagination itself is complete — but its four EDGE controls ship with
            no accessible name at all (axe: button-name, critical). `getControlProps`
            is the documented fix; the defect is that it is needed. */}
        <Pagination
          value={safePage}
          onChange={setPage}
          total={totalPages}
          withEdges
          getItemProps={(pageNumber) => ({ "aria-label": `Page ${pageNumber}` })}
          getControlProps={(control) => ({
            "aria-label": {
              first: "First page",
              previous: "Previous page",
              next: "Next page",
              last: "Last page",
            }[control],
          })}
        />
      </Group>
    </Box>
  );
}
