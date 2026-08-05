/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * Mantine covers this well and mostly natively. `Alert` carries the right ARIA
 * role, `Loader` and `LoadingOverlay` give loading, `Skeleton` gives the
 * placeholder rows, and 9.5 adds `EmptyState`, a documented component for the
 * empty case — which is more than either sibling demo had. `table-states` is
 * still `composed` rather than `native`, because the state MACHINE is ours: the
 * presentational Table has no `loading` or `noRows` slot to hand it to, unlike
 * MUI's DataGrid.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Alert,
  Button,
  EmptyState,
  Group,
  Loader,
  Paper,
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
    <section id="section-7">
      <Title order={3} mb="md">
        7. Loading, empty, error and success states
      </Title>

      <Group mb="sm" wrap="wrap">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="xs"
            variant={state === tableState ? "filled" : "default"}
            onClick={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </Group>

      <Paper withBorder p="md" mb="lg" mih="10rem">
        {tableState === "error" ? <Alert color="red">{labels.stateError}</Alert> : null}
        {tableState === "success" ? (
          <Alert color="green" mb="sm">
            {labels.stateSuccess}
          </Alert>
        ) : null}

        {tableState === "loading" ? (
          <Stack gap="xs" aria-label={labels.stateLoading} aria-busy="true">
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm">{labels.stateLoading}</Text>
            </Group>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </Stack>
        ) : null}

        {tableState === "empty" ? (
          <EmptyState title={labels.stateEmpty} description={labels.actionClearFilters} />
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
      </Paper>

      <Group mb="sm" wrap="wrap">
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="xs"
            variant={state === formState ? "filled" : "default"}
            onClick={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </Group>

      <Paper withBorder p="md" mih="8rem">
        <Stack gap="sm">
          {formState === "loading" ? (
            <Group gap="xs">
              <Loader size="sm" aria-label={labels.stateLoading} />
              <Text size="sm">{labels.stateLoading}</Text>
            </Group>
          ) : null}
          {formState === "error" ? <Alert color="red">{labels.stateError}</Alert> : null}
          {formState === "success" ? <Alert color="green">{labels.stateSuccess}</Alert> : null}
          {formState === "empty" ? (
            <EmptyState title={labels.stateEmpty} />
          ) : (
            <TextInput
              label={labels.fieldCountry}
              defaultValue="Mozambique"
              disabled={formState === "loading"}
            />
          )}
        </Stack>
      </Paper>
    </section>
  );
}
