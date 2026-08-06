/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * antd splits what MUI's TextField bundles: `Form.Item` owns the label, the
 * validation status and the help text, and `Input` owns the control. That is one
 * more component than MUI but it buys a real form-level error channel, which is
 * the one thing every other candidate in this evaluation lacked - MUI, React
 * Aria, Carbon and Mantine all had to model `server-rejected` as component state
 * we manage ourselves. Here `Form` takes the errors and renders them against the
 * right fields.
 *
 * A TRAP worth naming: `Form.Item label=...` does NOT associate the label with
 * the control unless the item also has a `name`, because that is what antd uses
 * to generate the id it points `for` at. Rendering fixture states rather than
 * collecting input means there is no `name` to give, so every field here needs an
 * explicit `htmlFor` plus a matching `id`. Without it axe reports a CRITICAL
 * `label` violation on every input, which is exactly what the first run of this
 * section did.
 *
 * `Form` is used in controlled-display mode: the validation states below are
 * fixture content to be *rendered*, not user input to be validated, so each
 * Form.Item is given an explicit `validateStatus` and `help` rather than a rule.
 * Using antd's own rule engine would make the screenshots depend on interaction
 * order, which the brief forbids.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Alert, Button, Flex, Form, Input, Space, Typography } from "antd";

import { VALIDATION_CASES } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

export function SectionForms(): ReactElement {
  const { labels } = useDemo();
  const [serverRejected, setServerRejected] = useState(false);

  const caseFor = (kind: string) => VALIDATION_CASES.find((c) => c.kind === kind);
  const required = caseFor("required-empty");
  const format = caseFor("format-invalid");
  const range = caseFor("out-of-range");
  const server = caseFor("server-rejected");

  return (
    <section id="section-1" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        1. Buttons, links, inputs and validation
      </Typography.Title>

      <Flex gap="middle" wrap style={{ marginBottom: "1rem" }}>
        <Button type="primary">{labels.actionSave}</Button>
        <Button>{labels.actionCancel}</Button>
        <Button danger type="primary">
          {labels.actionDelete}
        </Button>
        <Button disabled>{labels.actionExport}</Button>
      </Flex>

      <Typography.Paragraph style={{ marginBottom: "1.5rem", maxWidth: "68ch" }}>
        Long labels are fixture content and must render untouched:{" "}
        <Typography.Link href="#section-1">{labels.longAccessibilityNotice}</Typography.Link>
      </Typography.Paragraph>

      <Form
        layout="vertical"
        style={{
          display: "grid",
          gap: "0.5rem 1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          marginBottom: "1.5rem",
        }}
      >
        <Form.Item
          label={labels.fieldCountry}
          htmlFor="forms-country"
          help={labels.longSubmissionGuidance}
        >
          <Input id="forms-country" defaultValue="Bangladesh" />
        </Form.Item>

        <Form.Item
          label={labels.fieldDataSource}
          htmlFor="forms-required"
          required
          validateStatus="error"
          help={required ? labels[required.messageKey] : ""}
        >
          <Input id="forms-required" value="" readOnly />
        </Form.Item>

        <Form.Item
          label={labels.fieldEventDate}
          htmlFor="forms-format"
          validateStatus="error"
          help={format ? labels[format.messageKey] : ""}
        >
          <Input id="forms-format" value={format?.input ?? ""} readOnly />
        </Form.Item>

        <Form.Item
          label={labels.colPeopleAffected}
          htmlFor="forms-range"
          validateStatus="error"
          help={range ? labels[range.messageKey] : ""}
        >
          <Input id="forms-range" value={range?.input ?? ""} readOnly />
        </Form.Item>

        <Form.Item label={labels.fieldNarrative} htmlFor="forms-disabled" help="Disabled state">
          <Input id="forms-disabled" defaultValue="Sendai Framework Monitor" disabled />
        </Form.Item>
      </Form>

      {/*
       * server-rejected. Unlike every other candidate here, this is a real
       * library affordance: Form.ErrorList plus a field-level validateStatus
       * driven from the submit handler, not state invented to stand in for a
       * missing channel.
       */}
      <Form
        layout="vertical"
        onFinish={() => setServerRejected(true)}
        style={{
          padding: "1.5rem",
          border: "1px solid var(--undrr-color-border)",
          borderRadius: "var(--undrr-radius-md)",
        }}
      >
        {/*
         * `validateStatus` is spread conditionally rather than passed as
         * `undefined`: the repo runs `exactOptionalPropertyTypes`, and antd types
         * this prop without `undefined` in its union.
         */}
        <Form.Item
          label={labels.fieldDataSource}
          htmlFor="forms-server"
          {...(serverRejected ? { validateStatus: "error" as const } : {})}
          help={serverRejected && server ? labels[server.messageKey] : " "}
        >
          <Input id="forms-server" defaultValue={server?.input ?? ""} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            {labels.actionSave}
          </Button>
          <Button onClick={() => setServerRejected(false)}>{labels.actionCancel}</Button>
        </Space>
        {serverRejected ? (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: "1rem" }}
            message={server ? labels[server.messageKey] : ""}
          />
        ) : null}
      </Form>
    </section>
  );
}
