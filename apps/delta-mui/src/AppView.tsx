/**
 * Full-application view: MUI carries a whole DELTA records screen.
 *
 * Modelled on DELTA's real `DisasterEventsPage`: page header with summary text, a
 * collapsible filter card, a table with status pills and row-action icon buttons,
 * pagination, and one modal flow (delete confirmation).
 *
 * WHY `Table` AND NOT `DataGrid`. The island view uses DataGrid, where its
 * built-in pagination is the whole point. Here the screen needs row actions,
 * status pills and a delete flow, and DataGrid puts each of those behind
 * `renderCell` — a React tree inside a virtualised cell, with the grid owning
 * focus order. Composing `Table` + `TablePagination` keeps the row actions in
 * normal DOM order, which is what the keyboard behaviour of a records screen
 * depends on. The trade is real and worth recording: choosing composition means
 * writing the sort comparator, the page slice and the pagination wiring by hand,
 * all of which DataGrid gave away for free two files over.
 *
 * NO ICON PACKAGE. `@mui/icons-material` is not a dependency of this app and
 * installing one was out of scope for this change, so the three row actions use
 * `SvgIcon` with inline Material path data. MUI's icons are a separate package
 * from the component library; a real DELTA screen would add it.
 *
 * Fixture data only. Deletion is local component state over `LOSS_RECORDS`; no
 * fixture is mutated and there is no `new Date()` anywhere.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  ScopedCssBaseline,
  Select,
  Stack,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { createTheme } from "@mui/material/styles";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { AppFrame, ViewSwitcher } from "@undrr-eval/host-delta";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { KnownIssues } from "@undrr-eval/known-issues";
import { DemoContext, labelsFor, undrrMuiTheme } from "@undrr-eval/integration-mui";
import type { DemoContextValue } from "@undrr-eval/integration-mui";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

/** The leakage contract: `?candidate=off` renders the frame with no candidate. */
const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

const ALL = "all";

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

/** Material path data, inlined because `@mui/icons-material` is not installed. */
const PATHS = {
  view: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  remove:
    "M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  chevron: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
} as const;

type SortField = "country" | "eventDate" | "peopleAffected" | "economicLossUsdMillions";

