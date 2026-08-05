/**
 * Shared demo state and fixture-derived helpers.
 *
 * Deliberately the same shape as the mangrove-react-aria and delta-mui
 * equivalents, so the runs differ in candidate usage rather than scaffolding.
 *
 * No `new Date()` anywhere. Mantine 8+ dates are plain strings
 * (`YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`) with no timezone, so the fixture ISO
 * strings are sliced rather than parsed — which removes the whole class of
 * timezone drift the react-aria run hit with `parseAbsoluteToLocal`.
 */

import { createContext, useContext } from "react";

import { LABELS, TODAY_ISO, DEFAULT_RANGE } from "@undrr-eval/fixtures";
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

/* ------------------------------------------------------------------ *
 * Fixture ISO -> Mantine date string, by slicing. No Date involved.
 * ------------------------------------------------------------------ */

/** `2026-06-15T09:30:00.000Z` -> `2026-06-15`. */
export const TODAY_DATE = TODAY_ISO.slice(0, 10);

/** `2026-06-15T09:30:00.000Z` -> `2026-06-15 09:30:00`. */
function toMantineDateTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

export const RANGE_START = toMantineDateTime(DEFAULT_RANGE.startIso);
export const RANGE_END = toMantineDateTime(DEFAULT_RANGE.endIso);

/**
 * Parses one of Mantine's date-time strings as UTC so `Intl` formatting and
 * duration arithmetic are runner-independent.
 */
export function parseMantineDateTime(value: string): Date {
  return new Date(`${value.slice(0, 10)}T${value.slice(11, 19) || "00:00:00"}Z`);
}
