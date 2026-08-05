/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * Mantine's `TextInput` bundles label, description, error and the input into one
 * component, like MUI's TextField and unlike React Aria's primitives. `error`
 * takes a ReactNode, so the message renders with `role="alert"` wiring already
 * done and `aria-invalid` set.
 *
 * `server-rejected` has no library affordance — Mantine has no form-level error
 * channel in `@mantine/core` (that lives in `@mantine/form`, which is not
 * installed) — so it is component state we manage.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Alert, Anchor, Box, Button, Group, SimpleGrid, Text, TextInput, Title } from "@mantine/core";

import { VALIDATION_CASES } from "@undrr-eval/fixtures";
import type { ValidationCaseKind } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

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
    <Box component="section" id="section-1" mb="s16">
      <Title order={3} mb="md">
        1. Buttons, links, inputs and validation
      </Title>

      <Group gap="sm" mb="md" wrap="wrap">
        <Button variant="filled">{labels.actionSave}</Button>
        <Button variant="outline">{labels.actionCancel}</Button>
        <Button variant="filled" color="undrrError">
          {labels.actionDelete}
        </Button>
        <Button variant="outline" disabled>
          {labels.actionExport}
        </Button>
      </Group>

      <Text mb="md" maw="68ch">
        Long labels are fixture content and must render untouched:{" "}
        <Anchor href="#section-1" underline="always">
          {labels.longAccessibilityNotice}
        </Anchor>
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
        <TextInput
          label={labels.fieldCountry}
          defaultValue="Bangladesh"
          description={labels.longSubmissionGuidance}
        />

        {/* required-empty */}
        <TextInput
          label={labels.fieldDataSource}
          value=""
          readOnly
          required
          error={required ? labels[required.messageKey] : false}
        />

        {/* format-invalid */}
        <TextInput
          label={labels.fieldEventDate}
          value={format?.input ?? ""}
          readOnly
          error={format ? labels[format.messageKey] : false}
        />

        {/* out-of-range */}
        <TextInput
          label={labels.colPeopleAffected}
          value={range?.input ?? ""}
          readOnly
          error={range ? labels[range.messageKey] : false}
        />

        <TextInput
          label={labels.fieldNarrative}
          defaultValue="Sendai Framework Monitor"
          disabled
          description="Disabled state"
        />
      </SimpleGrid>

      {/* server-rejected: no library channel, so this is our own state. */}
      <Box
        component="form"
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          setServerRejected(true);
        }}
        p="md"
        style={{
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        <TextInput
          label={labels.fieldDataSource}
          defaultValue={server?.input ?? ""}
          error={serverRejected && server ? labels[server.messageKey] : false}
          mb="sm"
        />
        <Group gap="sm">
          <Button type="submit" variant="filled">
            {labels.actionSave}
          </Button>
          <Button variant="outline" onClick={() => setServerRejected(false)}>
            {labels.actionCancel}
          </Button>
        </Group>
        {serverRejected && server ? (
          <Alert color="undrrError" variant="light" mt="sm" role="alert">
            {labels[server.messageKey]}
          </Alert>
        ) : null}
      </Box>
    </Box>
  );
}
