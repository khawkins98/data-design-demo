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
            <Button className="demo-dateinput__button" aria-label="Open calendar">
              📅
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
            <Button className="demo-dateinput__button" aria-label="Open range calendar">
              📅
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
