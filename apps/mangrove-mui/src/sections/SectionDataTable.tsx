/**
 * Section 6: data table over the 250-row fixture.
 *
 * This is where MUI's community DataGrid pays off relative to React Aria: sorting,
 * multi-select with a header select-all, filtering, pagination with a page-size
 * control and column resizing are all props. No comparator, no predicate, no
 * page state, no pagination control to write.
 *
 * Column *reorder* is Pro-only (`disableColumnReorder` appears in the community
 * build's Pro-omit list), but the brief accepts resize or reorder and resize is
 * free — `resizable` is on GridColDef in the community package.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";
import type { VerificationStatus } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

const STATUS_COLOUR: Record<VerificationStatus, "success" | "warning" | "error" | "default"> = {
  verified: "success",
  pending: "warning",
  disputed: "error",
  withdrawn: "default",
};

export function SectionDataTable(): ReactElement {
  const { labels, bcp47 } = useDemo();

  const columns = useMemo<GridColDef[]>(() => {
    const number = new Intl.NumberFormat(bcp47);
    const decimal = new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const date = new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" });
    const dateTime = new Intl.DateTimeFormat(bcp47, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    });

    return [
      { field: "country", headerName: labels.colCountry, width: 130, resizable: true },
      { field: "hazardType", headerName: labels.colHazard, width: 150, resizable: true },
      {
        field: "eventDate",
        headerName: labels.colEventDate,
        width: 140,
        resizable: true,
        valueFormatter: (value: string) => date.format(new Date(`${value}T00:00:00Z`)),
      },
      {
        field: "reportedAt",
        headerName: labels.colReportedAt,
        width: 160,
        resizable: true,
        valueFormatter: (value: string) => dateTime.format(new Date(value)),
      },
      {
        field: "peopleAffected",
        headerName: labels.colPeopleAffected,
        width: 150,
        type: "number",
        resizable: true,
        valueFormatter: (value: number) => number.format(value),
      },
      {
        field: "economicLossUsdMillions",
        headerName: labels.colEconomicLoss,
        width: 180,
        type: "number",
        resizable: true,
        valueFormatter: (value: number) => decimal.format(value),
      },
      {
        field: "verificationStatus",
        headerName: labels.colStatus,
        width: 160,
        resizable: true,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={STATUS_COLOUR[params.value as VerificationStatus]}
          />
        ),
      },
      {
        field: "reviewNote",
        headerName: labels.colReviewNote,
        width: 260,
        resizable: true,
        valueFormatter: (value: string | null) => value ?? "—",
      },
    ];
  }, [labels, bcp47]);

  return (
    <Box component="section" id="section-6" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        6. Data table, {LOSS_RECORDS.length} rows
      </Typography>

      <Box sx={{ height: 520, width: "100%" }}>
        <DataGrid
          rows={[...LOSS_RECORDS]}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          showToolbar
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: "eventDate", sort: "desc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          aria-label={labels.navRecords}
        />
      </Box>
    </Box>
  );
}
