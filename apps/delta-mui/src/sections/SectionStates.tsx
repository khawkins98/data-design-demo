/**
 * Section 7: loading, empty, error and success states for the table and a form.
 *
 * MUI covers more of this natively than React Aria: `Alert` gives error and
 * success banners with the right ARIA role, `LinearProgress` gives loading, and
 * DataGrid has a `loading` prop plus a `noRowsOverlay` slot for empty. Almost
 * nothing here is custom.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Alert, Box, Button, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { LOAD_STATES, recordsForState, useDemo } from "../demo-state.js";
import type { LoadState } from "../demo-state.js";

export function SectionStates(): ReactElement {
  const { labels } = useDemo();
  const [tableState, setTableState] = useState<LoadState>("success");
  const [formState, setFormState] = useState<LoadState>("success");

  const columns: GridColDef[] = [
    { field: "country", headerName: labels.colCountry, flex: 1 },
    { field: "hazardType", headerName: labels.colHazard, flex: 1 },
    { field: "verificationStatus", headerName: labels.colStatus, flex: 1 },
  ];

  const rows = recordsForState(tableState, LOSS_RECORDS).slice(0, 3);

  return (
    <Box component="section" id="section-7" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        7. Loading, empty, error and success states
      </Typography>

      <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: "wrap" }}>
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="small"
            variant={state === tableState ? "contained" : "outlined"}
            onClick={() => setTableState(state)}
          >
            table: {state}
          </Button>
        ))}
      </Stack>

      <Box sx={{ mb: 4 }}>
        {tableState === "error" ? (
          <Alert severity="error">{labels.stateError}</Alert>
        ) : tableState === "success" ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {labels.stateSuccess}
          </Alert>
        ) : null}

        {tableState !== "error" ? (
          <Box sx={{ height: 260 }}>
            <DataGrid
              rows={[...rows]}
              columns={columns}
              loading={tableState === "loading"}
              hideFooter
              aria-label={`${labels.navRecords} (${tableState})`}
              slotProps={{
                loadingOverlay: { variant: "linear-progress" },
              }}
              localeText={{ noRowsLabel: labels.stateEmpty }}
            />
          </Box>
        ) : null}
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: "wrap" }}>
        {LOAD_STATES.map((state) => (
          <Button
            key={state}
            size="small"
            variant={state === formState ? "contained" : "outlined"}
            onClick={() => setFormState(state)}
          >
            form: {state}
          </Button>
        ))}
      </Stack>

      <Box sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 1, minHeight: "8rem" }}>
        {formState === "loading" ? <LinearProgress aria-label={labels.stateLoading} /> : null}
        {formState === "error" ? <Alert severity="error">{labels.stateError}</Alert> : null}
        {formState === "success" ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {labels.stateSuccess}
          </Alert>
        ) : null}
        {formState === "empty" ? (
          <Typography color="text.secondary">{labels.stateEmpty}</Typography>
        ) : (
          <TextField
            label={labels.fieldCountry}
            defaultValue="Mozambique"
            disabled={formState === "loading"}
          />
        )}
      </Box>
    </Box>
  );
}
