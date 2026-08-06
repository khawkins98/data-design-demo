/**
 * Section 3: date picker, and date-time range picker.
 *
 * WHAT CARBON HAS AND WHAT IT DOES NOT.
 *
 * `DatePicker datePickerType="range"` is a real, free, native *date* range: one
 * calendar, two inputs, the intervening days highlighted, drag-to-select, and
 * flatpickr's own keyboard handling. That is more than MUI's community tier
 * offers, and it is not behind a paid licence.
 *
 * But it is date-only. Carbon's `TimePicker` is a separate, unrelated component:
 * a plain text field with a pattern and an optional `TimePickerSelect` for
 * AM/PM or timezone. There is no `DateTimePicker` and no `DateTimeRangePicker`
 * anywhere in @carbon/react — verified against the installed package's export
 * list, not from memory.
 *
 * So `datetime-range-picker` is `composed`: the range calendar supplies both
 * dates, two TimePickers supply the two times, and joining them into a single
 * range value — parsing, duration, and "end must not precede start" — is ours.
 * The prescribed fallback in docs/requirements.md is two whole pickers; Carbon
 * needs less than that, because at least the two *dates* share one calendar.
 *
 * All values derive from the fixtures' fixed date. No `new Date()`.
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

import { calendarDateToIso, useDemo } from "../demo-state.js";

/** `2026-06-15`. flatpickr parses this with `dateFormat="Y-m-d"`. */
const TODAY_DATE = TODAY_ISO.slice(0, 10);

const RANGE_START_DATE = DEFAULT_RANGE.startIso.slice(0, 10);
const RANGE_END_DATE = DEFAULT_RANGE.endIso.slice(0, 10);
/** `00:00` and `23:59`, sliced out of the fixture rather than recomputed. */
const RANGE_START_TIME = DEFAULT_RANGE.startIso.slice(11, 16);
const RANGE_END_TIME = DEFAULT_RANGE.endIso.slice(11, 16);

const TIME_PATTERN = "([01][0-9]|2[0-3]):[0-5][0-9]";

/**
 * The initial range, hoisted to module scope so its ARRAY IDENTITY is stable.
 *
 * This matters more than it looks. Carbon's DatePicker runs
 *
 *   useEffect(() => { calendarRef.current.setDate(value); }, [value, ...])
 *
 * so an inline `value={[start, end]}` is a fresh array on every render, the
 * effect fires every render, and flatpickr is reset to the prop value every time
 * ANY state in the section changes. The symptom is brutal and gives no clue as to
 * the cause: the range calendar closes after the first of the two clicks needed to
 * pick a range, and the input reverts while the derived summary shows the new
 * date. Hoisting the array fixes it. Verified by e2e, not by reading.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- must stay a stable mutable array reference for Carbon
const INITIAL_RANGE: string[] = [RANGE_START_DATE, RANGE_END_DATE];

/**
 * Joins a `YYYY-MM-DD` and an `HH:MM` into an instant in the fixture timezone.
 *
 * Returns null for anything unparseable, which is how a half-typed time in the
 * TimePicker reaches the validation path rather than producing NaN downstream.
 */
function toInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!new RegExp(`^${TIME_PATTERN}$`).test(time)) return null;
  const instant = new Date(`${date}T${time}:00.000Z`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function SectionDates(): ReactElement {
  const { labels, bcp47 } = useDemo();

  /**
   * flatpickr appends its calendar to `document.body` by default, which puts it
   * outside the `.demo` element — so outside the `.undrr-tokens` scope AND
   * outside the scoped-CSS build's selector prefix. `appendTo` is Carbon's
   * documented escape hatch and keeps the calendar in the subtree, which fixes
   * token inheritance and scoped styling in one move. It is also the reason this
   * pairing does not hit the transparent-overlay trap.
   *
   * Held in state rather than a ref on purpose: `appendTo` is read during the
   * render that constructs the flatpickr instance, and a ref is still null then.
   * A callback ref that sets state forces the second render where it is not.
   */
  const [calendarHost, setCalendarHost] = useState<HTMLDivElement | null>(null);

  const [startDate, setStartDate] = useState(RANGE_START_DATE);
  const [endDate, setEndDate] = useState(RANGE_END_DATE);
  const [startTime, setStartTime] = useState(RANGE_START_TIME);
  const [endTime, setEndTime] = useState(RANGE_END_TIME);

  const start = toInstant(startDate, startTime);
  const end = toInstant(endDate, endTime);

  const invalidRange = start !== null && end !== null && end.getTime() < start.getTime();

  const rangeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(bcp47, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: FIXED_TIME_ZONE,
      }),
    [bcp47],
  );

  /** The derived value a native range component would have given us for free. */
  const summary = useMemo(() => {
    if (start === null || end === null) return "Incomplete range";
    const ms = end.getTime() - start.getTime();
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    return `${rangeFormat.format(start)} → ${rangeFormat.format(end)} · ${days} days ${hours}h ${minutes}m`;
  }, [start, end, rangeFormat]);

  return (
    <section className="demo-section" id="section-3" aria-labelledby="s3">
      <h3 className="demo-section__title" id="s3">
        3. Date picker and date-time range picker
      </h3>

      {/* The flatpickr calendars land in here rather than on document.body. */}
      <div className="demo-calendar-host" ref={setCalendarHost} />

      <div className="demo-grid">
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={TODAY_DATE}
          locale="en"
          {...(calendarHost ? { appendTo: calendarHost } : {})}
        >
          <DatePickerInput
            id="date-single"
            labelText={labels.fieldEventDate}
            placeholder="yyyy-mm-dd"
            helperText="Calendar or keyboard entry; the input accepts a typed ISO date."
          />
        </DatePicker>
      </div>

      <div className="demo-daterange" aria-describedby="range-summary">
        {/*
          One calendar, two inputs, intervening days highlighted. Native, free,
          and date-only.
        */}
        {/*
          `value` here is the INITIAL value, not a controlled one, and it must be
          a stable array — see INITIAL_RANGE above. `onChange` is the source of
          truth for the derived range. Carbon's date pickers are not controlled
          components in the React sense, whatever the prop name suggests.
        */}
        {/*
          `onChange` uses `calendarDateToIso`, NOT `toISOString().slice(0, 10)`.
          flatpickr builds every date it reports as `new Date(year, month, day)` —
          LOCAL midnight — so the ISO form reads the UTC day and yields the PREVIOUS
          calendar day at any positive UTC offset. Picking 1 January 2026 in
          Australia/Sydney produced "2025-12-31", and `toInstant` then fed that wrong
          day into the summary and into the end-before-start comparison. Invisible
          under the shared runner config's pinned `timezoneId: "UTC"`, which is
          exactly what made it dangerous. See demo-state.ts.
        */}
        <DatePicker
          datePickerType="range"
          dateFormat="Y-m-d"
          value={INITIAL_RANGE}
          locale="en"
          {...(calendarHost ? { appendTo: calendarHost } : {})}
          onChange={(dates) => {
            const [nextStart, nextEnd] = dates;
            if (nextStart instanceof Date) {
              setStartDate(calendarDateToIso(nextStart));
            }
            if (nextEnd instanceof Date) {
              setEndDate(calendarDateToIso(nextEnd));
            }
          }}
        >
          <DatePickerInput
            id="range-start-date"
            labelText={`${labels.fieldReportingWindow} — start date`}
            placeholder="yyyy-mm-dd"
          />
          <DatePickerInput
            id="range-end-date"
            labelText={`${labels.fieldReportingWindow} — end date`}
            placeholder="yyyy-mm-dd"
            invalid={invalidRange}
            invalidText={labels.validationRange}
          />
        </DatePicker>

        {/*
          The two times. Carbon's TimePicker is a text field with a pattern, not
          a clock: no stepper, no dropdown of times, no coupling to the calendar
          above. Wiring them into the range is what makes this `composed`.
        */}
        <TimePicker
          id="range-start-time"
          labelText="Start time (UTC)"
          value={startTime}
          pattern={TIME_PATTERN}
          maxLength={5}
          onChange={(event) => setStartTime(event.target.value)}
        />
        <TimePicker
          id="range-end-time"
          labelText="End time (UTC)"
          value={endTime}
          pattern={TIME_PATTERN}
          maxLength={5}
          invalid={invalidRange}
          invalidText={labels.validationRange}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </div>

      <p className="demo-hint" id="range-summary" role="status">
        {summary}
      </p>

      {invalidRange ? (
        /* Same validation treatment as VALIDATION_CASES, per the brief. */
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={labels.validationRange}
          subtitle="The end of the reporting window is before its start."
        />
      ) : null}
    </section>
  );
}
