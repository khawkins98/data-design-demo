/**
 * Section 3: date picker, and date-time range composed from Carbon parts.
 *
 * WHAT CARBON GIVES AND WHAT IT DOES NOT.
 *
 * `DatePicker` takes `datePickerType: 'simple' | 'single' | 'range'`. The `range`
 * variant is FREE and NATIVE, and it is a true range: one calendar, two inputs,
 * the intervening days highlighted, click-and-drag across the range, one popover
 * and one focus context. That is materially more than MUI's community tier gives
 * — MUI's range pickers are commercially licensed, so the MUI run had to compose
 * two entirely separate pickers and lost the shared calendar.
 *
 * What Carbon does NOT have is a date-TIME range. `DatePicker` is date-only at
 * every granularity; time lives in a separate `TimePicker` component, and there
 * is no prop, variant or flag that joins them. So `datetime-range-picker` is
 * `composed`: `DatePicker[type=range]` supplies both dates, and two `TimePicker`s
 * supply the two times.
 *
 * Precisely what the composition costs, relative to a real date-time range control:
 *
 *   - Time is disconnected from the calendar. Picking 3 May in the calendar does
 *     not move focus to the start time, and changing the start time does not
 *     re-validate against the calendar. The user assembles the endpoints from two
 *     unrelated widgets.
 *   - Same-day ranges are unguarded by the library. flatpickr's minDate/maxDate
 *     stop an end DATE before a start date, but when both dates are the same day
 *     nothing stops an end TIME before a start time. That check is ours, below.
 *   - No single accessible name for the range. A screen reader user encounters
 *     four fields: two date inputs (which Carbon does associate as a range) and
 *     two time inputs (which it does not associate with anything).
 *   - The derived duration is ours. Carbon renders no summary of the selection.
 *   - `TimePicker` is a free-text input with a `pattern`, not a time spinner. It
 *     accepts "99:99" and reports nothing; the validity check is ours.
 *
 * A SEPARATE, SHARPER FINDING: flatpickr formats dates with a printf-style
 * pattern string (`dateFormat="d/m/Y"`), not with `Intl`. There is no way to make
 * the picker's own input render `15 Jun 2026` in English and `15 juin 2026` in
 * French — you choose one pattern for all locales. Carbon's `locale` prop swaps
 * flatpickr's month and weekday NAMES inside the calendar, but not the input
 * format. Every other formatted value on this page comes from `Intl` with
 * `timeZone: "UTC"`; the two date inputs are the exception, and they cannot be
 * fixed without replacing flatpickr.
 *
 * All dates derive from the fixtures' fixed values. No `new Date()`.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  DatePicker,
  DatePickerInput,
  InlineNotification,
  TimePicker,
} from "@carbon/react";

import { DEFAULT_RANGE, FIXED_TIME_ZONE, TODAY_ISO } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { useOverlayHost } from "../overlay-scope.js";

/** Parsed once from the fixtures, in UTC, so rendering never depends on the runner. */
const TODAY = new Date(TODAY_ISO);
const RANGE_START = new Date(DEFAULT_RANGE.startIso);
const RANGE_END = new Date(DEFAULT_RANGE.endIso);

/** flatpickr's locale keys happen to match the fixture codes for all four. */
const FLATPICKR_LOCALE: Readonly<Record<LocaleCode, "en" | "fr" | "de" | "ar">> = {
  en: "en",
  fr: "fr",
  de: "de",
  ar: "ar",
};

