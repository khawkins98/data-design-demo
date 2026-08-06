/**
 * Shared demo state and fixture-derived helpers.
 *
 * Everything here is plumbing the evaluation does not measure: locale
 * selection, sorting comparators, filtering. It exists so the section
 * components contain only React Aria usage, which is what is being compared.
 *
 * No `new Date()` anywhere. The fixtures' fixed `today` is the only clock.
 */

import { createContext, useContext } from "react";

import { LABELS, LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord } from "@undrr-eval/fixtures";

export interface DemoContextValue {
  readonly locale: LocaleCode;
  readonly labels: LabelSet;
  /** BCP 47 tag for Intl formatting and React Aria's I18nProvider. */
  readonly bcp47: string;
  readonly dir: "ltr" | "rtl";
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoContext");
  return value;
}

/** Convenience for sections that only need labels. */
export function useLabels(): LabelSet {
  return useDemo().labels;
}

export type SortColumn = keyof Pick<
  LossRecord,
  | "country"
  | "hazardType"
  | "eventDate"
  | "reportedAt"
  | "peopleAffected"
  | "economicLossUsdMillions"
  | "verificationStatus"
>;

export type SortDirection = "ascending" | "descending";

/**
 * Sorts records by a column.
 *
 * Handles the three underlying kinds the fixture columns use: number, ISO
 * string (which sorts correctly lexicographically), and plain string, which
 * needs locale-aware comparison so accented French and German labels order
 * sensibly rather than by code point.
 *
 * TWO BUGS THIS FUNCTION USED TO HAVE, both ours and both invisible to a test
 * that only checks `aria-sort`.
 *
 * 1. Descending was `sorted.reverse()`. `Array.prototype.sort` is required to be
 *    stable, so reversing the result also reverses the order WITHIN every group
 *    of equal keys — which is the opposite of what stability is for. On
 *    `hazardType`, ~8 distinct values across 250 rows, that means ~31 rows per
 *    group shuffled on every direction toggle: the primary key looked right while
 *    everything under it moved. Negating the comparator is the fix, and it is
 *    also cheaper — one pass, not a pass plus a reverse.
 * 2. The collator was built with `sensitivity: "base"`, which treats `a`, `á` and
 *    `A` as EQUAL. That is a matching setting, not an ordering one; here it did
 *    nothing but manufacture ties in exactly the two fixtures the locale-aware
 *    comparison exists for, French and German, and those ties then fed bug 1. The
 *    default (`"variant"`) still orders `á` next to `a` rather than by code
 *    point — which was the actual requirement — while keeping them distinct.
 *
 * The `id` tiebreak is deliberately NOT negated. Equal keys therefore hold one
 * order in both directions, so toggling direction moves only what the user asked
 * to move.
 */
export function sortRecords(
  records: readonly LossRecord[],
  column: SortColumn,
  direction: SortDirection,
  bcp47: string,
): LossRecord[] {
  const collator = new Intl.Collator(bcp47, { numeric: true });
  const factor = direction === "descending" ? -1 : 1;

  return [...records].sort((a, b) => {
    const left = a[column];
    const right = b[column];

    const primary =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : collator.compare(String(left), String(right));

    return primary === 0 ? collator.compare(a.id, b.id) : factor * primary;
  });
}

/** Case-insensitive substring match across the columns a user would search. */
export function filterRecords(
  records: readonly LossRecord[],
  query: string,
): readonly LossRecord[] {
  const trimmed = query.trim().toLocaleLowerCase();
  if (trimmed === "") return records;

  return records.filter((record) =>
    [record.country, record.hazardType, record.dataSource, record.verificationStatus]
      .join(" ")
      .toLocaleLowerCase()
      .includes(trimmed),
  );
}

/** The four table/form states the brief requires each demo to render. */
export type LoadState = "loading" | "empty" | "error" | "success";

export const LOAD_STATES: readonly LoadState[] = ["success", "loading", "empty", "error"];

/**
 * Returns the records a given load state should display.
 *
 * Mocked at the fixture boundary, as Brief 1 requires for anything that would
 * otherwise need a server.
 */
export function recordsForState(state: LoadState): readonly LossRecord[] {
  return state === "success" ? LOSS_RECORDS : [];
}

export function labelsFor(locale: LocaleCode): LabelSet {
  return LABELS[locale];
}
