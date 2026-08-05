/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * Mantine's `TextInput` bundles label, description, error and input in one
 * component, so this section is mostly props. `error` renders the message with
 * `role="alert"` and wires `aria-describedby`/`aria-invalid` itself.
 *
 * `server-rejected` has no library affordance — Mantine has no form-level error
 * channel (that lives in the separate `@mantine/form` package, which is not
 * installed) — so it is component state we manage.
 *
 * `Anchor underline="always"` is deliberate, not decoration. Mangrove's own base
 * `a` rule underlines only on hover, which is the host's known
 * `link-in-text-block` WCAG 1.4.1 failure; Mantine's Anchor defaults to
 * `underline="hover"` and would reproduce it inside the candidate subtree.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";

import { OPTIONS_SMALL, VALIDATION_CASES } from "@undrr-eval/fixtures";
import type { ValidationCaseKind } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { OVERLAY_CLASS } from "../overlay-class.js";

function caseFor(kind: ValidationCaseKind) {
  return VALIDATION_CASES.find((entry) => entry.kind === kind);
}

export function SectionForms(): ReactElement {
  const { labels } = useDemo();
  const [serverRejected, setServerRejected] = useState(false);

  const required = caseFor("required-empty");
  const format = caseFor("format-invalid");
  const range = caseFor("out-of-range");
  const server = caseFor("server-rejected");

  return (
    <section id="section-1">
      <Title order={3} mb="md">
        1. Buttons, links, inputs and validation
      </Title>

      <Group mb="md" wrap="wrap">
        <Button>{labels.actionSave}</Button>
        <Button variant="default">{labels.actionCancel}</Button>
        <Button color="red">{labels.actionDelete}</Button>
        <Button variant="default" disabled>
          {labels.actionExport}
        </Button>
      </Group>

      <Text mb="md" maw="68ch">
        Long labels are fixture content and must render untouched:{" "}
        <Anchor href="#section-1" underline="always">
          {labels.longAccessibilityNotice}
        </Anchor>
      </Text>

      <div className="demo-grid" style={{ marginBottom: "1rem" }}>
        <TextInput
          label={labels.fieldCountry}
          defaultValue="Bangladesh"
          description={labels.longSubmissionGuidance}
        />

        <TextInput
          label={labels.fieldDataSource}
          value=""
          readOnly
          required
          error={required ? labels[required.messageKey] : false}
        />

        <TextInput
          label={labels.fieldEventDate}
          value={format?.input ?? ""}
          readOnly
          error={format ? labels[format.messageKey] : false}
        />

        <TextInput
          label={labels.colPeopleAffected}
          value={range?.input ?? ""}
          readOnly
          error={range ? labels[range.messageKey] : false}
        />

        {/* Disabled input, select and button together: `disabled-states`. */}
        <TextInput
          label={labels.fieldNarrative}
          defaultValue="Sendai Framework Monitor"
          disabled
          description="Disabled state"
        />

        <Select
          label={`${labels.fieldHazard} (disabled)`}
          data={OPTIONS_SMALL.map((o) => ({ value: o.value, label: o.label }))}
          defaultValue="flood"
          disabled
          comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
        />

        {/*
          A Textarea is included on purpose. Mangrove styles `textarea` by
          element at (0,1,1), which outranks Mantine's own (0,1,0) class rule and
          forced a 46px fixed height that clipped the content. Repaired in
          demo.css BLOCK 2 and recorded as a host-collision finding.
        */}
        <Textarea
          label={labels.colNarrative}
          defaultValue={labels.longMethodologyNotice}
          autosize
          minRows={2}
        />
      </div>

      {/* server-rejected: no library channel, so this is our own state. */}
      <Paper
        component="form"
        withBorder
        p="md"
        onSubmit={(event) => {
          event.preventDefault();
          setServerRejected(true);
        }}
      >
        <Stack gap="sm">
          <TextInput
            label={labels.fieldDataSource}
            defaultValue={server?.input ?? ""}
            error={serverRejected && server ? labels[server.messageKey] : false}
          />
          <Group>
            <Button type="submit">{labels.actionSave}</Button>
            <Button variant="default" onClick={() => setServerRejected(false)}>
              {labels.actionCancel}
            </Button>
          </Group>
          {serverRejected && server ? (
            <Alert color="red" title={labels.validationServer}>
              {labels[server.messageKey]}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </section>
  );
}