export function AppView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const [sortField, setSortField] = useState<SortField>("eventDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [deleted, setDeleted] = useState<readonly string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LossRecord | null>(null);

  const demo: DemoContextValue = useMemo(() => {
    const meta = LOCALES.find((entry) => entry.code === locale);
    return {
      locale,
      labels: labelsFor(locale),
      bcp47: meta?.bcp47 ?? "en-GB",
      dir: meta?.dir ?? "ltr",
    };
  }, [locale]);

  /** Same theme rebuild per direction as the kitchen sink; see `App.tsx`. */
  const theme = useMemo(
    () => createTheme(undrrMuiTheme, { direction: demo.dir }),
    [demo.dir],
  );

  const { labels, bcp47 } = demo;

  const formatters = useMemo(
    () => ({
      number: new Intl.NumberFormat(bcp47),
      decimal: new Intl.NumberFormat(bcp47, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      date: new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
    }),
    [bcp47],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(bcp47);
    return LOSS_RECORDS.filter((row) => {
      if (deleted.includes(row.id)) return false;
      if (country !== ALL && row.country !== country) return false;
      if (hazard !== ALL && row.hazardType !== hazard) return false;
      if (status !== ALL && row.verificationStatus !== status) return false;
      if (needle && !row.dataSource.toLocaleLowerCase(bcp47).includes(needle)) return false;
      return true;
    });
  }, [country, hazard, status, query, deleted, bcp47]);

  /** Written by hand: the price of composing `Table` instead of `DataGrid`. */
  const sorted = useMemo(() => {
    const collator = new Intl.Collator(bcp47);
    const direction = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = a[sortField];
      const right = b[sortField];
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return collator.compare(String(left), String(right)) * direction;
    });
  }, [filtered, sortField, sortAsc, bcp47]);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const filtersActive =
    country !== ALL || hazard !== ALL || status !== ALL || query.trim() !== "";

  const resetFilters = (): void => {
    setCountry(ALL);
    setHazard(ALL);
    setStatus(ALL);
    setQuery("");
    setPage(0);
  };

  const sortHeader = (field: SortField, label: string): ReactElement => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field && sortAsc ? "asc" : "desc"}
      onClick={() => {
        if (sortField === field) setSortAsc((prev) => !prev);
        else {
          setSortField(field);
          setSortAsc(true);
        }
        setPage(0);
      }}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <AppFrame
      title={labels.appTitle}
      dir={demo.dir}
      /*
       * The frame's `notices` slot renders both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they are present in the leakage baseline as well as the
       * candidate render and therefore cannot themselves register as a difference.
       *
       * `"island"` is deliberately absent from `available`: the embedded-island view
       * is a Mangrove view, and this is the Delta host. Listing it here would produce
       * a dead link to an `island.html` this app does not ship.
       */
      notices={
        <>
          <ViewSwitcher
            views={viewLinks(["application", "inventory"], "application")}
            pairingName="MUI Community on Delta"
            otherHost={{ label: "MUI on Mangrove", href: "../mangrove-mui/" }}
          />
          <KnownIssues candidate="mui" host="delta" candidateName="MUI Community" />
        </>
      }
    >
      {candidateEnabled ? (
        <ThemeProvider theme={theme}>
          <ScopedCssBaseline className={`${TOKEN_SCOPE_CLASS} demo`}>
            <DemoContext.Provider value={demo}>
              {/* ---------------------------------------------- page header -- */}
              {/*
                * `justifyContent`, `alignItems` and `flexWrap` are NOT Stack props
                * in MUI 9 — the v6 system props were removed, so every flex
                * alignment on a Stack has to go through `sx`. Caught by
                * typecheck, not at runtime.
                */}
              <Stack
                direction="row"
                useFlexGap
                spacing={2}
                sx={{
                  mb: 3,
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
                    {labels.navRecords}
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: "68ch" }}>
                    {formatters.number.format(sorted.length)} /{" "}
                    {formatters.number.format(LOSS_RECORDS.length)} —{" "}
                    {labels.longVerificationBanner}
                  </Typography>
                </Box>

                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={locale}
                  onChange={(_event, next: LocaleCode | null) => {
                    if (next) setLocale(next);
                  }}
                  aria-label="Locale"
                >
                  {LOCALES.map((entry) => (
                    <ToggleButton key={entry.code} value={entry.code}>
                      {entry.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>

              {/* ------------------------------------- collapsible filters -- */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <Stack
                  direction="row"
                  sx={{ px: 3, py: 2, alignItems: "center", justifyContent: "space-between" }}
                >
                  <Button
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    aria-expanded={filtersOpen}
                    aria-controls="records-filters"
                    endIcon={
                      <SvgIcon
                        sx={{
                          transition: "transform 120ms",
                          transform: filtersOpen ? "rotate(180deg)" : "none",
                        }}
                      >
                        <path d={PATHS.chevron} />
                      </SvgIcon>
                    }
                  >
                    {labels.actionFilter}
                  </Button>
                  <Button
                    size="small"
                    onClick={resetFilters}
                    disabled={!filtersActive}
                  >
                    {labels.actionClearFilters}
                  </Button>
                </Stack>

                <Collapse in={filtersOpen} unmountOnExit>
                  <CardContent
                    id="records-filters"
                    component="form"
                    onSubmit={(event) => event.preventDefault()}
                    sx={{
                      display: "grid",
                      gap: 3,
                      gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
                      pt: 0,
                    }}
                  >
                    <FormControl size="small">
                      <InputLabel id="app-country">{labels.fieldCountry}</InputLabel>
                      <Select
                        labelId="app-country"
                        label={labels.fieldCountry}
                        value={country}
                        onChange={(event) => {
                          setCountry(event.target.value);
                          setPage(0);
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
                      <InputLabel id="app-hazard">{labels.fieldHazard}</InputLabel>
                      <Select
                        labelId="app-hazard"
                        label={labels.fieldHazard}
                        value={hazard}
                        onChange={(event) => {
                          setHazard(event.target.value);
                          setPage(0);
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
                      <InputLabel id="app-status">{labels.colStatus}</InputLabel>
                      <Select
                        labelId="app-status"
                        label={labels.colStatus}
                        value={status}
                        onChange={(event) => {
                          setStatus(event.target.value);
                          setPage(0);
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
                        setPage(0);
                      }}
                    />
                  </CardContent>
                </Collapse>
              </Card>

              {/* ----------------------------------------- records table -- */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label={labels.navRecords}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{sortHeader("country", labels.colCountry)}</TableCell>
                      <TableCell>{labels.colHazard}</TableCell>
                      <TableCell>{sortHeader("eventDate", labels.colEventDate)}</TableCell>
                      <TableCell align="right">
                        {sortHeader("peopleAffected", labels.colPeopleAffected)}
                      </TableCell>
                      <TableCell align="right">
                        {sortHeader("economicLossUsdMillions", labels.colEconomicLoss)}
                      </TableCell>
                      <TableCell>{labels.colStatus}</TableCell>
                      <TableCell align="right">{labels.colReviewNote}</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography color="text.secondary" sx={{ py: 3 }}>
                            {labels.stateEmpty}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.country}</TableCell>
                          <TableCell>{row.hazardType}</TableCell>
                          <TableCell>
                            {formatters.date.format(new Date(`${row.eventDate}T00:00:00Z`))}
                          </TableCell>
                          <TableCell align="right">
                            {formatters.number.format(row.peopleAffected)}
                          </TableCell>
                          <TableCell align="right">
                            {formatters.decimal.format(row.economicLossUsdMillions)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={row.verificationStatus}
                              color={STATUS_COLOUR[row.verificationStatus]}
                            />
                          </TableCell>
                          {/*
                            * Row actions. `align="right"` is a PHYSICAL value and
                            * MUI's Table has no logical equivalent, so in Arabic
                            * this column stays pinned to the physical right while
                            * the row itself has flipped. Recorded as a finding.
                            */}
                          <TableCell align="right">
                            <Stack direction="row" spacing={0} sx={{ justifyContent: "flex-end" }}>
                              <Tooltip title={`${labels.navRecords}: ${row.id}`}>
                                <IconButton
                                  size="small"
                                  aria-label={`${labels.navRecords} ${row.id}`}
                                >
                                  <SvgIcon fontSize="small">
                                    <path d={PATHS.view} />
                                  </SvgIcon>
                                </IconButton>
                              </Tooltip>

                              <Tooltip title={`${labels.actionSave}: ${row.id}`}>
                                <IconButton
                                  size="small"
                                  aria-label={`${labels.actionSave} ${row.id}`}
                                >
                                  <SvgIcon fontSize="small">
                                    <path d={PATHS.edit} />
                                  </SvgIcon>
                                </IconButton>
                              </Tooltip>

                              <Tooltip title={`${labels.actionDelete}: ${row.id}`}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label={`${labels.actionDelete} ${row.id}`}
                                  onClick={() => setPendingDelete(row)}
                                >
                                  <SvgIcon fontSize="small">
                                    <path d={PATHS.remove} />
                                  </SvgIcon>
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <TablePagination
                  component="div"
                  count={sorted.length}
                  page={page}
                  onPageChange={(_event, next) => setPage(next)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                  /*
                   * `labelRowsPerPage` and `labelDisplayedRows` are LEFT AT MUI's
                   * English defaults on purpose. The fixture label set has no
                   * pagination strings, and inventing translations is out of
                   * bounds. So in Arabic, French and German this screen shows
                   * English pagination chrome. MUI ships locale bundles for this
                   * (`@mui/material/locale`), but they are a second, parallel
                   * translation source to the fixtures — a finding, not a fix.
                   */
                />
              </TableContainer>

              {/* ------------------------------------------- modal flow -- */}
              <Dialog
                open={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                aria-labelledby="delete-title"
              >
                <DialogTitle id="delete-title">{labels.actionDelete}</DialogTitle>
                <DialogContent>
                  <DialogContentText sx={{ mb: 2 }}>
                    {labels.longRetentionNotice}
                  </DialogContentText>
                  {pendingDelete ? (
                    /*
                     * `text.primary`, not DialogContentText's default
                     * `text.secondary`. The line identifying the record about to
                     * be deleted is the most important text in the dialog, and
                     * MUI's DialogContentText hard-codes the secondary colour for
                     * every child — there is no "this line is the important one"
                     * variant, so it takes an `sx` override.
                     */
                    <DialogContentText component="div" sx={{ color: "text.primary" }}>
                      <strong>{pendingDelete.id}</strong> — {pendingDelete.country},{" "}
                      {pendingDelete.hazardType},{" "}
                      {formatters.date.format(
                        new Date(`${pendingDelete.eventDate}T00:00:00Z`),
                      )}
                    </DialogContentText>
                  ) : null}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setPendingDelete(null)}>
                    {labels.actionCancel}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      if (pendingDelete) {
                        setDeleted((prev) => [...prev, pendingDelete.id]);
                        setPage(0);
                      }
                      setPendingDelete(null);
                    }}
                  >
                    {labels.actionDelete}
                  </Button>
                </DialogActions>
              </Dialog>
            </DemoContext.Provider>
          </ScopedCssBaseline>
        </ThemeProvider>
      ) : null}
    </AppFrame>
  );
}
