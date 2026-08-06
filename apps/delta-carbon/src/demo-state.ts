/**
 * Shared demo state and fixture-derived helpers.
 *
 * Deliberately identical in shape to the react-aria and MUI demos' equivalents,
 * so the runs differ in candidate usage rather than in scaffolding.
 *
 * No `new Date()` anywhere. The fixtures' fixed values are the only clock, and
 * every Intl formatter is constructed with `timeZone: "UTC"`.
 */

import { createContext, useContext } from "react";

import { FIXED_TIME_ZONE, LABELS } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord } from "@undrr-eval/fixtures";

export interface DemoContextValue {
  readonly locale: LocaleCode;
  readonly labels: LabelSet;
  readonly bcp47: string;
  readonly dir: "ltr" | "rtl";
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoContext");
  return value;
}

export type LoadState = "loading" | "empty" | "error" | "success";

export const LOAD_STATES: readonly LoadState[] = ["success", "loading", "empty", "error"];

/** Mocked at the fixture boundary, per Brief 1 constraint 7. */
export function recordsForState(
  state: LoadState,
  all: readonly LossRecord[],
): readonly LossRecord[] {
  return state === "success" ? all : [];
}

export function labelsFor(locale: LocaleCode): LabelSet {
  return LABELS[locale];
}

/**
 * Formats a calendar date as `YYYY-MM-DD` from its LOCAL fields.
 *
 * WHY THIS EXISTS, and it is a bug this repo shipped rather than a Carbon defect.
 * Carbon's `DatePicker` wraps flatpickr, and every `Date` flatpickr hands to
 * `onChange` is constructed as `new Date(year, month, day)` — LOCAL midnight, not
 * UTC midnight. Calling `.toISOString().slice(0, 10)` on that reads the UTC day,
 * which at any POSITIVE UTC offset is the PREVIOUS calendar day: in
 * Australia/Sydney, picking 1 January 2026 yields "2025-12-31".
 *
 * The fixture `eventDate` values are plain `YYYY-MM-DD` strings compared as
 * strings, so a one-day shift silently moves a filter boundary and includes or
 * excludes real rows. It is invisible in CI because the shared Playwright config
 * pins `timezoneId: "UTC"`, which is exactly what made it dangerous.
 *
 * No `new Date()` here: the argument is the only clock, and only its local
 * calendar fields are read.
 */
export function calendarDateToIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Combines flatpickr's local-midnight calendar date with an `HH:mm` UTC time.
 *
 * The naive form — `new Date(date.getTime())` then `setUTCHours(...)` — mixes the
 * two frames: it keeps the local-midnight INSTANT and then overwrites its UTC
 * clock fields, so at UTC+10 the 1 January local date becomes 31 December 09:00Z.
 * Reading the local calendar fields and rebuilding through `Date.UTC` keeps the day
 * the user clicked.
 */
export function combineCalendarDateWithUtcTime(date: Date, hours: number, minutes: number): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0),
  );
}

/**
 * The Intl formatters every section shares.
 *
 * Carbon formats nothing for you — unlike MUI's DataGrid `valueFormatter` there
 * is no formatting hook on a Carbon table cell, so the cell content is already
 * a formatted string by the time Carbon sees it. That is not a criticism: it is
 * the consequence of Carbon's DataTable being a render-prop shell over your own
 * markup rather than a grid that owns its cells.
 */
export interface Formatters {
  readonly integer: Intl.NumberFormat;
  readonly decimal: Intl.NumberFormat;
  readonly date: Intl.DateTimeFormat;
  readonly dateTime: Intl.DateTimeFormat;
}

export function formattersFor(bcp47: string): Formatters {
  return {
    integer: new Intl.NumberFormat(bcp47),
    decimal: new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    date: new Intl.DateTimeFormat(bcp47, {
      dateStyle: "medium",
      timeZone: FIXED_TIME_ZONE,
    }),
    dateTime: new Intl.DateTimeFormat(bcp47, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: FIXED_TIME_ZONE,
    }),
  };
}
