/**
 * Embedded-island view: MUI owns ONE region inside a real UNDRR page frame.
 *
 * The kitchen sink hands MUI the whole content column. This view is the opposite
 * and the realistic Mangrove case: host prose above, host prose below, and a
 * single filterable data table in between. See `IslandFrame.tsx` for what that
 * arrangement is meant to surface.
 *
 * WHY THE SECTIONS FROM `@undrr-eval/integration-mui` ARE NOT REUSED HERE.
 * `SectionDataTable` was the obvious candidate and it does not fit: it renders
 * `id="section-6"`, a numbered `h3` ("6. Data table, 250 rows"), and a DataGrid
 * with `showToolbar` and `checkboxSelection` — a component inventory entry, not a
 * screen. Its filtering is the grid's own header menu, not the filter controls a
 * real UNDRR page puts above a table. Reusing it would have meant a numbered
 * heading in the middle of host prose. The DataGrid *column* definitions are the
 * genuinely shared part and are rebuilt here at the narrower island width; that
 * split is honest A3 evidence: the theme and labels extracted cleanly, the
 * kitchen-sink sections did not, because they were written to be inventory.
 *
 * Fixture data only, and no `new Date()`: `Intl` formatting is driven by the
 * locale's BCP 47 tag and every value comes from `LOSS_RECORDS`.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  ScopedCssBaseline,
  Select,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { arEG, deDE, enUS, frFR } from "@mui/material/locale";
import type { Localization } from "@mui/material/locale";
import { createTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import {
  arSD as gridArSD,
  deDE as gridDeDE,
  enUS as gridEnUS,
  frFR as gridFrFR,
} from "@mui/x-data-grid/locales";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LocaleCode, VerificationStatus } from "@undrr-eval/fixtures";
import { IslandFrame, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { KnownIssues } from "@undrr-eval/known-issues";
import { DemoContext, labelsFor, undrrMuiTheme } from "@undrr-eval/integration-mui";
import type { DemoContextValue } from "@undrr-eval/integration-mui";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

/** The leakage contract: `?candidate=off` renders the frame with no candidate. */
const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

