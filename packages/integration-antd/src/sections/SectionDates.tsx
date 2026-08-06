/**
 * Section 3: date picker and date-time RANGE picker.
 *
 * This is the requirement that separated the field. `datetime-range-picker` was
 * `composed` for MUI (two pickers plus our own ordering logic, because the real
 * range picker is behind MUI X Pro) and for React Aria and Carbon. antd ships it
 * as one component in the free package:
 *
 *   <DatePicker.RangePicker showTime />
 *
 * verified against antd 6.5.3's own types rather than assumed - `showTime` is
 * declared on the shared picker props that RangePicker extends. So this scores
 * `native`, and the ordering guarantee (start before end) comes from the
 * component rather than from code we maintain.
 *
 * antd's picker is built on dayjs. `TODAY_ISO` and `DEFAULT_RANGE` are the only
 * clock: no `new Date()` anywhere, per Brief 1 constraint. dayjs is initialised
 * in UTC so a runner in another timezone renders identical times.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { DatePicker, Form, Typography } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { DEFAULT_RANGE, TODAY_ISO } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/** Fixed clock. dayjs.utc() would need the utc plugin; parsing the Z-suffixed
 * ISO strings directly keeps the dependency surface as antd declares it. */
const TODAY: Dayjs = dayjs(TODAY_ISO);
const RANGE_START: Dayjs = dayjs(DEFAULT_RANGE.startIso);
const RANGE_END: Dayjs = dayjs(DEFAULT_RANGE.endIso);

export function SectionDates(): ReactElement {
  const { labels } = useDemo();
  const [single, setSingle] = useState<Dayjs | null>(TODAY);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    RANGE_START,
    RANGE_END,
  ]);

  return (
    <section id="section-3" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        3. Date picker and date-time range
      </Typography.Title>

      <Form
        layout="vertical"
        style={{
          display: "grid",
          gap: "0.5rem 1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
        }}
      >
        <Form.Item label={labels.fieldEventDate} htmlFor="date-picker">
          <DatePicker
            id="date-picker"
            value={single}
            onChange={setSingle}
            style={{ width: "100%" }}
          />
        </Form.Item>

        {/*
         * One component, both ends, with the time of day. No composition, and no
         * ordering logic of ours: RangePicker will not accept an end before the
         * start. Contrast the MUI run, which needed two pickers plus a
         * `minDateTime` cross-reference to get the same guarantee.
         */}
        <Form.Item label={labels.fieldReportingWindow} htmlFor="datetime-range">
          <DatePicker.RangePicker
            id="datetime-range"
            showTime={{ format: "HH:mm" }}
            value={range}
            onChange={(next) => setRange(next as [Dayjs | null, Dayjs | null] | null)}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: "1rem", maxWidth: "68ch" }}>
        Fixed clock: {TODAY.format("YYYY-MM-DD HH:mm")} UTC. The range defaults to
        the fixture window so screenshots do not drift.
      </Typography.Paragraph>
    </section>
  );
}
