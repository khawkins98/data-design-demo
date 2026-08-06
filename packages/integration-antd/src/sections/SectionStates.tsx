/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * Almost entirely native. `Table` takes `loading` and renders its own spinner
 * overlay, and its empty state comes from `Empty` via `locale.emptyText` without
 * a slot to fill. `Alert` gives error and success banners with the correct ARIA
 * role, and `Skeleton` covers form loading.
 *
 * The one thing worth flagging: antd's `loading` on Table keeps the previous rows
 * visible under a dimming overlay rather than clearing them. That is a better
 * default than a blank table, but it means "loading" and "success" screenshots
 * differ only by the overlay, which is why `recordsForState` still empties the
 * rows - the fixture contract, not antd, decides what a loading table contains.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Alert, Button, Flex, Form, Input, Skeleton, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { LossRecord } from "@undrr-eval/fixtures";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

export function SectionStates(): ReactElement {
  const { labels } = useDemo();
  const [tableState, setTableState] = useState<LoadState>("success");
  const [formState, setFormState] = useState<LoadState>("success");

  const columns: ColumnsType<LossRecord> = [
    { key: "country", dataIndex: "country", title: labels.colCountry },
    { key: "hazardType", dataIndex: "hazardType", title: labels.colHazard },
    { key: "verificationStatus", dataIndex: "verificationStatus", title: labels.colStatus },
  ];

  const rows = recordsForState(tableState, LOSS_RECORDS).slice(0, 3);

  const stateLabel: Record<LoadState, string> = {
    loading: labels.stateLoading,
    empty: labels.stateEmpty,
    error: labels.stateError,
    success: labels.stateSuccess,
  };

  return (
    <section id="section-7" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        7. Loading, empty, error and success states
      </Typography.Title>

      <Flex gap="small" wrap style={{ marginBottom: "1rem" }}>
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            type={tableState === state ? "primary" : "default"}
            onClick={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </Flex>

      {tableState === "error" ? (
        <Alert type="error" showIcon message={labels.stateError} style={{ marginBottom: "1rem" }} />
      ) : null}
      {tableState === "success" ? (
        <Alert
          type="success"
          showIcon
          message={labels.stateSuccess}
          style={{ marginBottom: "1rem" }}
        />
      ) : null}

      <Table<LossRecord>
        columns={columns}
        dataSource={[...rows]}
        rowKey="id"
        loading={tableState === "loading"}
        pagination={false}
        size="small"
        locale={{ emptyText: labels.stateEmpty }}
        aria-label={`${labels.navRecords}: ${stateLabel[tableState]}`}
        style={{ marginBottom: "2rem" }}
      />

      <Flex gap="small" wrap style={{ marginBottom: "1rem" }}>
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            type={formState === state ? "primary" : "default"}
            onClick={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </Flex>

      <div
        style={{
          padding: "1.5rem",
          border: "1px solid var(--undrr-color-border)",
          borderRadius: "var(--undrr-radius-md)",
        }}
      >
        {formState === "loading" ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <Form layout="vertical">
            {formState === "error" ? (
              <Alert
                type="error"
                showIcon
                message={labels.stateError}
                style={{ marginBottom: "1rem" }}
              />
            ) : null}
            {formState === "success" ? (
              <Alert
                type="success"
                showIcon
                message={labels.stateSuccess}
                style={{ marginBottom: "1rem" }}
              />
            ) : null}
            <Form.Item label={labels.fieldCountry}>
              <Input
                defaultValue={formState === "empty" ? "" : "Mozambique"}
                placeholder={labels.stateEmpty}
              />
            </Form.Item>
          </Form>
        )}
      </div>
    </section>
  );
}
