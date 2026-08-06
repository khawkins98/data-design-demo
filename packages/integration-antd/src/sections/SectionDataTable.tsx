/**
 * Section 6: data table over the 250-row fixture.
 *
 * antd's `Table` is in the free package and covers most of section 6 with props:
 *
 *   table-sort         `sorter` per column
 *   table-multiselect  `rowSelection`, and the select-all header checkbox is
 *                      present by DEFAULT - `hideSelectAll` exists to remove it.
 *                      Worth stating plainly because the React Aria run had to
 *                      build select-all by hand, and my first pass on that run
 *                      recorded it as native when it rendered no checkboxes at all.
 *   table-filter       `filters` + `onFilter`, with `filterSearch` for long lists
 *   table-paginate     `pagination` with `showSizeChanger` for the page-size control
 *
 * The exception is column sizing, which antd does not have at all. See
 * `use-column-resize.ts`: that is ours, and the requirement scores `custom`.
 *
 * Numbers and dates are formatted with `Intl` against the fixture locale rather
 * than by antd, so the four locales render their own separators and calendars.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { color } from "@undrr-eval/undrr-tokens";

import { useDemo } from "../demo-state.js";
import { useColumnResize } from "../use-column-resize.js";

/**
 * Status colours come from the UNDRR tokens, not from antd's preset palette.
 * antd's own `green`/`gold`/`red` filled tags failed axe colour contrast, and
 * they would have been antd's hues rather than UNDRR's regardless - so this is a
 * theming correction as much as an accessibility one. A non-preset colour string
 * makes antd render a filled tag with `colorTextLightSolid` text.
 */
const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: color.success,
  pending: color.warning,
  disputed: color.error,
  withdrawn: color.textSecondary,
};

const DEFAULT_WIDTHS: Record<string, number> = {
  country: 130,
  hazardType: 150,
  eventDate: 140,
  reportedAt: 160,
  peopleAffected: 150,
  economicLossUsdMillions: 180,
  verificationStatus: 160,
  reviewNote: 260,
};

/**
 * A header cell carrying a resize grip. antd exposes the header cell through
 * `components.header.cell`, which is the documented extension point, so the grip
 * is added without touching antd's internals or its class names.
 */
function makeHeaderCell(resize: ReturnType<typeof useColumnResize>) {
  return function HeaderCell({
    children,
    ...rest
  }: React.ThHTMLAttributes<HTMLTableCellElement> & {
    readonly "data-column-key"?: string;
  }): ReactElement {
    const key = rest["data-column-key"];
    if (!key) return <th {...rest}>{children}</th>;
    const width = resize.widthOf(key, DEFAULT_WIDTHS[key] ?? 140);
    return (
      <th {...rest} style={{ ...rest.style, position: "relative" }}>
        {children}
        {/*
         * A focusable `role="separator"` is an ARIA WIDGET, not a decoration, so
         * it requires aria-valuenow/min/max. Omitting them was a CRITICAL
         * `aria-required-attr` violation on the first run of this section.
         */}
        <span
          role="separator"
          aria-label={`Resize column ${key}`}
          aria-orientation="vertical"
          aria-valuenow={width}
          aria-valuemin={80}
          aria-valuemax={640}
          tabIndex={0}
          onPointerDown={resize.onPointerDown(key, width)}
          onKeyDown={resize.onKeyDown(key, width)}
          className="demo-col-resizer"
        />
      </th>
    );
  };
}

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();
  const resize = useColumnResize();

  const columns = useMemo<ColumnsType<LossRecord>>(() => {
    const number = new Intl.NumberFormat(bcp47);
    const decimal = new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const date = new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" });
    const dateTime = new Intl.DateTimeFormat(bcp47, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    });

    const hazards = [...new Set(LOSS_RECORDS.map((r) => r.hazardType))].sort();

    const width = (key: string) => resize.widthOf(key, DEFAULT_WIDTHS[key] ?? 140);
    /**
     * antd types `onHeaderCell`'s return as HTML attributes, which does not admit
     * a `data-*` key, so the cast is required rather than lazy. The attribute is
     * how the custom header cell knows which column it is resizing.
     */
    const head = (key: string) => ({
      onHeaderCell: () =>
        ({ "data-column-key": key }) as unknown as React.HTMLAttributes<HTMLTableCellElement>,
    });

    return [
      {
        key: "country",
        dataIndex: "country",
        title: labels.colCountry,
        width: width("country"),
        sorter: (a, b) => a.country.localeCompare(b.country, bcp47),
        ...head("country"),
      },
      {
        key: "hazardType",
        dataIndex: "hazardType",
        title: labels.colHazard,
        width: width("hazardType"),
        sorter: (a, b) => a.hazardType.localeCompare(b.hazardType),
        // table-filter, with search because eight values is enough to want it.
        filters: hazards.map((h) => ({ text: h, value: h })),
        filterSearch: true,
        onFilter: (value, record) => record.hazardType === value,
        ...head("hazardType"),
      },
      {
        key: "eventDate",
        dataIndex: "eventDate",
        title: labels.colEventDate,
        width: width("eventDate"),
        defaultSortOrder: "descend",
        sorter: (a, b) => a.eventDate.localeCompare(b.eventDate),
        render: (value: string) => date.format(new Date(`${value}T00:00:00Z`)),
        ...head("eventDate"),
      },
      {
        key: "reportedAt",
        dataIndex: "reportedAt",
        title: labels.colReportedAt,
        width: width("reportedAt"),
        sorter: (a, b) => a.reportedAt.localeCompare(b.reportedAt),
        render: (value: string) => dateTime.format(new Date(value)),
        ...head("reportedAt"),
      },
      {
        key: "peopleAffected",
        dataIndex: "peopleAffected",
        title: labels.colPeopleAffected,
        width: width("peopleAffected"),
        align: "end",
        sorter: (a, b) => a.peopleAffected - b.peopleAffected,
        render: (value: number) => number.format(value),
        ...head("peopleAffected"),
      },
      {
        key: "economicLossUsdMillions",
        dataIndex: "economicLossUsdMillions",
        title: labels.colEconomicLoss,
        width: width("economicLossUsdMillions"),
        align: "end",
        sorter: (a, b) => a.economicLossUsdMillions - b.economicLossUsdMillions,
        render: (value: number) => decimal.format(value),
        ...head("economicLossUsdMillions"),
      },
      {
        key: "verificationStatus",
        dataIndex: "verificationStatus",
        title: labels.colStatus,
        width: width("verificationStatus"),
        sorter: (a, b) => a.verificationStatus.localeCompare(b.verificationStatus),
        render: (value: VerificationStatus) => <Tag color={STATUS_COLOUR[value]}>{value}</Tag>,
        ...head("verificationStatus"),
      },
      {
        key: "reviewNote",
        dataIndex: "reviewNote",
        title: labels.colReviewNote,
        width: width("reviewNote"),
        render: (value: string | null) => value ?? "—",
        ...head("reviewNote"),
      },
    ];
  }, [labels, bcp47, resize]);

  return (
    <section id="section-6" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        6. Data table, {LOSS_RECORDS.length} rows
      </Typography.Title>

      <Table<LossRecord>
        columns={columns}
        dataSource={[...LOSS_RECORDS]}
        rowKey="id"
        // Select-all is present by default; `hideSelectAll` would remove it.
        rowSelection={{ type: "checkbox" }}
        components={{ header: { cell: makeHeaderCell(resize) } }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50],
          // Renders "1-10 of 250", which the evidence run asserts against.
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
        scroll={{ x: "max-content" }}
        size="small"
        aria-label={labels.navRecords}
      />
    </section>
  );
}
