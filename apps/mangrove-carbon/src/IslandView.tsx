/**
 * Embedded-island view: Carbon owns ONE region inside a real UNDRR page frame.
 *
 * The kitchen sink hands Carbon the whole content column. This view is the
 * opposite and the realistic Mangrove case: the published page header, masthead
 * and `mg-mega-topbar` navigation above, host prose immediately above and below,
 * and a single filterable, sortable, paginated table in between. See
 * `IslandFrame.tsx` for what that arrangement is meant to surface.
 *
 * WHY `sections/SectionDataTable` IS NOT REUSED. It renders `id="section-6"`, a
 * numbered `h3` ("6. Data table, 250 rows"), a drag-and-drop column reorder hint
 * and a select-all/batch-action toolbar — a component-inventory entry, not a
 * screen. Dropping it between two paragraphs of host prose would put a numbered
 * heading in the middle of a real page. What IS shared is the part that carries
 * the finding: `demo-state.ts` (labels, status→Tag colour), `carbon-props.ts` (the
 * render-prop cast Carbon's own types make necessary) and every `--cds-*` mapping
 * in `theme.css`. That split is honest A3 evidence — the theming and the row
 * shape extracted cleanly, the inventory sections did not, because they were
 * written to be inventory.
 *
 * WHAT CARBON OWNS HERE AND WHAT IS OURS. Sorting is Carbon's, including the
 * comparator, which is why rows carry RAW fixture values and are formatted at
 * render time (pre-formatted strings would sort "1.234.567" before "999").
 * Pagination is Carbon's control and our slice — `Pagination` reports
 * `{ page, pageSize }` and nothing connects it to the table. The four filter
 * controls above the table are ours: `TableToolbarSearch` filters across every
 * cell, which is not what a real UNDRR page puts above a table, and Carbon has no
 * per-column filter model at any tier.
 *
 * NO DATE FILTER, deliberately, and the reason is a finding rather than a
 * preference. Carbon's `DatePicker` wraps flatpickr, a third-party non-React
 * widget that does NOT mirror in RTL: `.flatpickr-calendar` is authored with
 * physical `left`/`right` and its own `direction` handling, so in Arabic the
 * calendar stays LTR inside an otherwise mirrored page. The delta-carbon
 * application view does carry a date filter and measures exactly that, so the
 * defect is recorded once, in the view where a date filter belongs, rather than
 * twice. See `apps/delta-carbon/src/AppView.tsx`.
 *
 * Fixture data only, and no `new Date()` except to reformat fixture ISO strings
 * with `Intl` at a fixed time zone.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  ContentSwitcher,
  DataTable,
  Dropdown,
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
} from "@carbon/react";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord } from "@undrr-eval/fixtures";
import { IslandFrame, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { asProps } from "./carbon-props.js";
import { candidateEnabled, carbonCssMode } from "./css-mode.js";
import { DemoContext, STATUS_TAG_COLOUR, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";

const CANDIDATE_ON = candidateEnabled();
const CSS_MODE = carbonCssMode();

const PAGE_SIZES = [10, 25, 50];

/**
 * Sentinel for "no filter", in OUR state only. It is deliberately NOT an option
 * in any Dropdown.
 *
 * Carbon's Dropdown has no empty-option concept and no `clearSelection` (its
 * ComboBox does, via the clear button; Dropdown does not). Earlier revisions
 * papered over that by prepending a sentinel option whose label was
 * `labels.actionClearFilters`, so a collapsed dropdown read "Clear filters" —
 * both as its visible text and as its accessible name — immediately beside a real
 * Clear-filters button saying the same thing. The fixture set carries no
 * "All"/"Any" string and inventing one in four locales is out of bounds, so the
 * sentinel is gone and Carbon's own empty state does the job instead:
 * `selectedItem={null}` renders the `label` placeholder.
 *
 * WHAT THAT COSTS, recorded rather than hidden: there is no per-filter "back to
 * all" affordance, because Carbon's Dropdown does not offer one. So the label goes
 * where it was always meant to go — on a real Clear-filters `Button` below the
 * controls, which `resetFilters` wires to every filter at once.
 */
const ALL = "all";

const STATUSES: readonly LossRecord["verificationStatus"][] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

/** Columns, narrower than the kitchen sink's ten: this is an island, not an audit. */
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

/** An option as Carbon's Dropdown wants it: an object plus an `itemToString`. */
interface FilterOption {
  readonly value: string;
  readonly label: string;
}

function optionsFor(values: readonly string[]): readonly FilterOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