const STATUS_COLOUR: Record<VerificationStatus, "success" | "warning" | "error" | "default"> = {
  verified: "success",
  pending: "warning",
  disputed: "error",
  withdrawn: "default",
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

const ALL = "all";

/**
 * TWO locale bundles, because MUI X is a separate product from MUI core.
 *
 * `MUI_LOCALES` is core's (`@mui/material/locale`) and rides the theme;
 * `GRID_LOCALES` is the grid's own (`@mui/x-data-grid/locales`) and is passed as
 * `localeText`, because the grid resolves every string it renders through
 * `getLocaleText` and passes them to its footer explicitly, so theme defaults
 * cannot reach them. Two packages, two bundles — a real cost of the X dependency,
 * and the only honest thing to record about MUI's i18n here.
 *
 * ONE GENUINE GAP, named precisely: the fixtures declare Arabic as `ar-EG`, core
 * ships `arEG`, and the grid does not — its Arabic packs are `arSD` (Saudi) and
 * `arSA`. `gridArSD` is therefore the closest available pack rather than an exact
 * tag match. It is Modern Standard Arabic in both cases, so the grid's chrome is
 * correct Arabic; the mismatch is regional, and it is a gap in MUI X's pack
 * coverage rather than in our wiring. Everything else lines up exactly: `frFR`,
 * `deDE` and `enUS` exist in both packages.
 */
const MUI_LOCALES: Record<LocaleCode, Localization> = {
  en: enUS,
  fr: frFR,
  de: deDE,
  ar: arEG,
};

const GRID_LOCALES = {
  en: gridEnUS,
  fr: gridFrFR,
  de: gridDeDE,
  ar: gridArSD,
} as const satisfies Record<LocaleCode, unknown>;

export function IslandView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const demo: DemoContextValue = useMemo(() => {
    const meta = LOCALES.find((entry) => entry.code === locale);
    return {
      locale,
      labels: labelsFor(locale),
      bcp47: meta?.bcp47 ?? "en-GB",
      dir: meta?.dir ?? "ltr",
    };
  }, [locale]);

  /**
   * Same theme rebuild per direction as the kitchen sink; see `App.tsx`. Core's
   * locale bundle rides along as a third `createTheme` argument — MUI's documented
   * way in, since the bundles are plain `components.*.defaultProps`.
   */
  const theme = useMemo(
    () => createTheme(undrrMuiTheme, { direction: demo.dir }, MUI_LOCALES[locale]),
    [demo.dir, locale],
  );

  const { labels, bcp47 } = demo;

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(bcp47);
    return LOSS_RECORDS.filter((row) => {
      if (country !== ALL && row.country !== country) return false;
      if (hazard !== ALL && row.hazardType !== hazard) return false;
      if (status !== ALL && row.verificationStatus !== status) return false;
      if (needle && !row.dataSource.toLocaleLowerCase(bcp47).includes(needle)) return false;
      return true;
    });
  }, [country, hazard, status, query, bcp47]);

  const columns = useMemo<GridColDef[]>(() => {
    const number = new Intl.NumberFormat(bcp47);
    const decimal = new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const date = new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" });

    return [
      { field: "country", headerName: labels.colCountry, flex: 1, minWidth: 120 },
      { field: "hazardType", headerName: labels.colHazard, flex: 1, minWidth: 130 },
      {
        field: "eventDate",
        headerName: labels.colEventDate,
        minWidth: 130,
        valueFormatter: (value: string) => date.format(new Date(`${value}T00:00:00Z`)),
      },
      {
        field: "peopleAffected",
        headerName: labels.colPeopleAffected,
        type: "number",
        minWidth: 140,
        valueFormatter: (value: number) => number.format(value),
      },
      {
        field: "economicLossUsdMillions",
        headerName: labels.colEconomicLoss,
        type: "number",
        minWidth: 150,
        valueFormatter: (value: number) => decimal.format(value),
      },
      {
        field: "verificationStatus",
        headerName: labels.colStatus,
        minWidth: 140,
        renderCell: (cell) => (
          <Chip
            size="small"
            label={cell.value}
            color={STATUS_COLOUR[cell.value as VerificationStatus]}
          />
        ),
      },
    ];
  }, [labels, bcp47]);

  return (
    <IslandFrame
      title={labels.appTitle}
      dir={demo.dir}
      /*
       * The frame's `pageHeader` and `notices` slots render both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they are present in the leakage baseline as well as the
       * candidate render and therefore cannot themselves register as a difference.
       *
       * `"application"` is deliberately absent from `available`: the whole-DELTA-
       * screen view is a Delta view, and this is the Mangrove host. Listing it here
       * would produce a dead link to an `app.html` this app does not ship.
       */
      pageHeader={
        <ViewSwitcher
          views={viewLinks(["island", "inventory"], "island")}
          pairingName="MUI Community on Mangrove"
          otherHost={{ label: "MUI on Delta", href: "../delta-mui/" }}
        />
      }
      notices={<KnownIssues candidate="mui" host="mangrove" candidateName="MUI Community" />}
    >
      {candidateEnabled ? (
        <ThemeProvider theme={theme}>
          <ScopedCssBaseline className={`${TOKEN_SCOPE_CLASS} demo`}>
            <DemoContext.Provider value={demo}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={locale}
                onChange={(_event, next: LocaleCode | null) => {
                  if (next) setLocale(next);
                }}
                aria-label="Locale"
                sx={{ mb: 3 }}
              >
                {LOCALES.map((entry) => (
                  <ToggleButton key={entry.code} value={entry.code}>
                    {entry.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/*
                * Filter controls ABOVE the table, which is where a real UNDRR
                * page puts them. Four controls rather than the grid's own filter
                * menu, because the menu is a component feature and this is a
                * layout question.
                */}
              <Box
                component="form"
                onSubmit={(event) => event.preventDefault()}
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
                  mb: 2,
                }}
              >
                <FormControl size="small">
                  <InputLabel id="island-country">{labels.fieldCountry}</InputLabel>
                  <Select
                    labelId="island-country"
                    label={labels.fieldCountry}
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setPagination((prev) => ({ ...prev, page: 0 }));
                    }}
                  >
                    <MenuItem value={ALL}>{labels.actionClearFilters}</MenuItem>
                    {COUNTRIES.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel id="island-hazard">{labels.fieldHazard}</InputLabel>
                  <Select
                    labelId="island-hazard"
                    label={labels.fieldHazard}
                    value={hazard}
                    onChange={(event) => {
                      setHazard(event.target.value);
                      setPagination((prev) => ({ ...prev, page: 0 }));
                    }}
                  >
                    <MenuItem value={ALL}>{labels.actionClearFilters}</MenuItem>
                    {OPTIONS_SMALL.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel id="island-status">{labels.colStatus}</InputLabel>
                  <Select
                    labelId="island-status"
                    label={labels.colStatus}
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPagination((prev) => ({ ...prev, page: 0 }));
                    }}
                  >
                    <MenuItem value={ALL}>{labels.actionClearFilters}</MenuItem>
                    {STATUSES.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label={labels.fieldDataSource}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPagination((prev) => ({ ...prev, page: 0 }));
                  }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {new Intl.NumberFormat(bcp47).format(rows.length)} /{" "}
                {new Intl.NumberFormat(bcp47).format(LOSS_RECORDS.length)} —{" "}
                {labels.navRecords}
              </Typography>

              {/*
                * A fixed height is not optional: DataGrid measures its own
                * viewport and a height-auto grid inside a flow-layout page
                * collapses. In an island that is a real constraint, because the
                * host page below the grid cannot reflow around its content.
                */}
              <Box sx={{ height: 480, width: "100%" }}>
                <DataGrid
                  rows={[...rows]}
                  columns={columns}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  paginationModel={pagination}
                  onPaginationModelChange={setPagination}
                  pageSizeOptions={[10, 25, 50]}
                  /*
                   * The grid's own locale pack FIRST, the one fixture label it can
                   * take LAST, so `noRowsLabel` still comes from the fixtures while
                   * `paginationRowsPerPage`, `paginationDisplayedRows` and
                   * `paginationItemAriaLabel` come from MUI X. The footer's strings
                   * were previously left English in all four locales and recorded as
                   * a finding; they were a wiring gap of ours, since
                   * `@mui/x-data-grid/locales` ships every locale this demo uses.
                   *
                   * The finding that survives is narrower and stated at
                   * `GRID_LOCALES`: MUI X is a second package with a second bundle,
                   * and its Arabic pack is `arSD`, not the `arEG` the fixtures
                   * declare. The pack coverage claim — "a second, parallel
                   * translation source to the fixtures" — did not survive, because
                   * these bundles translate MUI's chrome, which the fixtures never
                   * carried, and because the antd pairings wire their equivalent
                   * packs and were credited for it.
                   */
                  localeText={{
                    ...GRID_LOCALES[locale].components.MuiDataGrid.defaultProps.localeText,
                    noRowsLabel: labels.stateEmpty,
                  }}
                  aria-label={labels.navRecords}
                />
              </Box>
            </DemoContext.Provider>
          </ScopedCssBaseline>
        </ThemeProvider>
      ) : null}
    </IslandFrame>
  );
}
