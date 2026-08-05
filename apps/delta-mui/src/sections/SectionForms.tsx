/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * MUI's TextField bundles label, input, helper text and error state into one
 * component, which is far less markup than composing primitives — the opposite
 * trade from React Aria. The cost is that anything the bundle does not
 * anticipate has to be reached through `slotProps`.
 *
 * `server-rejected` has no library affordance: MUI has no form-level error
 * channel, so it is component state we manage.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";

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
    <Box component="section" id="section-1" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        1. Buttons, links, inputs and validation
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: "wrap" }}>
        <Button variant="contained">{labels.actionSave}</Button>
        <Button variant="outlined">{labels.actionCancel}</Button>
        <Button variant="contained" color="error">
          {labels.actionDelete}
        </Button>
        <Button variant="outlined" disabled>
          {labels.actionExport}
        </Button>
      </Stack>

      <Typography sx={{ mb: 3, maxWidth: "68ch" }}>
        Long labels are fixture content and must render untouched:{" "}
        <Link href="#section-1">{labels.longAccessibilityNotice}</Link>
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          mb: 3,
        }}
      >
        <TextField
          label={labels.fieldCountry}
          defaultValue="Bangladesh"
          helperText={labels.longSubmissionGuidance}
        />

        <TextField
          label={labels.fieldDataSource}
          value=""
          required
          error
          helperText={required ? labels[required.messageKey] : ""}
          slotProps={{ input: { readOnly: true } }}
        />

        <TextField
          label={labels.fieldEventDate}
          value={format?.input ?? ""}
          error
          helperText={format ? labels[format.messageKey] : ""}
          slotProps={{ input: { readOnly: true } }}
        />

        <TextField
          label={labels.colPeopleAffected}
          value={range?.input ?? ""}
          error
          helperText={range ? labels[range.messageKey] : ""}
          slotProps={{ input: { readOnly: true } }}
        />

        <TextField
          label={labels.fieldNarrative}
          defaultValue="Sendai Framework Monitor"
          disabled
          helperText="Disabled state"
        />
      </Box>

      {/* server-rejected: no library channel, so this is our own state. */}
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          setServerRejected(true);
        }}
        sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 1 }}
      >
        <TextField
          label={labels.fieldDataSource}
          defaultValue={server?.input ?? ""}
          error={serverRejected}
          helperText={serverRejected && server ? labels[server.messageKey] : " "}
          sx={{ mb: 2, display: "block" }}
        />
        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained">
            {labels.actionSave}
          </Button>
          <Button variant="outlined" onClick={() => setServerRejected(false)}>
            {labels.actionCancel}
          </Button>
        </Stack>
        {serverRejected ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {server ? labels[server.messageKey] : ""}
          </Alert>
        ) : null}
      </Box>
    </Box>
  );
}
