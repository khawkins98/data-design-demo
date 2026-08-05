/**
 * Section 3: date picker, and a NATIVE date-time range picker.
 *
 * THE HEADLINE FINDING OF THIS RUN.
 *
 * The brief expected `datetime-range-picker` to be `composed` here, on the
 * understanding that Mantine's `DateTimePicker` is single-value only. That is
 * true of Mantine 8 and earlier. It is NOT true of 9.5.1, the version installed:
 *
 *   DateTimePickerProps<Type extends DatePickerType = 'default'> {
 *     type?: Type;                       // 'default' | 'multiple' | 'range'
 *     endTimePickerProps?: ...           // "the end time TimePicker in range mode"
 *     allowSingleDateInRange?: Type extends 'range' ? boolean : never;
 *     labelSeparator?: string;
 *   }
 *
 * Verified by reading the shipped types AND the implementation
 * (`InlineDateTimePicker.mjs`, `isRange = type === "range"`, `handleRangeDateChange`,
 * separate `startTimeValue`/`endTimeValue`), and then by driving it in the browser
 * from e2e/demo.spec.ts.
 *
 * So `status: "native"`. Concretely, against the two-picker fallback the delta-mui
 * run had to build, this gives:
 *
 *   - ONE calendar with both endpoints and the intervening days highlighted
 *   - drag-to-select across the range
 *   - ONE popover, ONE focus trap, and a shared "now editing the end" state
 *   - a single accessible name for the range as a concept
 *   - inversion unreachable through the calendar: the second click always
 *     becomes the end
 *
 * That is the whole of MUI's `@mui/x-date-pickers-pro` value proposition for this
 * requirement, in an MIT package.
 *
 * TWO REAL COSTS, both worth recording:
 *
 * 1. Mantine 9 date components speak timezone-less STRINGS ("YYYY-MM-DD HH:mm:ss"),
 *    not `Date`. Converting from the fixtures' UTC ISO instants is exact only if
 *    done by string slicing; going through `new Date(...)` and back would apply
 *    the runner's offset and silently shift the fixture. See `isoToPickerString`.
 * 2. There is no `minTime`/`maxTime` per endpoint, so a range that is valid by
 *    date but inverted by time-of-day within the same day is reachable. The check
 *    below is ours.
 *
 * No `new Date()` with no argument anywhere.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Alert, Box, Stack, Text, Title } from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import type { DatesRangeValue } from "@mantine/dates";

import { DEFAULT_RANGE, TODAY_ISO } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { useDatePopoverProps } from "../overlay-class.js";

/**
 * "2026-05-01T00:00:00.000Z" -> "2026-05-01 00:00:00".
 *
 * Pure string surgery on purpose. The fixture instants are UTC and Mantine's
 * picker strings carry no zone, so slicing is lossless; parsing to `Date` and
 * reformatting would apply the local offset.
 */
function isoToPickerString(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

/** The inverse, pinned back to UTC so duration maths is zone-independent. */
function pickerStringToUtc(value: string): Date {
  return new Date(`${value.slice(0, 10)}T${value.slice(11, 19)}Z`);
}

const TODAY_DATE = TODAY_ISO.slice(0, 10);
const RANGE_DEFAULT: DatesRangeValue<string> = [
  isoToPickerString(DEFAULT_RANGE.startIso),
  isoToPickerString(DEFAULT_RANGE.endIso),
];

export function SectionDates(): ReactElement {
  const { labels, bcp47 } = useDemo();
  const popoverProps = useDatePopoverProps();

  const [eventDate, setEventDate] = useState<string | null>(TODAY_DATE);
  const [range, setRange] = useState<DatesRangeValue<string>>(RANGE_DEFAULT);

  const rangeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(bcp47, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [bcp47],
  );

  /**
   * Derived range state. A native range picker owns selection but not meaning:
   * the duration and the same-day time inversion check are still ours.
   */
  const derived = useMemo(() => {
    const [start, end] = range;
    if (!start || !end) {
      return { valid: false, inverted: false, durationDays: null, summary: null };
    }
    const startUtc = pickerStringToUtc(start);
    const endUtc = pickerStringToUtc(end);
    if (endUtc.getTime() < startUtc.getTime()) {
      return { valid: false, inverted: true, durationDays: null, summary: null };
    }
    return {
      valid: true,
      inverted: false,
      durationDays: Math.round((endUtc.getTime() - startUtc.getTime()) / 86_400_000),
      summary: `${rangeFormat.format(startUtc)} – ${rangeFormat.format(endUtc)}`,
    };
  }, [range, rangeFormat]);

  return (
    <Box component="section" id="section-3" mb="s16">
      <Title order={3} mb="md">
        3. Date picker and date-time range
      </Title>

      <Stack gap="md" maw="40rem">
        <DatePickerInput
          label={labels.fieldEventDate}
          description="Calendar and keyboard entry"
          value={eventDate}
          onChange={setEventDate}
          popoverProps={popoverProps}
          clearable
          // Mantine's clear button renders with no accessible name (axe:
          // button-name, critical). Documented prop, undocumented requirement.
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
        />

        <Box>
          <DateTimePicker
            type="range"
            label={labels.fieldReportingWindow}
            description="One calendar, both endpoints, a start time and an end time"
            value={range}
            onChange={setRange}
            withSeconds={false}
            valueFormat="DD/MM/YYYY HH:mm"
            popoverProps={popoverProps}
            error={derived.inverted ? labels.validationRange : false}
            data-testid="datetime-range"
          />

          {/* Derived, not rendered by the picker: the duration is application meaning. */}
          {derived.valid ? (
            <Alert color="undrrInfo" variant="light" mt="sm" role="status">
              {derived.summary} ({derived.durationDays} days)
            </Alert>
          ) : (
            <Alert color="undrrError" variant="light" mt="sm" role="alert">
              {derived.inverted ? labels.validationRange : labels.validationRequired}
            </Alert>
          )}

          <Text size="xs" c="dimmed" mt="xs">
            Native range picker from the MIT-licensed <code>@mantine/dates</code> 9.5.1:
            one calendar, one popover, one focus trap. No commercial tier involved.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}
