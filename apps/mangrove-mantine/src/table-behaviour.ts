/**
 * Data-table behaviour that Mantine does not provide.
 *
 * `@mantine/core`'s `Table` is PRESENTATIONAL ONLY. It renders `<table>` and
 * friends with spacing, striping and hover props, and that is the whole of it:
 * no sorting, no filtering, no pagination, no row selection, no column sizing.
 * There is no headless table hook in `@mantine/hooks` either. Everything in this
 * file therefore exists because the library has no answer, and every line is
 * counted in `evidence.json`.
 *
 * For scale: the delta-mui run got sort, multi-select, filter, pagination AND
 * column resize from props on one `<DataGrid />`. This file plus
 * use-column-resize.ts is the same feature set, written by hand.
 */

import type { LossRecord } from "@undrr-eval/fixtures";

/** Columns are typed so the comparator cannot be pointed at a missing field. */
export type SortableKey =
  | "country"
  | "hazardType"
  | "eventDate"
  | "reportedAt"
  | "peopleAffected"
  | "economicLossUsdMillions"
  | "verificationStatus"
  | "reviewNote";

export type ColumnKind = "string" | "enum" | "date" | "datetime" | "int" | "float" | "nullable";

export type SortDirection = "asc" | "desc";

export interface SortState {
  readonly key: SortableKey;
  readonly direction: SortDirection;
}

/**
 * The comparator a `DataGrid` would have supplied.
 *
 * Locale-aware for strings, which matters: the fixtures include accented French
 * and German labels, and a naive `<` sorts those by code point so "Éthiopie"
 * lands after "Zimbabwe". ISO dates and datetimes sort correctly as strings by
 * construction, so they are compared as strings deliberately rather than parsed
 * into `Date` — which also keeps this free of any clock.
 */
export function compareRecords(
  a: LossRecord,
  b: LossRecord,
  sort: SortState,
  collator: Intl.Collator,
): number {
  const left = a[sort.key];
  const right = b[sort.key];
  const sign = sort.direction === "asc" ? 1 : -1;

  // Nullable column: nulls sort last regardless of direction.
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * sign;
  }

  return collator.compare(String(left), String(right)) * sign;
}

export interface FilterState {
  /** Free-text query, matched against country, data source and narrative. */
  readonly query: string;
  /** Enum filter, empty string meaning "all". */
  readonly hazardType: string;
}

/** The predicate a `DataGrid`'s filter panel would have supplied. */
export function matchesFilter(record: LossRecord, filter: FilterState): boolean {
  if (filter.hazardType && record.hazardType !== filter.hazardType) return false;
  if (!filter.query) return true;
  const needle = filter.query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return (
    record.country.toLocaleLowerCase().includes(needle) ||
    record.dataSource.toLocaleLowerCase().includes(needle) ||
    record.narrative.toLocaleLowerCase().includes(needle)
  );
}

/** Page slicing, 1-based page number to match Mantine's `Pagination`. */
export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): readonly T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Header cell `aria-sort`. Mantine's `Table.Th` has no sorting affordance, so
 * the ARIA contract is ours to honour too, not just the visual arrow.
 */
export function ariaSortFor(
  key: SortableKey,
  sort: SortState,
): "ascending" | "descending" | "none" {
  if (sort.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}
