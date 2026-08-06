/**
 * Full-application view: Carbon carries a whole DELTA records screen.
 *
 * Modelled on DELTA's real `DisasterEventsPage`: page header with summary text, a
 * collapsible filter card, a data table with status pills and row-action icon
 * buttons, pagination, and one modal flow (delete confirmation).
 *
 * WHAT CARBON OWNS HERE
 *   Sorting     `DataTable isSortable`, comparator included. Rows therefore carry
 *               RAW fixture values and format at render time; pre-formatted
 *               strings would sort "1.234.567" before "999".
 *   Pagination  the `Pagination` control, with its page-size select.
 *   Modal       `Modal` with `danger`, focus trap, Escape handling, and focus
 *               restoration via `launcherButtonRef` — which is opt-in, and the
 *               row-action buttons are exactly where losing focus hurts.
 *   Icons       `@carbon/react/icons` is part of the library, not a separate
 *               install. The MUI run had to inline Material path data because
 *               `@mui/icons-material` is its own package; Carbon ships icons with
 *               the components.
 *
 * WHAT IS OURS
 *   The disclosure.  Carbon has NO collapse, disclosure or details primitive. Its
 *                    only expand/collapse component is `Accordion`, which imposes
 *                    its own full-width bordered heading rows and chevron and does
 *                    not read as a filter card. So the toggle button,
 *                    `aria-expanded`, `aria-controls` and the conditional render
 *                    are application code — six lines that MUI got from
 *                    `<Collapse>`.
 *   Cell formatting. No `valueFormatter` on a Carbon cell; every `Intl` call is at
 *                    the call site.
 *   The page slice.  `Pagination` is presentation only. It reports
 *                    `{ page, pageSize }` and you slice.
 *   Filtering.       `TableToolbarSearch` filters across every cell, which is not
 *                    what a records screen's filter card does. Five controls, five
 *                    predicates, ours.
 *
 * THE DATE FILTER IS A DELIBERATE PROBE. `DatePicker` wraps flatpickr, a
 * third-party non-React widget, and it brings two defects a Carbon-only screen
 * would not have. (1) It appends its calendar to `document.body` unless given
 * `appendTo`, which puts it outside `.undrr-tokens` where every `--undrr-*`
 * resolves to nothing and Carbon's `var(--cds-x, #literal)` fallbacks paint IBM's
 * stock white theme instead — visible, usable, silently off-brand. `useOverlayHost`
 * supplies the container. (2) It does not mirror in RTL: `.flatpickr-calendar` is
 * authored with physical `left`/`right`, so in Arabic the calendar stays LTR inside
 * a mirrored page. Both are measured in e2e/app.spec.ts rather than described.
 *
 * Fixture data only. Deletion is local component state over `LOSS_RECORDS`; no
 * fixture is mutated and there is no `new Date()` except to reformat fixture ISO
 * strings at a fixed time zone.
 */

