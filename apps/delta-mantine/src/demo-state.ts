/**
 * Shared demo state and fixture-derived helpers.
 *
 * Deliberately the same shape as the mangrove-react-aria and delta-mui
 * equivalents, so the three runs differ in candidate usage rather than in
 * scaffolding.
 *
 * No `new Date()` anywhere. The fixtures' fixed values are the only clock.
 */

import { createContext, useContext } from "react";

import { LABELS } from "@undrr-eval/fixtures";
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
 * dayjs locale ids, keyed to the fixture locales.
 *
 * Mantine's date components format through dayjs, so the locale has to be
 * registered with dayjs AND named on `DatesProvider`. `en-gb` rather than `en`
 * because the fixture's BCP 47 tag is `en-GB` and the harness runs Playwright
 * with `locale: "en-GB"`.
 */
export const DAYJS_LOCALES: Readonly<Record<LocaleCode, string>> = {
  en: "en-gb",
  fr: "fr",
  de: "de",
  ar: "ar",
};
