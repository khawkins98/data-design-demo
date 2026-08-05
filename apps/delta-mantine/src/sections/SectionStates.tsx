/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * Mantine covers this well, and one component is worth calling out: `EmptyState`
 * is a purpose-built empty-state component with a title, description, icon slot
 * and action area. Neither React Aria nor MUI Community has one — both runs hand-
 * rolled a paragraph. `Skeleton` and `LoadingOverlay` are likewise native, and
 * `Alert` carries the ARIA role.
 *
 * The gap: because the table is hand-built (section 6), its loading and empty
 * states are ours to place. A built-in grid has a `loading` prop and a
 * `noRowsOverlay` slot; here `LoadingOverlay` has to be positioned over a
 * relatively-positioned wrapper we add, and the empty branch has to replace the
 * `<tbody>` we render.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Alert,
  Box,
  Button,
  EmptyState,
  Group,
  LoadingOverlay,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

export function SectionStates(): ReactElement {
  const { labels } = useDemo();
  const [tableState, setTableState] = useState<LoadState>("success");
  const [formState, setFormState] = useState<LoadState>("success");

  const rows = recordsForState(tableState, LOSS_RECORDS).slice(0, 3);

  return (
    <Box component="section" id="section-7" mb="s16">
      <Title order={3} mb="md">
        7. Loading, empty, error and success states
      </Title>

      <Group gap="xs" mb="sm" wrap="wrap">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="xs"
            variant={state === tableState ? "filled" : "outline"}
            onClick={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </Group>

      <Box mb="lg">
        {tableState === "error" ? (
          <Alert color="undrrError" variant="light" role="alert" title={labels.stateError}>
            {labels.longVerificationBanner}
          </Alert>
        ) : null}

        {tableState === "success" ? (
          <Alert color="undrrSuccess" variant="light" role="status" mb="sm">
            {labels.stateSuccess}
          </Alert>
        ) : null}

        {tableState === "empty" ? (
          <EmptyState
            title={labels.stateEmpty}
            description={labels.longSubmissionGuidance}
            variant="light"
          />
        ) : null}

        {tableState === "loading" ? (
          <Box pos="relative" mih="8rem" p="md">
            <LoadingOverlay
              visible
              loaderProps={{ "aria-label": labels.stateLoading }}
              zIndex={1}
            />
            <Stack gap="xs" aria-hidden="true">
              <Skeleton height={16} />
              <Skeleton height={16} />
              <Skeleton height={16} width="70%" />
            </Stack>
          </Box>
        ) : null}

        {tableState === "success" ? (
          <Table withTableBorder aria-label={`${labels.navRecords} (${tableState})`}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.colCountry}</Table.Th>
                <Table.Th>{labels.colHazard}</Table.Th>
                <Table.Th>{labels.colStatus}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Td>{record.country}</Table.Td>
                  <Table.Td>{record.hazardType}</Table.Td>
                  <Table.Td>{record.verificationStatus}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : null}
      </Box>

      <Group gap="xs" mb="sm" wrap="wrap">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="xs"
            variant={state === formState ? "filled" : "outline"}
            onClick={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </Group>

      <Box
        pos="relative"
        p="md"
        mih="8rem"
        style={{
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        <LoadingOverlay
          visible={formState === "loading"}
          loaderProps={{ "aria-label": labels.stateLoading }}
        />
        {formState === "error" ? (
          <Alert color="undrrError" variant="light" role="alert" mb="sm">
            {labels.stateError}
          </Alert>
        ) : null}
        {formState === "success" ? (
          <Alert color="undrrSuccess" variant="light" role="status" mb="sm">
            {labels.stateSuccess}
          </Alert>
        ) : null}
        {formState === "empty" ? (
          <Text c="dimmed">{labels.stateEmpty}</Text>
        ) : (
          <TextInput
            label={labels.fieldCountry}
            defaultValue="Mozambique"
            disabled={formState === "loading"}
          />
        )}
      </Box>
    </Box>
  );
}