import { useMemo, useRef, useState } from "react";
import type { ComponentProps, ReactElement } from "react";
import {
  Button,
  ContentSwitcher,
  DataTable,
  DatePicker,
  DatePickerInput,
  Dropdown,
  IconButton,
  Modal,
  Pagination,
  Search,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { ChevronDown, ChevronUp, Edit, TrashCan, View } from "@carbon/react/icons";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { AppFrame, ViewSwitcher } from "@undrr-eval/host-delta";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { asProps } from "./carbon-props.js";
import { DemoContext, calendarDateToIso, formattersFor, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { useOverlayHost } from "./overlay-scope.js";

/** The leakage contract: `?candidate=off` renders the frame with no candidate. */
const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

/**
 * Sentinel for "no filter", in OUR state only. It is deliberately NOT an option in
 * any Dropdown.
 *
 * Carbon's Dropdown has no empty-option concept and no `clearSelection` (its
 * ComboBox has a clear button; Dropdown does not). Earlier revisions papered over
 * that by prepending a sentinel option labelled `labels.actionClearFilters`, so a
 * collapsed dropdown's visible text AND its accessible name were both "Clear
 * filters" — sitting directly beside the real Clear-filters button saying the same
 * thing. The fixture set carries no "All"/"Any" string and inventing one in four
 * locales is out of bounds, so the sentinel is gone and Carbon's own empty state
 * does the job: `selectedItem={null}` renders the `label` placeholder, and
 * `resetFilters` puts every dropdown back to it.
 *
 * WHAT THAT COSTS, recorded rather than hidden: there is no per-filter "back to
 * all", because Carbon's Dropdown offers none. The Clear-filters button below the
 * controls clears all five at once.
 */
const ALL = "all";

/**
 * FIXTURE GAPS, named rather than filled with a wrong-but-localised label.
 *
 * `LabelSet` has no word for "view", "edit" or a row-actions column. Earlier
 * revisions substituted the nearest-looking fixture keys, which produced an EDIT
 * button whose accessible name was "Save", a VIEW button called "Loss records", and
 * a row-actions column header reading "Review note" — the name of a real, different
 * fixture field. Localised and wrong is worse than English and right in a record
 * whose product is the accuracy of the record, and it is the same call made for
 * Carbon's untranslated Pagination chrome below.
 *
 * These three strings are therefore English in all four locales, and that is the
 * finding: the fixture set needs `actionView`, `actionEdit` and `colActions`.
 */
const UNTRANSLATED = Object.freeze({
  view: "View",
  edit: "Edit",
  rowActions: "Actions",
});

const PAGE_SIZES = [10, 25, 50];

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

/** Carbon's Tag palette is colour-named, so status maps onto a hue. */
const STATUS_TAG: Readonly<Record<VerificationStatus, "green" | "warm-gray" | "red" | "gray">> = {
  verified: "green",
  pending: "warm-gray",
  disputed: "red",
  withdrawn: "gray",
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

/** flatpickr's locale keys happen to match the fixture codes for all four. */
const FLATPICKR_LOCALE: Readonly<Record<LocaleCode, "en" | "fr" | "de" | "ar">> = {
  en: "en",
  fr: "fr",
  de: "de",
  ar: "ar",
};

const COLUMN_KEYS = [
  "country",
  "hazardType",
  "eventDate",
  "peopleAffected",
  "economicLossUsdMillions",
  "verificationStatus",
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABEL_KEYS: Readonly<Record<ColumnKey, keyof LabelSet>> = {
  country: "colCountry",
  hazardType: "colHazard",
  eventDate: "colEventDate",
  peopleAffected: "colPeopleAffected",
  economicLossUsdMillions: "colEconomicLoss",
  verificationStatus: "colStatus",
};

/** A DataTable row: raw values only, so Carbon's comparator sees real types. */
type TableRowData = { readonly id: string } & Pick<LossRecord, ColumnKey>;

interface FilterOption {
  readonly value: string;
  readonly label: string;
}

function optionsFor(values: readonly string[]): readonly FilterOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

export function AppView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [country, setCountry] = useState(ALL);
  const [hazard, setHazard] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 10);

  const [deleted, setDeleted] = useState<readonly string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LossRecord | null>(null);

  /**
   * The button that opened the modal, for `launcherButtonRef`.
   *
   * Carbon restores focus to whatever this points at on close. A plain ref rather
   * than a callback ref because the modal is a sibling of the table, so the node
   * is still mounted while the dialog is open.
   */
  const launcher = useRef<HTMLButtonElement | null>(null);

  /** flatpickr's alternative parent, inside the token scope. See overlay-scope.ts. */
  const overlay = useOverlayHost();

  const demo: DemoContextValue = useMemo(() => {
    const meta = LOCALES.find((entry) => entry.code === locale);
    return {
      locale,
      labels: labelsFor(locale),
      bcp47: meta?.bcp47 ?? "en-GB",
      dir: meta?.dir ?? "ltr",
    };
  }, [locale]);

  const { labels, bcp47 } = demo;
  const formatters = useMemo(() => formattersFor(bcp47), [bcp47]);

  const filtersActive =
    country !== ALL ||
    hazard !== ALL ||
    status !== ALL ||
    query.trim() !== "" ||
    fromDate !== null;

  const resetFilters = (): void => {
    setCountry(ALL);
    setHazard(ALL);
    setStatus(ALL);
    setQuery("");
    setFromDate(null);
    setPage(1);
  };

  /** The full filtered set, before Carbon sorts it and before we slice a page. */
  const records = useMemo<readonly LossRecord[]>(() => {
    const needle = query.trim().toLocaleLowerCase(bcp47);
    /*
     * `calendarDateToIso`, NOT `toISOString().slice(0, 10)`. flatpickr hands back a
     * LOCAL-midnight Date, so the ISO form reads the UTC day and moves this
     * boundary back one day at every positive UTC offset — silently, and
     * invisibly under the runner's pinned `timezoneId: "UTC"`. See demo-state.ts.
     */
    const fromIso = fromDate ? calendarDateToIso(fromDate) : null;
    return LOSS_RECORDS.filter((record) => {
      if (deleted.includes(record.id)) return false;
      if (country !== ALL && record.country !== country) return false;
      if (hazard !== ALL && record.hazardType !== hazard) return false;
      if (status !== ALL && record.verificationStatus !== status) return false;
      if (needle && !record.dataSource.toLocaleLowerCase(bcp47).includes(needle)) return false;
      // ISO 8601 dates compare correctly as strings, which is why the fixture
      // stores them that way and nothing here parses a date to filter.
      if (fromIso && record.eventDate < fromIso) return false;
      return true;
    });
  }, [country, hazard, status, query, fromDate, deleted, bcp47]);

  const rows = useMemo<readonly TableRowData[]>(
    () =>
      records.map((record) => ({
        id: record.id,
        country: record.country,
        hazardType: record.hazardType,
        eventDate: record.eventDate,
        peopleAffected: record.peopleAffected,
        economicLossUsdMillions: record.economicLossUsdMillions,
        verificationStatus: record.verificationStatus,
      })),
    [records],
  );

  /** Row lookup for the modal, so the dialog can name the record it will remove. */
  const byId = useMemo(() => new Map(LOSS_RECORDS.map((row) => [row.id, row])), []);

  const headers = useMemo(
    () =>
      COLUMN_KEYS.map((key) => ({
        key,
        header: labels[COLUMN_LABEL_KEYS[key]],
        isSortable: true,
      })),
    [labels],
  );

  const countryOptions = useMemo(() => optionsFor(COUNTRIES), []);
  const hazardOptions = useMemo(
    () => OPTIONS_SMALL.map((option) => ({ value: option.value, label: option.label })),
    [],
  );
  const statusOptions = useMemo(() => optionsFor(STATUSES), []);

  function renderCell(key: string, value: unknown): ReactElement | string {
    switch (key) {
      case "eventDate":
        return formatters.date.format(new Date(`${String(value)}T00:00:00Z`));
      case "peopleAffected":
        return formatters.integer.format(Number(value));
      case "economicLossUsdMillions":
        return formatters.decimal.format(Number(value));
      case "verificationStatus": {
        const statusValue = String(value) as VerificationStatus;
        return (
          <Tag type={STATUS_TAG[statusValue]} size="sm">
            {statusValue}
          </Tag>
        );
      }
      default:
        return value === null ? "—" : String(value);
    }
  }

  const selectedIndex = LOCALES.findIndex((entry) => entry.code === locale);

  const pendingDate =
    pendingDelete === null
      ? ""
      : formatters.date.format(new Date(`${pendingDelete.eventDate}T00:00:00Z`));

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
       * is a Mangrove view and this is the Delta host, so listing it would produce a
       * dead link to an `island.html` this app does not ship.
       */
      notices={
        <>
          <ViewSwitcher
            views={viewLinks(["application", "inventory"], "application")}
            pairingName="IBM Carbon on Delta"
            otherHost={{ label: "Carbon on Mangrove", href: "../mangrove-carbon/" }}
          />
          <KnownIssues candidate="carbon" host="delta" candidateName="IBM Carbon" />
        </>
      }
    >
      {candidateEnabled ? (
        /* `.undrr-tokens` declares the UNDRR custom properties; `.demo` maps them
           onto Carbon's `--cds-*` names. Both must be on an ancestor of every
           Carbon component, including the modal, which Carbon renders in place
           rather than portalling. No `dir` here: the frame's root carries it and
           Carbon is authored with logical properties. */
        <div className={`${TOKEN_SCOPE_CLASS} demo demo__app`} data-locale={locale}>
          <DemoContext.Provider value={demo}>
            {/* ------------------------------------------- page header -- */}
            <div className="demo__app-header">
              <div>
                <h2 className="demo__heading">{labels.navRecords}</h2>
                {/*
                  * `role="status"` because this count CHANGES in place as filters
                  * are applied and is the only confirmation that a filter took
                  * effect. A bare <p> updates silently for a screen reader user, who
                  * is left with a table that reflowed for no announced reason.
                  */}
                <p className="demo__prose" role="status">
                  {formatters.integer.format(records.length)} /{" "}
                  {formatters.integer.format(LOSS_RECORDS.length)} —{" "}
                  {labels.longVerificationBanner}
                </p>
              </div>

              <ContentSwitcher
                selectedIndex={selectedIndex === -1 ? 0 : selectedIndex}
                onChange={({ name }) => {
                  if (typeof name === "string") setLocale(name as LocaleCode);
                }}
                aria-label="Locale"
                className="demo__app-locale"
              >
                {LOCALES.map((entry) => (
                  <Switch
                    key={entry.code}
                    name={entry.code}
                    text={entry.label}
                    data-locale={entry.code}
                  />
                ))}
              </ContentSwitcher>
            </div>

            {/* --------------------------------- collapsible filters -- */}
            <Tile className="demo__filter-card">
              <div className="demo__filter-bar">
                {/*
                  * The disclosure is ours. Carbon has no Collapse and no
                  * disclosure primitive; `Accordion` is the only expand/collapse
                  * component and it brings its own bordered heading chrome. So
                  * `aria-expanded`, `aria-controls` and the conditional render
                  * below are application code.
                  */}
                {/*
                  * `aria-controls` ONLY WHILE THE PANEL EXISTS. The disclosure is a
                  * conditional render — Carbon has no Collapse, so there is no
                  * hidden-but-mounted node to point at — and an `aria-controls`
                  * naming an id that is not in the document is an axe
                  * `aria-valid-attr-value` violation as well as a lie to a screen
                  * reader. `aria-expanded` alone carries the collapsed state.
                  */}
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={filtersOpen ? ChevronUp : ChevronDown}
                  aria-expanded={filtersOpen}
                  {...(filtersOpen ? { "aria-controls": "records-filters" } : {})}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  {labels.actionFilter}
                </Button>

                <Button
                  kind="ghost"
                  size="sm"
                  disabled={!filtersActive}
                  onClick={resetFilters}
                >
                  {labels.actionClearFilters}
                </Button>
              </div>

              {filtersOpen ? (
                <form
                  id="records-filters"
                  className="demo__filter-grid"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <Dropdown
                    id="app-country"
                    titleText={labels.fieldCountry}
                    /* Carbon's `label` is the collapsed placeholder, a separate slot
                       from `titleText`, and it is what the empty state reads as. The
                       field's own name is the only fully-localised string the
                       fixture set has for it. See the note on ALL above. */
                    label={labels.fieldCountry}
                    items={[...countryOptions]}
                    itemToString={(item) => item?.label ?? ""}
                    selectedItem={
                      countryOptions.find((option) => option.value === country) ?? null
                    }
                    onChange={({ selectedItem }) => {
                      setCountry(selectedItem?.value ?? ALL);
                      setPage(1);
                    }}
                    size="md"
                  />

                  <Dropdown
                    id="app-hazard"
                    titleText={labels.fieldHazard}
                    label={labels.fieldHazard}
                    items={[...hazardOptions]}
                    itemToString={(item) => item?.label ?? ""}
                    selectedItem={hazardOptions.find((option) => option.value === hazard) ?? null}
                    onChange={({ selectedItem }) => {
                      setHazard(selectedItem?.value ?? ALL);
                      setPage(1);
                    }}
                    size="md"
                  />

                  <Dropdown
                    id="app-status"
                    titleText={labels.colStatus}
                    label={labels.colStatus}
                    items={[...statusOptions]}
                    itemToString={(item) => item?.label ?? ""}
                    selectedItem={statusOptions.find((option) => option.value === status) ?? null}
                    onChange={({ selectedItem }) => {
                      setStatus(selectedItem?.value ?? ALL);
                      setPage(1);
                    }}
                    size="md"
                  />

                  <Search
                    id="app-source"
                    labelText={labels.fieldDataSource}
                    placeholder={labels.fieldDataSource}
                    size="md"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    onClear={() => {
                      setQuery("");
                      setPage(1);
                    }}
                  />

                  {/* flatpickr's container, inside the token scope. */}
                  <div ref={overlay.ref} data-testid="picker-overlay-host" />

                  <DatePicker
                    datePickerType="single"
                    dateFormat="d/m/Y"
                    locale={FLATPICKR_LOCALE[locale]}
                    {...(fromDate ? { value: fromDate } : {})}
                    {...(overlay.element ? { appendTo: overlay.element } : {})}
                    onChange={(dates) => {
                      setFromDate(dates[0] ?? null);
                      setPage(1);
                    }}
                  >
                    <DatePickerInput
                      id="app-from-date"
                      labelText={labels.fieldEventDate}
                      placeholder="dd/mm/yyyy"
                    />
                  </DatePicker>
                </form>
              ) : null}
            </Tile>

            {/* -------------------------------------- records table -- */}
            <DataTable rows={[...rows]} headers={headers} isSortable>
              {({
                rows: tableRows,
                headers: renderHeaders,
                getHeaderProps,
                getRowProps,
                getTableProps,
                getTableContainerProps,
              }) => {
                const total = tableRows.length;
                const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
                const pageRows = tableRows.slice((safePage - 1) * pageSize, safePage * pageSize);

                return (
                  <TableContainer {...getTableContainerProps()}>
                    <div className="demo__table-scroll">
                      <Table {...getTableProps()} size="sm">
                        <TableHead>
                          <TableRow>
                            {renderHeaders.map((header) => {
                              const { key, ...headerProps } = getHeaderProps({ header });
                              return (
                                <TableHeader
                                  key={key}
                                  {...asProps<ComponentProps<typeof TableHeader>>(headerProps)}
                                >
                                  {header.header}
                                </TableHeader>
                              );
                            })}
                            {/*
                              * The row-actions column.
                              *
                              * CORRECTION. This header used to carry
                              * `labels.colReviewNote` — "Review note" — on the
                              * reasoning that a fixture label beats an invented
                              * English word. That was wrong: `reviewNote` is a real
                              * and DIFFERENT fixture field, so the column announced
                              * itself as data it does not contain. One untranslated
                              * English word that is true beats four translations of
                              * something false. See UNTRANSLATED above.
                              *
                              * `isSortable` is passed explicitly because Carbon's own
                              * types require it while its render props declare it
                              * optional.
                              */}
                            <TableHeader isSortable={false} key="row-actions">
                              {UNTRANSLATED.rowActions}
                            </TableHeader>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={COLUMN_KEYS.length + 1}>
                                {labels.stateEmpty}
                              </TableCell>
                            </TableRow>
                          ) : (
                            pageRows.map((row) => {
                              const { key, ...rowProps } = getRowProps({ row });
                              return (
                                <TableRow
                                  key={key}
                                  {...asProps<ComponentProps<typeof TableRow>>(rowProps)}
                                >
                                  {row.cells.map((cell) => (
                                    <TableCell key={cell.id}>
                                      {renderCell(cell.info.header, cell.value)}
                                    </TableCell>
                                  ))}
                                  <TableCell className="demo__row-actions">
                                    {/*
                                      * Icon buttons from `@carbon/react/icons`,
                                      * which is part of the library. Each carries a
                                      * label including the record id, so the
                                      * accessible name is unique per row — without
                                      * that, a screen reader hears "Delete" thirty
                                      * times. Only the DELETE verb is localised:
                                      * `LabelSet` has no "view" or "edit" (see
                                      * UNTRANSLATED), and the earlier substitutions
                                      * named this button "Save" and the one above it
                                      * "Loss records".
                                      *
                                      * `autoAlign` instead of `align="left"`.
                                      * Carbon's `Popover` alignment union is
                                      * PHYSICAL only — `'left' | 'right' | 'top' |
                                      * 'bottom'` and their variants, with no logical
                                      * equivalent and no RTL mapping — so a
                                      * hard-coded `align` pins the tooltip to the
                                      * physical left in Arabic too. THAT PART IS
                                      * CARBON'S: there is no `align="start"` to
                                      * reach for. What was ours is not having used
                                      * `autoAlign` (IconButton/index.d.ts:21), which
                                      * lets Carbon place the tooltip against the
                                      * viewport instead of trusting one fixed side.
                                      * It is flagged Experimental in Carbon's own
                                      * types, which is the remaining cost.
                                      */}
                                    <IconButton
                                      kind="ghost"
                                      size="sm"
                                      autoAlign
                                      label={`${UNTRANSLATED.view} ${row.id}`}
                                    >
                                      <View />
                                    </IconButton>
                                    <IconButton
                                      kind="ghost"
                                      size="sm"
                                      autoAlign
                                      label={`${UNTRANSLATED.edit} ${row.id}`}
                                    >
                                      <Edit />
                                    </IconButton>
                                    {/*
                                      * `kind="ghost"`, NOT `danger--ghost`, and
                                      * that is a Carbon types gap rather than a
                                      * choice. `Button` accepts `danger`,
                                      * `danger--tertiary` and `danger--ghost`;
                                      * `IconButton`'s own `kind` union is
                                      * `'primary' | 'secondary' | 'tertiary' |
                                      * 'ghost'` only, so a destructive icon
                                      * action cannot be styled destructive
                                      * through the documented prop. The runtime
                                      * would accept it — the declaration will
                                      * not. The red lives on the modal's
                                      * `danger` prop instead.
                                      */}
                                    <IconButton
                                      kind="ghost"
                                      size="sm"
                                      autoAlign
                                      label={`${labels.actionDelete} ${row.id}`}
                                      onClick={(event) => {
                                        launcher.current = event.currentTarget;
                                        setPendingDelete(byId.get(row.id) ?? null);
                                      }}
                                    >
                                      <TrashCan />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/*
                      * Carbon's control, our slice.
                      *
                      * CORRECTION, and the earlier note here was wrong about the
                      * library: `Pagination` has NO `translateWithId`. Zero
                      * occurrences in `Pagination.d.ts` — verified against the
                      * installed 1.113.0, not remembered. Its strings come from NINE
                      * discrete props: `itemRangeText`, `itemText`,
                      * `itemsPerPageText`, `forwardText`, `backwardText`,
                      * `pageRangeText`, `pageText`, `pageNumberText` and
                      * `pageSelectLabelText`. Nine call sites to keep in step is a
                      * worse i18n surface than one hook, not a better one, and that
                      * is the finding. (`translateWithId` DOES exist on `DataTable`
                      * and `TableHeader` — see carbon-props.ts.)
                      *
                      * `itemRangeText` is wired because the fixture set supplies the
                      * one word it needs, the noun naming the item type, and because
                      * wiring it routes the numbers through `Intl` — Carbon's default
                      * "1–10 of 250 items" does not.
                      *
                      * `itemsPerPageText` is deliberately NOT passed. It used to
                      * carry `labels.navRecords`, which made the rows-per-page
                      * selector read "Loss records"; it labels a control rather than
                      * naming a thing, so Carbon's untouched "Items per page:" is
                      * more correct than the substitution was.
                      *
                      * The other seven stay in Carbon's English, and THAT IS A REAL
                      * FIXTURE GAP: "Next page", "Previous page", "of 25 pages" and
                      * "Page number" have no counterpart in `LabelSet`, and inventing
                      * translations in four locales is out of bounds.
                      */}
                    <Pagination
                      page={safePage}
                      pageSize={pageSize}
                      pageSizes={PAGE_SIZES}
                      totalItems={total}
                      itemRangeText={(min, max, totalItems) =>
                        `${formatters.integer.format(min)}–${formatters.integer.format(max)} / ` +
                        `${formatters.integer.format(totalItems)} ` +
                        `${labels.navRecords.toLocaleLowerCase(bcp47)}`
                      }
                      onChange={({ page: nextPage, pageSize: nextSize }) => {
                        setPage(nextPage);
                        setPageSize(nextSize);
                      }}
                    />
                  </TableContainer>
                );
              }}
            </DataTable>

            {/* ------------------------------------------ modal flow -- */}
            {/*
              * Carbon renders `Modal` IN PLACE rather than portalling it, so it
              * stays inside `.undrr-tokens` and inside the candidate root. That is
              * why the scoped axe run can see the open dialog at all, and it is the
              * opposite of the MUI run, whose portalled Dialog needed a separate
              * axe pass.
              *
              * `launcherButtonRef` is Carbon's focus-restoration opt-in. Without
              * it, closing the dialog drops focus to the document body, which on a
              * table of thirty row actions means starting the keyboard journey
              * again.
              */}
            <Modal
              open={pendingDelete !== null}
              danger
              modalHeading={labels.actionDelete}
              modalLabel={labels.navRecords}
              primaryButtonText={labels.actionDelete}
              secondaryButtonText={labels.actionCancel}
              launcherButtonRef={launcher}
              onRequestClose={() => setPendingDelete(null)}
              onRequestSubmit={() => {
                if (pendingDelete) {
                  setDeleted((current) => [...current, pendingDelete.id]);
                  setPage(1);
                }
                setPendingDelete(null);
              }}
            >
              <p className="demo__prose">{labels.longRetentionNotice}</p>
              {pendingDelete ? (
                <p className="demo__delete-target">
                  <strong>{pendingDelete.id}</strong> — {pendingDelete.country},{" "}
                  {pendingDelete.hazardType}, {pendingDate}
                </p>
              ) : null}
            </Modal>
          </DemoContext.Provider>
        </div>
      ) : null}
    </AppFrame>
  );
}