export function IslandView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [country, setCountry] = useState(ALL);
  const [hazard, setHazard] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 10);

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

  const formatters = useMemo(
    () => ({
      integer: new Intl.NumberFormat(bcp47),
      decimal: new Intl.NumberFormat(bcp47, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      date: new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
    }),
    [bcp47],
  );

  /** Filtering is ours; see the header note on why the toolbar search is not it. */
  const rows = useMemo<readonly TableRowData[]>(() => {
    const needle = query.trim().toLocaleLowerCase(bcp47);
    return LOSS_RECORDS.filter((record) => {
      if (country !== ALL && record.country !== country) return false;
      if (hazard !== ALL && record.hazardType !== hazard) return false;
      if (status !== ALL && record.verificationStatus !== status) return false;
      if (needle && !record.dataSource.toLocaleLowerCase(bcp47).includes(needle)) return false;
      return true;
    }).map((record) => ({
      id: record.id,
      country: record.country,
      hazardType: record.hazardType,
      eventDate: record.eventDate,
      peopleAffected: record.peopleAffected,
      economicLossUsdMillions: record.economicLossUsdMillions,
      verificationStatus: record.verificationStatus,
    }));
  }, [country, hazard, status, query, bcp47]);

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

  const filtersActive = country !== ALL || hazard !== ALL || status !== ALL || query.trim() !== "";

  const resetFilters = (): void => {
    setCountry(ALL);
    setHazard(ALL);
    setStatus(ALL);
    setQuery("");
    setPage(1);
  };

  /** Formats one cell. Sorting never sees these strings. */
  function renderCell(key: string, value: unknown): ReactElement | string {
    switch (key) {
      case "eventDate":
        return formatters.date.format(new Date(`${String(value)}T00:00:00Z`));
      case "peopleAffected":
        return formatters.integer.format(Number(value));
      case "economicLossUsdMillions":
        return formatters.decimal.format(Number(value));
      case "verificationStatus": {
        const statusValue = String(value) as LossRecord["verificationStatus"];
        return (
          <Tag type={STATUS_TAG_COLOUR[statusValue]} size="sm">
            {statusValue}
          </Tag>
        );
      }
      default:
        return value === null ? "—" : String(value);
    }
  }

  const selectedIndex = LOCALES.findIndex((entry) => entry.code === locale);

  return (
    <IslandFrame
      title={labels.appTitle}
      dir={demo.dir}
      /*
       * The frame's `notices` slot renders both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they are present in the leakage baseline as well as the
       * candidate render and therefore cannot themselves register as a difference.
       *
       * `"application"` is deliberately absent from `available`: the whole-DELTA-
       * screen view is a Delta view and this is the Mangrove host, so listing it
       * would produce a dead link to an `app.html` this app does not ship.
       */
      notices={
        <>
          <ViewSwitcher
            views={viewLinks(["island", "inventory"], "island")}
            pairingName="IBM Carbon on Mangrove"
            otherHost={{ label: "Carbon on Delta", href: "../delta-carbon/" }}
          />
          <KnownIssues candidate="carbon" host="mangrove" candidateName="IBM Carbon" />
        </>
      }
    >
      {CANDIDATE_ON ? (
        <DemoContext.Provider value={demo}>
          {/*
            * Four classes, all load-bearing. Three are the same three the kitchen
            * sink carries: `demo` is the scope every rule in theme.css hangs off,
            * `undrr-tokens` declares the `--undrr-*` values, and
            * `cds--layer-one` restores the layer tokens that the scoped-CSS build
            * turns into a `.demo :root` selector that never matches. See App.tsx.
            * The fourth, `island`, is this view's own layout hook.
            *
            * `cds--layer-one` was MISSING here for several commits while this comment
            * already claimed it was present. Under `?carbonCss=scoped` — the one mode
            * this view exists to measure — Carbon's `:root` layer block becomes
            * `.demo :root` and matches nothing, so the class is the only source for
            * the 15 tokens it declares. theme.css restates 10 of them; these five it
            * does not, and they were therefore UNDEFINED in the island:
            *
            *   --cds-layer-active           --cds-layer-accent-hover
            *   --cds-layer-background       --cds-layer-accent-active
            *   --cds-border-subtle-selected
            *
            * Carbon references all five without a literal fallback, so they were
            * invalid at computed-value time rather than merely off-brand: the
            * declarations dropped out entirely. All five drive pressed/active/selected
            * states and `.cds--layer__with-background`, which is why nothing was
            * visible in the static screenshots — and why it would only have surfaced
            * under a keyboard or mouse in front of a reviewer. See
            * src/carbon-scoped.scss, cost 2.
            *
            * NO `dir` HERE. The frame's root carries it and Carbon is authored with
            * logical properties, so inheritance is the whole RTL story for Carbon's
            * own CSS. Setting it twice would make `[dir="rtl"]` ambiguous in the
            * e2e run for no behavioural gain.
            */}
          <div
            className={`${TOKEN_SCOPE_CLASS} demo island cds--layer-one`}
            data-locale={locale}
            data-carbon-css={CSS_MODE}
          >
            <div className="island__toolbar">
              <ContentSwitcher
                selectedIndex={selectedIndex === -1 ? 0 : selectedIndex}
                onChange={({ name }) => {
                  if (typeof name === "string") setLocale(name as LocaleCode);
                }}
                aria-label="Locale"
                className="island__locale"
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

            {/*
              * Filter controls ABOVE the table, which is where a real UNDRR page
              * puts them. `onSubmit` is neutralised because there is no server:
              * every control filters as it changes.
              */}
            <form
              className="island__filters"
              id="island-filters"
              onSubmit={(event) => event.preventDefault()}
            >
              <Dropdown
                id="island-country"
                titleText={labels.fieldCountry}
                /* Carbon's `label` is the collapsed placeholder, a separate slot
                   from `titleText`, and it is what the empty state reads as. The
                   field's own name is the only fully-localised string the fixture
                   set has for it. */
                label={labels.fieldCountry}
                items={[...countryOptions]}
                itemToString={(item) => item?.label ?? ""}
                selectedItem={countryOptions.find((option) => option.value === country) ?? null}
                onChange={({ selectedItem }) => {
                  setCountry(selectedItem?.value ?? ALL);
                  setPage(1);
                }}
                size="md"
              />

              <Dropdown
                id="island-hazard"
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
                id="island-status"
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

              {/*
                * `Search` rather than `TextInput`: this is a text query over one
                * column, and Carbon's Search carries its own clear button. It
                * renders `input[type="search"]`, which is one of the elements
                * Mangrove restyles at element level — the (0,2,0) re-assertion in
                * theme.css is what keeps it looking like a Carbon field here, and
                * that rule was written for the kitchen sink and needed no change.
                */}
              <Search
                id="island-source"
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

              {/*
                * Where `labels.actionClearFilters` belongs: on a button that
                * performs the action, not on a sentinel option inside a Dropdown.
                * See the note on `ALL` above.
                */}
              <Button
                kind="ghost"
                size="md"
                type="button"
                disabled={!filtersActive}
                onClick={resetFilters}
              >
                {labels.actionClearFilters}
              </Button>
            </form>

            {/*
              * `role="status"` because this number CHANGES in place as filters are
              * applied and is the only confirmation that a filter took effect. A
              * bare <p> updates silently for a screen reader user, who is left with
              * a table that reflowed for no announced reason. Same pattern as
              * `#range-summary` in sections/SectionDates.tsx.
              */}
            <p className="demo-hint island__count" id="island-count" role="status">
              {formatters.integer.format(rows.length)} /{" "}
              {formatters.integer.format(LOSS_RECORDS.length)} — {labels.navRecords}
            </p>

            <DataTable rows={[...rows]} headers={headers} isSortable>
              {({
                rows: tableRows,
                headers: renderHeaders,
                getHeaderProps,
                getRowProps,
                getTableProps,
                getTableContainerProps,
              }) => {
                // Carbon has already sorted `tableRows`; the page slice composes
                // on top, so sorting is over the whole filtered set rather than
                // over the visible page.
                const total = tableRows.length;
                const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
                const pageRows = tableRows.slice(
                  (safePage - 1) * pageSize,
                  safePage * pageSize,
                );

                return (
                  <TableContainer
                    className="demo-tablewrap"
                    {...getTableContainerProps()}
                  >
                    <Table {...getTableProps()} size="sm">
                      <TableHead>
                        <TableRow>
                          {renderHeaders.map((header) => {
                            const { key, ...headerProps } = getHeaderProps({ header });
                            return (
                              <TableHeader
                                key={key}
                                {...asProps<typeof TableHeader>(headerProps)}
                              >
                                {header.header}
                              </TableHeader>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={COLUMN_KEYS.length}>
                              {labels.stateEmpty}
                            </TableCell>
                          </TableRow>
                        ) : (
                          pageRows.map((row) => {
                            const { key, ...rowProps } = getRowProps({ row });
                            return (
                              <TableRow
                                key={key}
                                {...asProps<typeof TableRow>(rowProps)}
                              >
                                {row.cells.map((cell) => (
                                  <TableCell key={cell.id}>
                                    {renderCell(cell.info.header, cell.value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>

                    {/*
                      * Carbon's control, our slice.
                      *
                      * CORRECTION, and the earlier note here was wrong about the
                      * library: `Pagination` has NO `translateWithId`. Zero
                      * occurrences in `Pagination.d.ts` — verified against the
                      * installed 1.113.0, not remembered. Its strings come from
                      * NINE discrete function/string props: `itemRangeText`,
                      * `itemText`, `itemsPerPageText`, `forwardText`,
                      * `backwardText`, `pageRangeText`, `pageText`,
                      * `pageNumberText` and `pageSelectLabelText`. That is a
                      * genuinely worse i18n surface than one hook, not a better
                      * one, and it is the finding.
                      *
                      * `itemRangeText` is wired because the fixture set does supply
                      * the one word it needs — the noun naming the item type — and
                      * wiring it also routes the numbers through `Intl`, which
                      * Carbon's default ("1–10 of 250 items") does not do.
                      *
                      * `itemsPerPageText` is deliberately NOT passed. It used to
                      * carry `labels.navRecords`, which made the rows-per-page
                      * selector read "Loss records"; it is a control label, not a
                      * noun, so Carbon's untouched "Items per page:" is more
                      * correct than the substitution was.
                      *
                      * The remaining seven stay in Carbon's English. THAT IS A REAL
                      * FIXTURE GAP: "Next page", "Previous page", "of 25 pages",
                      * "Page number" have no counterpart in LabelSet and inventing
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
          </div>
        </DemoContext.Provider>
      ) : null}
    </IslandFrame>
  );
}
