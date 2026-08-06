/**
 * Section 3: date picker, and date-time range picker with time granularity.
 *
 * This is the requirement that separates the candidates. React Aria ships
 * `DateRangePicker` in the free tier and takes `granularity="minute"`, so both
 * endpoints get date and time in a single calendar with the intervening range
 * highlighted. Status: native, for both requirements.
 *
 * Compare with the delta-mui run, which has to compose two separate pickers
 * because its range components are commercially licensed.
 *
 * All values derive from the fixtures' fixed date. No `new Date()`.
 */

import type { ReactElement } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
  RangeCalendar,
  Text,
} from "react-aria-components";
import { parseAbsolute, parseDate } from "@internationalized/date";

import { DEFAULT_RANGE, FIXED_TIME_ZONE, TODAY_ISO } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { POPOVER_CLASS } from "../overlay-class.js";

/** The fixture's fixed "today", as a calendar date. */
const TODAY = parseDate(TODAY_ISO.slice(0, 10));

/**
 * The fixture's default range, pinned to the fixture timezone.
 *
 * Deliberately NOT `parseAbsoluteToLocal`, which resolves to whatever timezone
 * the machine is in: the same build then renders 00:00 in London and 02:00 in
 * Berlin, and the screenshots stop being comparable across demos and machines.
 */
const RANGE_START = parseAbsolute(DEFAULT_RANGE.startIso, FIXED_TIME_ZONE);
const RANGE_END = parseAbsolute(DEFAULT_RANGE.endIso, FIXED_TIME_ZONE);

/**
 * The calendar glyph on the picker triggers, as inline SVG.
 *
 * This was a 📅 emoji, which rendered as a full-colour vendor glyph that ignores
 * every design token and matched no other pairing's trigger.
 *
 * SAFE TO SWAP, AND MEASURED BEFORE SWAPPING. The emoji was never the button's
 * accessible name — `useDatePicker` puts a localised `aria-label` on the trigger
 * (see the note at the call site), and an `aria-label` overrides text content in
 * the name computation. Measured on the built page: the trigger's computed name
 * is "Calendar Event date" in English and "التقويم تاريخ الحدث" in Arabic, with
 * the emoji contributing nothing. So this is decorative and marked as such.
 */
const CALENDAR_PATH =
  "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z";

function CalendarIcon(): ReactElement {
  return (
    <svg
      className="demo-dateinput__icon"
      viewBox="0 0 24 24"
      width="1.125em"
      height="1.125em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CALENDAR_PATH} />
    </svg>
  );
}

export function SectionDates(): ReactElement {
  const { labels } = useDemo();

  return (
    <section className="demo-section" id="section-3" aria-labelledby="s3">
      <h3 className="demo-section__title" id="s3">
        3. Date picker and date-time range picker
      </h3>

      <div className="demo-grid">
        <DatePicker className="demo-field" defaultValue={TODAY}>
          <Label className="demo-label">{labels.fieldEventDate}</Label>
          <Group className="demo-dateinput">
            <DateInput className="demo-dateinput__segments">
              {(segment) => <DateSegment segment={segment} className="demo-datesegment" />}
            </DateInput>
            {/*
              NO aria-label HERE ON PURPOSE, and it used to say "Open calendar".

              `DatePicker` gives its trigger button the props `useDatePicker`
              builds, and those already include a localised name:
              `react-aria/dist/private/datepicker/useDatePicker.mjs:147` sets
              `'aria-label': stringFormatter.format('calendar')`, which
              `react-aria-components/i18n/ar-AE.mjs` renders as `التقويم`. Our
              explicit prop won that merge and put English back in Arabic.

              Same reason the `slot="previous"`/`slot="next"` buttons below are
              unlabelled. The rule for this library: if the component supplies the
              props, it supplies the name too.
            */}
            <Button className="demo-dateinput__button">
              <CalendarIcon />
            </Button>
          </Group>
          <Text slot="description" className="demo-hint">
            Keyboard entry per segment; arrows adjust, type to overwrite.
          </Text>
          <Popover className={POPOVER_CLASS}>
            <Dialog className="demo-dialog demo-dialog--calendar">
              <Calendar className="demo-calendar">
                <header className="demo-calendar__header">
                  <Button slot="previous" className="demo-button">
                    ◀
                  </Button>
                  <Heading className="demo-calendar__heading" />
                  <Button slot="next" className="demo-button">
                    ▶
                  </Button>
                </header>
                <CalendarGrid className="demo-calendar__grid">
                  {(date) => <CalendarCell date={date} className="demo-calendar__cell" />}
                </CalendarGrid>
              </Calendar>
            </Dialog>
          </Popover>
        </DatePicker>

        {/*
          granularity="minute" gives both endpoints hour and minute segments.
          A single RangeCalendar shows start, end and every day between.

          The hidden form-integration inputs React Aria renders here are
          genuinely hidden on this host: Tailwind Preflight declares
          `[hidden]:where(:not([hidden=until-found])){display:none!important}`,
          which is both more specific and !important. On the Mangrove host the
          same inputs render VISIBLY, because Mangrove's own
          `input[type=text]{display:block}` outranks its own `[hidden]` reset.
          Same candidate, same components, opposite outcome — a host difference,
          recorded in EVIDENCE.md.
        */}
        <DateRangePicker
          className="demo-field"
          granularity="minute"
          defaultValue={{ start: RANGE_START, end: RANGE_END }}
        >
          <Label className="demo-label">{labels.fieldReportingWindow}</Label>
          <Group className="demo-dateinput">
            <DateInput slot="start" className="demo-dateinput__segments">
              {(segment) => <DateSegment segment={segment} className="demo-datesegment" />}
            </DateInput>
            <span aria-hidden="true" className="demo-dateinput__dash">
              –
            </span>
            <DateInput slot="end" className="demo-dateinput__segments">
              {(segment) => <DateSegment segment={segment} className="demo-datesegment" />}
            </DateInput>
            {/* Unlabelled for the same reason as the single picker above:
                `useDateRangePicker` names this trigger from the translation
                bundle (`useDateRangePicker.mjs:149`). */}
            <Button className="demo-dateinput__button">
              <CalendarIcon />
            </Button>
          </Group>
          <Text slot="description" className="demo-hint">
            Native range with minute granularity, one popover, one focus trap.
          </Text>
          <Popover className={POPOVER_CLASS}>
            <Dialog className="demo-dialog demo-dialog--calendar">
              <RangeCalendar className="demo-calendar">
                <header className="demo-calendar__header">
                  <Button slot="previous" className="demo-button">
                    ◀
                  </Button>
                  <Heading className="demo-calendar__heading" />
                  <Button slot="next" className="demo-button">
                    ▶
                  </Button>
                </header>
                <CalendarGrid className="demo-calendar__grid">
                  {(date) => <CalendarCell date={date} className="demo-calendar__cell" />}
                </CalendarGrid>
              </RangeCalendar>
            </Dialog>
          </Popover>
        </DateRangePicker>
      </div>
    </section>
  );
}
