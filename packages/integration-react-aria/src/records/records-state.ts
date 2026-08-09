/**
 * State and derivations shared by the island and application views.
 *
 * This used to exist byte-for-byte in both React Aria apps. The reuse experiment
 * moved it, with the three Records components, into one package consumed by both
 * hosts. Nothing in here is host-specific; the remaining app code is composition
 * and host framing rather than a second implementation of this capability.
 *
 * Everything here is application code, not library code, and that is itself the
 * finding for these two views. React Aria supplies the table, the filter
 * controls and the dialog; it supplies no data layer at all, so filtering,
 * status faceting, pagination and the "pending delete" bookkeeping below are all
 * ours. The kitchen sink already recorded that for sort/filter/paginate; a whole
 * records screen makes the same boundary bigger rather than different.
 *
 * No `new Date()` anywhere. The fixtures' fixed clock is the only clock.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";

import { LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LossRecord, SelectOption } from "@undrr-eval/fixtures";

import { filterRecords, sortRecords, useDemo } from "../demo-state.js";
import type { SortColumn } from "../demo-state.js";

/** Sentinel key for "no filter". React Aria's Select has no empty-key concept. */
export const ANY_KEY = "__any__";

export const PAGE_SIZES = [10, 25, 50] as const;

/** Hazard facet, straight from the shared option fixture. */
export const HAZARD_OPTIONS: readonly SelectOption[] = OPTIONS_SMALL;

/**
 * Status facet, derived from the rows rather than hard-coded, so it cannot drift
 * from the fixture. The enum values are not localised in `packages/fixtures`, so
 * they render as-is here exactly as they do in the kitchen sink's status badges.
 */
export const STATUS_OPTIONS: readonly SelectOption[] = Object.freeze(
  [...new Set(LOSS_RECORDS.map((record) => record.verificationStatus))]
    .sort()
    .map((status) => ({ value: status, label: status })),
);

/**
 * Direction for a portalled overlay, which has to be applied by hand.
 *
 * THE SECOND HALF OF A DEFECT `overlay-class.ts` ALREADY DOCUMENTS. React Aria
 * portals every overlay — Popover, Modal, Tooltip — to a container appended to
 * `document.body`. `overlay-class.ts` covers what that does to the token custom
 * properties, which stop inheriting; this covers what it does to DIRECTION, which
 * is the same failure with a different inherited value.
 *
 * `dir` is set on the frame's root element, so CSS `direction` inherits down the
 * document tree to everything inside it. A portal is not inside it. In Arabic the
 * page mirrors correctly and the delete dialog renders LEFT-TO-RIGHT, with its
 * action buttons in the wrong order and its text aligned to the wrong edge.
 *
 * `I18nProvider` does not save you here: it drives the components' locale-aware
 * BEHAVIOUR through React context, which crosses a portal happily, but CSS
 * inheritance is DOM-tree-based and does not. Two different mechanisms, and only
 * one of them follows the provider.
 *
 * Caught by `e2e/app.spec.ts`, which asserts the dialog's computed `direction`
 * rather than only the page wrapper's. Every candidate that portals overlays will
 * meet this against a frame that sets `dir` on a wrapper rather than on `<html>`.
 */
export function useOverlayDir(): "ltr" | "rtl" {
  return useDemo().dir;
}

/**
 * Delay before a live region repeats itself, in milliseconds.
 *
 * Long enough that ordinary typing produces one announcement rather than one per
 * character, short enough that a Next/Previous click still feels immediate.
 */
const ANNOUNCE_DELAY_MS = 500;

/**
 * A settled copy of a value, for text that feeds a live region.
 *
 * WHY THIS EXISTS. This screen used to have TWO `role="status"` regions — the
 * filter result count and the pagination range — both driven straight off the
 * search box. Typing "Bangladesh" therefore queued twenty announcements, ten of
 * them redundant with the other ten, and a screen reader user heard the result
 * count change nine times before it meant anything. Neither region was the
 * library's; React Aria models no pagination and no filter bar, so the
 * announcement policy was ours to get wrong.
 *
 * The fix is one region, announced once the value stops moving. The visible
 * readout still updates on every keystroke — sighted users want that — and is
 * `aria-hidden` so the two copies do not both reach the accessibility tree.
 */
