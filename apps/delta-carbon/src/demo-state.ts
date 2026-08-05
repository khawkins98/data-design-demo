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
