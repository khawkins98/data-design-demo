/**
 * Section 3: date picker, and a date-time RANGE picker.
 *
 * THE HEADLINE FINDING OF THIS RUN, AND IT CORRECTS THE BRIEFING.
 *
 * The run was briefed that "`DateTimePicker` is SINGLE only — there is no
 * date-time range component", and that `datetime-range-picker` would therefore
 * have to be the composed two-picker fallback from docs/requirements.md.
 *
 * That is not true of @mantine/dates 9.5.1. `DateTimePicker` takes
 * `type="range"`, and the installed types and source confirm it is a real
 * implementation rather than a leftover generic:
 *
 *   - `DatePickerValue<'range'>` is `[DateValue | null, DateValue | null]`
 *   - `DateTimePicker.mjs` line 27: `const isRange = type === "range"`
 *   - `endTimePickerProps` is documented as "props passed down to the END time
 *     TimePicker component in range mode"
 *   - `allowSingleDateInRange` is typed `Type extends 'range' ? boolean : never`
 *   - `labelSeparator` formats the two endpoints into one input value
 *   - `clearIncompleteRange()` resets `[start, null]` on dropdown close
 *
 * One popover, one focus trap, one `RangeCalendar` highlighting the intervening
 * days, and two `TimePicker`s inside it — start and end. So this is `native`,
 * with zero lines of range plumbing, and it is the second candidate after React
 * Aria to clear this requirement without composing. Verified at runtime in
 * e2e/demo.spec.ts, not just from the types.
 *
 * DETERMINISM: Mantine 8+ dropped `Date` objects for plain strings —
 * `YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`, with no timezone concept at all. The
 * fixture ISO strings are sliced into that shape in demo-state.ts. This removes
 * by construction the timezone bug the react-aria run hit: there is no instant
 * to resolve, so no runner timezone can shift it.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Alert, Stack, Text, Title } from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import type { DatesRangeValue } from "@mantine/dates";

import { useDemo } from "../demo-state.js";
import {
  RANGE_END,
  RANGE_START,
  TODAY_DATE,
  parseMantineDateTime,
} from "../demo-state.js";
import { OVERLAY_CLASS } from "../overlay-class.js";

/** Portalled dropdown, outside `.demo`. */
const popoverProps = { classNames: { dropdown: OVERLAY_CLASS } } as const;

export function SectionDates(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const [eventDate, setEventDate] = useState<string | null>(TODAY_DATE);
  const [range, setRange] = useState<DatesRangeValue<string>>([
    RANGE_START,
    RANGE_END,
  ]);

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
   * A derived summary, for the screenshot and for parity with the sibling demos
   * which had to compute this themselves. The picker already prevents an
   * inverted range, so there is no validation to write.
   */
  const summary = useMemo(() => {
    const [start, end] = range;
    if (!start || !end) return null;
    const from = parseMantineDateTime(start);
    const to = parseMantineDateTime(end);
    return {
      text: `${rangeFormat.format(from)} – ${rangeFormat.format(to)}`,
      days: Math.round((to.getTime() - from.getTime()) / 86_400_000),
    };
  }, [range, rangeFormat]);

  return (
    <section id="section-3">
      <Title order={3} mb="md">
        3. Date picker and date-time range
      </Title>

      <Stack gap="md" align="flex-start">
        {/*
          date-picker: calendar plus keyboard entry through the text input.

          `clearButtonProps` carries an aria-label because Mantine's
          `InputClearButton` renders an icon-only `<button>` with NO accessible
          name, which axe reports as a critical `button-name` violation. Same
          defect as the Pagination controls in section 6. Fixable through the
          public API, but the default is inaccessible.
        */}
        <DatePickerInput
          label={labels.fieldEventDate}
          value={eventDate}
          onChange={setEventDate}
          popoverProps={popoverProps}
          clearable
          clearButtonProps={{ "aria-label": `Clear ${labels.fieldEventDate}` }}
          /* maw not w: a fixed `w` overflowed the 390px viewport by 14px. */
          w="100%"
          maw={280}
        />

        {/* datetime-range-picker: one component, one popover, both endpoints. */}
        <DateTimePicker
          type="range"
          label={labels.fieldReportingWindow}
          value={range}
          onChange={setRange}
          popoverProps={popoverProps}
          timePickerProps={{ withDropdown: true, format: "24h" }}
          endTimePickerProps={{ withDropdown: true, format: "24h" }}
          labelSeparator="→"
          w="100%"
          maw={380}
        />

        {summary ? (
          <Alert color="blue" data-testid="range-summary">
            {summary.text} ({summary.days} days)
          </Alert>
        ) : (
          <Alert color="red">{labels.validationRequired}</Alert>
        )}

        <Text size="sm" c="dimmed">
          Native range: a single <code>DateTimePicker type=&quot;range&quot;</code>{" "}
          with start and end time inputs in one popover. No composition, and no
          paid tier — @mantine/dates is MIT.
        </Text>
      </Stack>
    </section>
  );
}