export function useSettled<T>(value: T, delayMs: number = ANNOUNCE_DELAY_MS): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}

export interface RecordsViewOptions {
  /** Ids removed by the delete flow. The island view passes nothing. */
  readonly excludedIds?: ReadonlySet<string>;
}

export interface RecordsView {
  readonly query: string;
  readonly setQuery: (next: string) => void;
  readonly hazard: string;
  readonly setHazard: (next: string) => void;
  readonly status: string;
  readonly setStatus: (next: string) => void;
  readonly clearFilters: () => void;
  /** True when any facet is narrowing the result set. */
  readonly isFiltered: boolean;

  readonly sort: SortDescriptor;
  readonly setSort: (next: SortDescriptor) => void;

  readonly page: number;
  readonly setPage: (next: number) => void;
  readonly pageSize: number;
  readonly setPageSize: (next: number) => void;
  readonly pageCount: number;

  /** The rows for the current page. */
  readonly rows: readonly LossRecord[];
  /** How many rows survive the filters. */
  readonly matched: number;
  /** How many rows exist at all, after deletions. */
  readonly total: number;
  /** 1-based index of the first row on this page, or 0 when empty. */
  readonly firstRow: number;
  readonly lastRow: number;
}

export function useRecordsView({ excludedIds }: RecordsViewOptions = {}): RecordsView {
  const { bcp47 } = useDemo();

  const [query, setQueryRaw] = useState("");
  const [hazard, setHazardRaw] = useState<string>(ANY_KEY);
  const [status, setStatusRaw] = useState<string>(ANY_KEY);
  const [sort, setSort] = useState<SortDescriptor>({
    column: "eventDate",
    direction: "descending",
  });
  const [pageSize, setPageSizeRaw] = useState<number>(10);
  const [page, setPage] = useState(0);

  /* Every facet change resets to the first page, or the user lands on a page
     that no longer exists. React Aria does not model this because it does not
     model pagination at all. */
  const setQuery = useCallback((next: string) => {
    setQueryRaw(next);
    setPage(0);
  }, []);
  const setHazard = useCallback((next: string) => {
    setHazardRaw(next);
    setPage(0);
  }, []);
  const setStatus = useCallback((next: string) => {
    setStatusRaw(next);
    setPage(0);
  }, []);
  const setPageSize = useCallback((next: number) => {
    setPageSizeRaw(next);
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setQueryRaw("");
    setHazardRaw(ANY_KEY);
    setStatusRaw(ANY_KEY);
    setPage(0);
  }, []);

  const available = useMemo(
    () =>
      excludedIds && excludedIds.size > 0
        ? LOSS_RECORDS.filter((record) => !excludedIds.has(record.id))
        : LOSS_RECORDS,
    [excludedIds],
  );

  const visible = useMemo(() => {
    const faceted = available.filter(
      (record) =>
        (hazard === ANY_KEY || record.hazardType === hazard) &&
        (status === ANY_KEY || record.verificationStatus === status),
    );
    return sortRecords(
      filterRecords(faceted, query),
      (sort.column ?? "eventDate") as SortColumn,
      sort.direction ?? "ascending",
      bcp47,
    );
  }, [available, hazard, status, query, sort, bcp47]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const rows = visible.slice(start, start + pageSize);

  return {
    query,
    setQuery,
    hazard,
    setHazard,
    status,
    setStatus,
    clearFilters,
    isFiltered: query.trim() !== "" || hazard !== ANY_KEY || status !== ANY_KEY,
    sort,
    setSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    rows,
    matched: visible.length,
    total: available.length,
    firstRow: visible.length === 0 ? 0 : start + 1,
    lastRow: start + rows.length,
  };
}
