/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Delta markup using Tailwind utilities; right is antd,
 * themed to the same tokens. This section is host-specific by definition, which
 * is why it is one of the four files that stayed in the app rather than moving
 * into `@undrr-eval/integration-antd`.
 *
 * The gap is narrower here than in the MUI run for one concrete reason: antd's
 * Card is already flat and bordered and its Table is already dense, so the token
 * mapping lands closer to Delta's own look without per-component overrides.
 */

import type { ReactElement } from "react";
import { Button, Card, Menu, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LossRecord } from "@undrr-eval/fixtures";

import { useDemo } from "@undrr-eval/integration-antd";

const SAMPLE = LOSS_RECORDS.slice(0, 3);

const CAPTION: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "0.75rem",
  display: "block",
  marginBottom: "0.75rem",
};

export function SectionSideBySide(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { key: "overview", label: labels.navOverview },
    { key: "records", label: labels.navRecords },
    { key: "submissions", label: labels.navSubmissions },
  ];

  const columns: ColumnsType<LossRecord> = [
    { key: "country", dataIndex: "country", title: labels.colCountry },
    { key: "verificationStatus", dataIndex: "verificationStatus", title: labels.colStatus },
  ];

  return (
    <section id="section-9" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        9. Host and candidate, side by side
      </Typography.Title>

      <div className="demo-sbs">
        {/* Host column: plain markup with Delta's Tailwind utilities. */}
        <div style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={CAPTION}>
            Delta host
          </Typography.Text>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-sky-800 px-4 py-2 text-sm font-semibold text-white"
          >
            {labels.actionSave}
          </button>

          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  {labels.colCountry}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {labels.colStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id} className="border-b border-slate-200">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {record.country}
                  </th>
                  <td className="py-2">{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mt-3 rounded border border-slate-300 bg-white p-4">
            <h5 className="font-semibold text-slate-900">{labels.navRecords}</h5>
            <p className="mt-1 text-sm text-slate-600">{labels.longMethodologyNotice}</p>
          </article>

          <ul className="mt-3">
            {navItems.map((item) => (
              <li key={item.key} className="mt-1 first:mt-0">
                <a
                  href="#section-9"
                  className="block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Candidate column: antd, themed to the same tokens. */}
        <div style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={CAPTION}>
            Ant Design, themed
          </Typography.Text>

          <Button type="primary">{labels.actionSave}</Button>

          <Table<LossRecord>
            columns={columns}
            dataSource={[...SAMPLE]}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ marginTop: "0.75rem" }}
            aria-label={`${labels.navRecords} (candidate)`}
          />

          <Card variant="outlined" style={{ marginTop: "0.75rem" }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {labels.navRecords}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {labels.longMethodologyNotice}
            </Typography.Paragraph>
          </Card>

          <Menu
            mode="inline"
            selectable={false}
            items={navItems}
            style={{ marginTop: "0.75rem", borderInlineEnd: 0 }}
          />
        </div>
      </div>
    </section>
  );
}
