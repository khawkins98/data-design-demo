/**
 * Shared demo state and fixture-derived helpers.
 *
 * Everything here is plumbing the evaluation does not measure: locale selection,
 * sort comparators, filtering, the mocked load states. It exists so the section
 * components contain only Carbon usage, which is what is being compared.
 *
 * Deliberately kept the same shape as the mangrove-react-aria and delta-mui
 * runs, so the `customLinesOfCode` figures are counting the same kind of work.
 *
 * No `new Date()` anywhere. `TODAY_ISO` and `DEFAULT_RANGE` are the only clock.
 */

import { createContext, useContext } from "react";

import { LABELS, LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord } from "@undrr-eval/fixtures";

export interface DemoContextValue {
  readonly locale: LocaleCode;
  readonly labels: LabelSet;
  /** BCP 47 tag for Intl formatting. */
  readonly bcp47: string;
  readonly dir: "ltr" | "rtl";
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoContext");
  return value;
}

export function labelsFor(locale: LocaleCode): LabelSet {
  return LABELS[locale];
}

/*
 * NO SORT COMPARATOR AND NO FILTER PREDICATE HERE, and their absence is the
 * finding.
 *
 * Both the mangrove-react-aria and delta-mui runs needed application code for
 * these: 22 lines of comparator and 14 of predicate in the React Aria run, because
 * the library supplied the sort UI and ARIA but not the ordering. Carbon's
 * `DataTable` supplies both. Its comparator (read from
 * DataTable/tools/sorting.js) subtracts numbers, `localeCompare`s strings with
 * `numeric` detection, and unwraps React elements to compare their text; its
 * default `filterRows` matches the input against every cell value.
 *
 * The one thing that has to be got right is what you hand it: rows must carry RAW
 * fixture values and be formatted at render time. Pass pre-formatted strings and
 * the comparator sorts "1.234.567" before "999" — correct for the strings, wrong
 * for the data. See SectionDataTable.tsx.
 *
 * An earlier version of this file carried both helpers, copied from the React Aria
 * run for symmetry. They were never called. Deleted rather than left as dead code
 * that would have inflated `customLinesOfCode` for `table-sort` and `table-filter`
 * with work Carbon did.
 */

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

/** Carbon `Tag` colour per verification status. Presentation only. */
export const STATUS_TAG_COLOUR: Readonly<
  Record<LossRecord["verificationStatus"], "green" | "blue" | "red" | "gray">
> = Object.freeze({
  verified: "green",
  pending: "blue",
  disputed: "red",
  withdrawn: "gray",
});
