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
 */
export function sortRecords(
  records: readonly LossRecord[],
  column: SortColumn,
  direction: SortDirection,
  bcp47: string,
): LossRecord[] {
  const collator = new Intl.Collator(bcp47, { numeric: true, sensitivity: "base" });

  const sorted = [...records].sort((a, b) => {
    const left = a[column];
    const right = b[column];

    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }
    return collator.compare(String(left), String(right));
  });

  return direction === "descending" ? sorted.reverse() : sorted;
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

/**
 * Delta's own utility-class strings, reused verbatim so candidate chrome is
 * indistinguishable from host chrome.
 *
 * These are copied from `packages/host-delta/src/HostShell.tsx` rather than
 * written fresh, because of a hard constraint on this host: `host-delta.src.css`
 * declares `@source "./HostShell.tsx"`, so Tailwind emits ONLY the 75 utilities
 * the host shell itself uses. An app-level Tailwind class that the host does
 * not already use produces no CSS at all — silently, with no build error.
 *
 * That is not a candidate finding, it is a property of consuming a prebuilt
 * host stylesheet, and it is recorded in EVIDENCE.md because it bounds how far
 * "style it with Tailwind like Delta does" can go in any of the four Delta
 * pairings.
 */
export const DELTA_CARD_CLASS = "rounded border border-slate-300 bg-white p-4 shadow-sm";
export const DELTA_CARD_TITLE_CLASS = "font-semibold text-slate-900";
export const DELTA_CARD_BODY_CLASS = "mt-1 text-sm text-slate-600";
export const DELTA_BUTTON_BASE_CLASS =
  "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-semibold " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";
export const DELTA_NAV_LINK_CLASS =
  "block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline " +
  "hover:border-sky-800 hover:bg-sky-50";