/** `HH:mm` in UTC, without Intl, so the value round-trips through TimePicker. */
function toTimeValue(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Combines a calendar date with an `HH:mm` string, in UTC. */
function combine(date: Date | null, time: string): Date | null {
  if (!date || !TIME_PATTERN.test(time)) return null;
  const [hours = "0", minutes = "0"] = time.split(":");
  const combined = new Date(date.getTime());
  combined.setUTCHours(Number(hours), Number(minutes), 0, 0);
  return combined;
}

export function SectionDates(): ReactElement {
  const { labels, bcp47, locale } = useDemo();
  const overlay = useOverlayHost();

  const [eventDate, setEventDate] = useState<Date | null>(TODAY);
  const [startDate, setStartDate] = useState<Date | null>(RANGE_START);
  const [endDate, setEndDate] = useState<Date | null>(RANGE_END);
  const [startTime, setStartTime] = useState(toTimeValue(RANGE_START));
  const [endTime, setEndTime] = useState(toTimeValue(RANGE_END));

  /** The range logic a real date-time range component would own. */
  const range = useMemo(() => {
    const start = combine(startDate, startTime);
    const end = combine(endDate, endTime);

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return { start, end, valid: false, reason: "time-format" as const, durationDays: null };
    }
    if (!start || !end) {
      return { start, end, valid: false, reason: "incomplete" as const, durationDays: null };
    }
    if (end.getTime() < start.getTime()) {
      return { start, end, valid: false, reason: "inverted" as const, durationDays: null };
    }
    return {
      start,
      end,
      valid: true,
      reason: null,
      durationDays: Math.round((end.getTime() - start.getTime()) / 86_400_000),
    };
  }, [startDate, endDate, startTime, endTime]);

  const rangeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(bcp47, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: FIXED_TIME_ZONE,
      }),
    [bcp47],
  );

  const invalidMessage =
    range.reason === "time-format"
      ? labels.validationFormat
      : range.reason === "inverted"
        ? labels.validationRange
        : labels.validationRequired;

  return (
    <section id="section-3" className="demo__section">
      <h3 className="demo__heading">3. Date picker and date-time range</h3>

      {/* flatpickr appends its calendar to document.body unless told otherwise.
          This div is the alternative parent, inside the token scope. */}
      <div ref={overlay.ref} data-testid="picker-overlay-host" />

      <div className="demo__row">
        <DatePicker
          datePickerType="single"
          dateFormat="d/m/Y"
          locale={FLATPICKR_LOCALE[locale]}
          {...(eventDate ? { value: eventDate } : {})}
          {...(overlay.element ? { appendTo: overlay.element } : {})}
          onChange={(dates) => setEventDate(dates[0] ?? null)}
        >
          <DatePickerInput
            id="event-date"
            labelText={labels.fieldEventDate}
            placeholder="dd/mm/yyyy"
            helperText="Calendar or keyboard entry"
          />
        </DatePicker>
      </div>

      <div>
        <h4 className="demo__subheading">{labels.fieldReportingWindow}</h4>

        <div className="demo__range">
          {/* ONE picker, ONE calendar, both endpoints highlighted. Native. */}
          <DatePicker
            datePickerType="range"
            dateFormat="d/m/Y"
            locale={FLATPICKR_LOCALE[locale]}
            value={[startDate ?? RANGE_START, endDate ?? RANGE_END]}
            {...(overlay.element ? { appendTo: overlay.element } : {})}
            onChange={(dates) => {
              setStartDate(dates[0] ?? null);
              setEndDate(dates[1] ?? null);
            }}
          >
            <DatePickerInput
              id="range-start-date"
              labelText={`${labels.fieldReportingWindow} — start date`}
              placeholder="dd/mm/yyyy"
              invalid={range.reason === "inverted"}
              invalidText={labels.validationRange}
            />
            <DatePickerInput
              id="range-end-date"
              labelText={`${labels.fieldReportingWindow} — end date`}
              placeholder="dd/mm/yyyy"
              invalid={range.reason === "inverted"}
              invalidText={labels.validationRange}
            />
          </DatePicker>

          {/* Two separate time fields, unconnected to the calendar above. */}
          <TimePicker
            id="range-start-time"
            labelText={`${labels.fieldReportingWindow} — start time (UTC)`}
            value={startTime}
            pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
            placeholder="hh:mm"
            maxLength={5}
            invalid={!TIME_PATTERN.test(startTime)}
            invalidText={labels.validationFormat}
            onChange={(event) => setStartTime(event.target.value)}
          />

          <TimePicker
            id="range-end-time"
            labelText={`${labels.fieldReportingWindow} — end time (UTC)`}
            value={endTime}
            pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
            placeholder="hh:mm"
            maxLength={5}
            invalid={!TIME_PATTERN.test(endTime) || range.reason === "inverted"}
            invalidText={
              TIME_PATTERN.test(endTime) ? labels.validationRange : labels.validationFormat
            }
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>

        {/* The derived range. A real range component would render this itself. */}
        {range.valid && range.start && range.end ? (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={labels.fieldReportingWindow}
            subtitle={`${rangeFormat.format(range.start)} – ${rangeFormat.format(
              range.end,
            )} (${String(range.durationDays)} days)`}
          />
        ) : (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={labels.stateError}
            subtitle={invalidMessage}
          />
        )}

        <p className="demo__note">
          Composed from a native Carbon range DatePicker (one calendar, both
          endpoints, intervening days highlighted) plus two TimePickers. Carbon has
          no date-time range component; see EVIDENCE.md for what the join costs.
        </p>
      </div>
    </section>
  );
}
