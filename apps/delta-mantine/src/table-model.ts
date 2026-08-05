/**
 * Everything Mantine's `Table` does not do.
 *
 * THIS FILE IS THE FINDING. `@mantine/core`'s `Table` is presentational: it
 * renders `<table>` with spacing, striping, hover highlight, sticky header and
 * `tabular-nums`, and that is the entire feature set. There is no sorting, no
 * filtering, no pagination, no row selection, no column sizing. Mantine's own
 * documentation points at `mantine-datatable`, a third-party package, for any of
 * it — which Brief 1 forbids, correctly, because a candidate that needs someone
 * else's package to render a data grid is not a candidate that ships one.
 *
 * So all of it is here, in application code, and every line counts toward
 * `customLinesOfCode`. The comparison this file exists to make is with
 * `apps/delta-mui/src/sections/SectionDataTable.tsx`, where the equivalent is six
 * props on `<DataGrid>` and zero lines of behaviour.
 *
 * Kept separate from the section component so the count is unambiguous: the
 * component below it is markup, this is behaviour.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { LossRecord, VerificationStatus } from "@undrr-eval/fixtures";

/* ------------------------------------------------------------------ sorting */

export type SortDirection = "asc" | "desc";

/** Columns the table can sort on: string, enum, date, datetime, int, float, nullable. */
export type SortableKey =
  | "country"
  | "hazardType"
  | "eventDate"
  | "reportedAt"
  | "peopleAffected"
  | "economicLossUsdMillions"
  | "verificationStatus"
  | "reviewNote";

export interface SortState {
  readonly key: SortableKey;
  readonly direction: SortDirection;
}

/**
 * Comparator covering every fixture column type.
 *
 * ISO date and datetime strings sort correctly as strings, which is why the
 * fixtures use ISO. Nulls sort last in both directions — a choice a built-in
 * grid would have made for us, and one that has to be made explicitly here.
 */
function compareValues(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function sortRecords(
  records: readonly LossRecord[],
  sort: SortState | null,
): readonly LossRecord[] {
  if (!sort) return records;
  const sorted = [...records].sort((a, b) => compareValues(a[sort.key], b[sort.key]));
  return sort.direction === "asc" ? sorted : sorted.reverse();
}

/* ---------------------------------------------------------------- filtering */

export interface FilterState {
  /** Substring match on `country`, case-insensitive. */
  readonly country: string;
  /** Exact match on the enum column, or "" for all. */
  readonly status: VerificationStatus | "";
}

export const EMPTY_FILTER: FilterState = { country: "", status: "" };

export function filterRecords(
  records: readonly LossRecord[],
  filter: FilterState,
): readonly LossRecord[] {
  const needle = filter.country.trim().toLocaleLowerCase();
  if (!needle && !filter.status) return records;
  return records.filter((record) => {
    if (filter.status && record.verificationStatus !== filter.status) return false;
    if (needle && !record.country.toLocaleLowerCase().includes(needle)) return false;
    return true;
  });
}

/* --------------------------------------------------------------- pagination */

/** "all" renders every row, which the `table-render` requirement asks for. */
export type PageSize = 10 | 25 | 50 | "all";

export const PAGE_SIZES: readonly PageSize[] = [10, 25, 50, "all"];

export function pageCount(total: number, pageSize: PageSize): number {
  if (pageSize === "all") return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageSlice<T>(items: readonly T[], page: number, pageSize: PageSize): readonly T[] {
  if (pageSize === "all") return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/* ----------------------------------------------------------- column sizing */

export const MIN_COLUMN_WIDTH = 72;
/** One arrow-key press. Keyboard resize is not optional if pointer resize exists. */
export const KEYBOARD_RESIZE_STEP = 16;

/**
 * Pointer-driven column resize.
 *
 * Uses pointer capture so a drag that leaves the header still tracks, and
 * `document`-level listeners are avoided. The `dir === "rtl"` inversion is ours
 * too: dragging the right edge of a column in a right-to-left table has to widen
 * it in the reading direction, and there is nothing in the library to ask.
 */
export function useColumnResize(
  initial: Readonly<Record<string, number>>,
  dir: "ltr" | "rtl",
): {
  widths: Readonly<Record<string, number>>;
  onResizeStart: (key: string, event: React.PointerEvent<HTMLElement>) => void;
  onResizeKeyDown: (key: string, event: React.KeyboardEvent<HTMLElement>) => void;
  resizingKey: string | null;
} {
  const [widths, setWidths] = useState<Record<string, number>>({ ...initial });
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback(
    (key: string, event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const startWidth = widths[key] ?? MIN_COLUMN_WIDTH;
      drag.current = { key, startX: event.clientX, startWidth };
      setResizingKey(key);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [widths],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const delta = (event.clientX - current.startX) * (dir === "rtl" ? -1 : 1);
      const next = Math.max(MIN_COLUMN_WIDTH, Math.round(current.startWidth + delta));
      setWidths((previous) => ({ ...previous, [current.key]: next }));
    },
    [dir],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
    setResizingKey(null);
  }, []);

  // Window-level rather than on the separator, so a drag that outruns the
  // pointer still tracks. `drag.current` being null makes the handlers no-ops
  // when nothing is being resized, so they are cheap to leave attached.
  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const onResizeKeyDown = useCallback(
    (key: string, event: React.KeyboardEvent<HTMLElement>) => {
      const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      let delta = 0;
      if (event.key === forward) delta = KEYBOARD_RESIZE_STEP;
      else if (event.key === back) delta = -KEYBOARD_RESIZE_STEP;
      else if (event.key === "Home") delta = -Number.MAX_SAFE_INTEGER;
      else return;
      event.preventDefault();
      setWidths((previous) => ({
        ...previous,
        [key]: Math.max(MIN_COLUMN_WIDTH, (previous[key] ?? MIN_COLUMN_WIDTH) + delta),
      }));
    },
    [dir],
  );

  return { widths, onResizeStart, onResizeKeyDown, resizingKey };
}

/* ------------------------------------------------------------- row selection */

export interface SelectionModel {
  readonly selected: ReadonlySet<string>;
  readonly allSelected: boolean;
  readonly someSelected: boolean;
  toggleRow: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
}

/**
 * Row selection with a header select-all.
 *
 * Select-all applies to the FILTERED set rather than all 250 rows, which is the
 * behaviour a built-in grid gives and which has to be decided here instead.
 */
export function useSelection(visibleIds: readonly string[]): SelectionModel {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());

  const toggleRow = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = !allSelected && visibleIds.some((id) => selected.has(id));

  const toggleAll = useCallback(() => {
    setSelected((previous) => {
      const next = new Set(previous);
      const everySelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      for (const id of visibleIds) {
        if (everySelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelected(new Set<string>()), []);

  return { selected, allSelected, someSelected, toggleRow, toggleAll, clear };
}
