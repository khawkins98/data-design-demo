/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Mangrove markup using Mangrove's own classes -
 * `mg-button mg-button-primary`, `mg-table mg-table--striped`, `mg-card` - so it
 * is styled by the design system itself. Right is antd,
 * themed to the same tokens. This section is host-specific by definition, which
 * is why it is one of the four files that stayed in the app rather than moving
 * into `@undrr-eval/integration-antd`.
 *
 * Mangrove is strongly opinionated - square corners, heavy borders, Roboto and
 * a specific blue. The project tokens now carry its current interactive palette,
 * so colour can match, but antd consumes a separately maintained mapping rather
 * than inheriting values from Mangrove 1.8.1 at runtime. The remaining visual gap
 * and that synchronization boundary are why this section is screenshotted.
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
            Mangrove host
          </Typography.Text>

          <button type="button" className="mg-button mg-button-primary">
            {labels.actionSave}
          </button>

          <table className="mg-table mg-table--striped" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th scope="col">{labels.colCountry}</th>
                <th scope="col">{labels.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id}>
                  <th scope="row">{record.country}</th>
                  <td>{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mg-card" style={{ marginTop: "0.75rem" }}>
            <div className="mg-card__content">
              <h5>{labels.navRecords}</h5>
              <p>{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <ul className="mt-3">
            {navItems.map((item) => (
              <li key={item.key}>
                <a href="#section-9">{item.label}</a>
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
