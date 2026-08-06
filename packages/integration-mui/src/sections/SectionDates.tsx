/**
 * Section 3: date picker, and date-time range via two composed pickers.
 *
 * THE BLOCKER, AND WHY THIS IS `composed` RATHER THAN `unsupported`.
 *
 * MUI's range pickers — DateRangePicker, DateTimeRangePicker — live only in
 * `@mui/x-date-pickers-pro`, whose licence field is "SEE LICENSE IN LICENSE": a
 * commercial package. Brief 1 forbids paid, trial and evaluation licences, and
 * forbids substituting a third-party package to fill the gap. Verified
 * empirically rather than from memory: the community package ships zero `Range*`
 * components (see licences.md).
 *
 * Per docs/requirements.md the prescribed answer is to compose two free-tier
 * `DateTimePicker`s, derive the range in application code, and validate that end
 * is not before start. That is what this does.
 *
 * What a native range picker would have given us, which this does not:
 *
 *   - One calendar showing both endpoints with the intervening days highlighted.
 *     Here there are two independent calendars and the user must hold the range
 *     in their head.
 *   - Drag-to-select across a range.
 *   - A single source of truth for validity. minDateTime/maxDateTime wired
 *     between the two pickers DO disable out-of-order days in each calendar, so
 *     inversion is not reachable through the UI. But the wiring is ours, and
 *     typed input still needs the explicit check below.
 *   - One popover and one focus trap to keyboard through, instead of two.
 *   - Shared "now editing the end" state, so tabbing from start to end does not
 *     re-enter a fresh picker.
 *   - A single accessible name for the range as a concept. Screen reader users
 *     get two unrelated date-time fields.
 *
 * All dates derive from the fixtures' fixed values. No `new Date()`.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";

import { DEFAULT_RANGE, TODAY_ISO } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/** Parsed once from the fixtures, in UTC, so rendering never depends on the host machine. */
const TODAY = new Date(TODAY_ISO);
const RANGE_START = new Date(DEFAULT_RANGE.startIso);
const RANGE_END = new Date(DEFAULT_RANGE.endIso);

export function SectionDates(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const [eventDate, setEventDate] = useState<Date | null>(TODAY);
  const [start, setStart] = useState<Date | null>(RANGE_START);
  const [end, setEnd] = useState<Date | null>(RANGE_END);

  /**
   * The range logic a native component would own. Custom code, counted as such.
   */
  const range = useMemo(() => {
    if (!start || !end) {
      return { valid: false, reason: "incomplete" as const, durationDays: null };
    }
    if (end.getTime() < start.getTime()) {
      return { valid: false, reason: "inverted" as const, durationDays: null };
    }
    const ms = end.getTime() - start.getTime();
    return {
      valid: true,
      reason: null,
      durationDays: Math.round(ms / 86_400_000),
    };
  }, [start, end]);

  const rangeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(bcp47, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [bcp47],
  );

  return (
    <Box component="section" id="section-3" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        3. Date picker and date-time range
      </Typography>

      <Stack spacing={3}>
        <DatePicker
          label={labels.fieldEventDate}
          value={eventDate}
          onChange={setEventDate}
          slotProps={{ textField: { fullWidth: false } }}
        />

        <Box>
          <Typography variant="subtitle2" component="p" sx={{ mb: 1 }}>
            {labels.fieldReportingWindow}
          </Typography>

          {/* Two independent pickers standing in for one range component. */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
            <DateTimePicker
              label={`${labels.fieldReportingWindow} — start`}
              value={start}
              onChange={setStart}
              // ampm=false and minute views give the granularity the Pro range
              // picker would have provided via a single `granularity` prop.
              ampm={false}
              views={["year", "month", "day", "hours", "minutes"]}
              // Conditional spread, not `end ?? undefined`: MUI types this as
              // `Date`, so passing undefined fails exactOptionalPropertyTypes.
              {...(end ? { maxDateTime: end } : {})}
              slotProps={{
                textField: {
                  error: range.reason === "inverted",
                  helperText: range.reason === "inverted" ? labels.validationRange : " ",
                },
              }}
            />

            <DateTimePicker
              label={`${labels.fieldReportingWindow} — end`}
              value={end}
              onChange={setEnd}
              ampm={false}
              views={["year", "month", "day", "hours", "minutes"]}
              {...(start ? { minDateTime: start } : {})}
              slotProps={{
                textField: {
                  error: range.reason === "inverted",
                  helperText: range.reason === "inverted" ? labels.validationRange : " ",
                },
              }}
            />
          </Stack>

          {/* The derived range: a native component would render this itself. */}
          {range.valid && start && end ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              {rangeFormat.format(start)} – {rangeFormat.format(end)} ({range.durationDays}{" "}
              days)
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mt: 1 }}>
              {range.reason === "inverted" ? labels.validationRange : labels.validationRequired}
            </Alert>
          )}

          <Typography variant="caption" component="p" sx={{ mt: 1 }} color="text.secondary">
            Composed from two free-tier DateTimePickers. MUI&apos;s range pickers
            are commercially licensed; see EVIDENCE.md for what this loses.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
