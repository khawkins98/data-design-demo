/**
 * Embedded-island view: Mantine owns ONE region inside a real UNDRR page frame.
 *
 * The kitchen sink hands Mantine the whole content column. This view is the
 * opposite, and the realistic Mangrove case: host prose above, host prose below,
 * and one filterable, paginated data table in between. See `IslandFrame.tsx` for
 * what that arrangement is meant to surface.
 *
 * WHY `SectionDataTable` IS NOT REUSED. It renders `id="section-6"`, a numbered
 * `h3` ("6. Data table, 250 rows"), row selection checkboxes, a rows-per-page
 * control including "All (250)", and eight resizable columns — a component
 * inventory entry, not a screen. Dropped into the middle of Mangrove prose the
 * numbered heading alone would give the game away. What IS reused is
 * `src/table-behaviour.ts` — `compareRecords`, `pageSlice`, `pageCount`,
 * `ariaSortFor` — because that file is the model rather than the markup, and it
 * transplanted without a change. That split is the honest A3 reading: Mantine's
 * table BEHAVIOUR is ours, so it is ours to reuse; the inventory markup was
 * written to be inventory.
 *
 * NO COLUMN RESIZE, DELIBERATELY. `src/use-column-resize.ts` is 112 hand-written
 * lines including its own RTL inversion, and this view does not need it: six
 * columns at island width fit without horizontal scrolling, and a resize handle
 * on a table embedded in someone else's page is affordance the page never asked
 * for. The finding it exists to record — Mantine ships no column sizing of any
 * kind — is already recorded by the kitchen sink, and re-rendering it here would
 * inflate this view's line count without measuring anything new.
 *
 * PORTALLED DROPDOWNS. The three filter `Select`s portal their dropdown to
 * `document.body`, outside both `.demo` and `.undrr-tokens`, so they carry
 * `OVERLAY_CLASS` exactly as the kitchen sink's do. See `overlay-class.ts`, and
 * see the RTL note on `DirectionSync` below for why this frame does not make the
 * portal problem worse on Mangrove than it already was.
 *
 * Fixture data only, and no `new Date()` on a clock: the two date columns parse
 * the fixtures' own ISO strings as UTC so `Intl` output is runner-independent.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  DirectionProvider,
  Group,
  MantineProvider,
  Pagination,
  SegmentedControl,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
  useDirection,
} from "@mantine/core";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { IslandFrame, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { DemoContext, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { OVERLAY_CLASS } from "./overlay-class.js";
import { ariaSortFor, compareRecords, pageCount, pageSlice } from "./table-behaviour.js";
import type { SortState, SortableKey } from "./table-behaviour.js";
import { undrrMantineTheme } from "./theme.js";

/** "All", as a Select value. Mantine's Select cannot hold an empty-string value. */
const ALL = "all";

const PAGE_SIZE = 10;

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

/**
 * Status pill colours. The theme remaps Mantine's own `red`/`green`/`yellow`/
 * `blue` keys onto the token palette, so these are token values reached through
 * Mantine's default colour names — see `theme.ts`.
 */
const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: "green",
  pending: "yellow",
  disputed: "red",
  withdrawn: "gray",
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

interface ColumnSpec {
  readonly key: SortableKey;
  readonly labelKey: keyof LabelSet;
  readonly numeric?: boolean;
}

/**
 * Six columns, not the inventory's eight. `reportedAt` and `reviewNote` are
 * dropped so the table fits the island's content width without a horizontal
 * scroller, which is the realistic editorial choice for a table embedded in a
 * page of prose.
 */
const COLUMNS: readonly ColumnSpec[] = [
  { key: "country", labelKey: "colCountry" },
  { key: "hazardType", labelKey: "colHazard" },
  { key: "eventDate", labelKey: "colEventDate" },
  { key: "peopleAffected", labelKey: "colPeopleAffected", numeric: true },
  { key: "economicLossUsdMillions", labelKey: "colEconomicLoss", numeric: true },
  { key: "verificationStatus", labelKey: "colStatus" },
];

/**
 * Mantine's RTL plumbing, and the one place it needs help. Identical to the
 * kitchen sink's, and the comment there is the long version:
 * `DirectionProvider` holds direction in React context and the ONLY way to change
 * it is `setDirection()`, which writes `dir` to `document.documentElement`.
 *
 * WHAT THAT MEANS FOR THIS FRAME, and it is the answer to "do the frames make
 * Mantine's portal behaviour worse": no, on Mangrove they make it better by
 * accident. `IslandFrame` puts `dir` on its own `.mg-island` wrapper, exactly as
 * `HostShell` does, so on its own the wrapper would not reach a portal at
 * `document.body`. But because Mantine's only direction API writes to `<html>`,
 * the document element ends up `dir="rtl"` too — and portalled dropdowns inherit
 * their direction from it. The delta-mantine run had to stamp `dir` onto each
 * portal container by hand for precisely this reason; here the library's own
 * host-DOM mutation supplies it. That mutation is still a candidate reaching
 * outside its subtree, which is the finding, not the fix.
 */
function DirectionSync({ dir }: { readonly dir: "ltr" | "rtl" }): null {
  const { setDirection } = useDirection();
  useEffect(() => {
    setDirection(dir);
  }, [dir, setDirection]);
  return null;
}

export function IslandView({
  candidateEnabled,
}: {
  readonly candidateEnabled: boolean;
}): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "eventDate", direction: "desc" });
  const [page, setPage] = useState(1);

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
      collator: new Intl.Collator(bcp47),
    }),
    [bcp47],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(bcp47);
    return LOSS_RECORDS.filter((row: LossRecord) => {
      if (country !== ALL && row.country !== country) return false;
      if (hazard !== ALL && row.hazardType !== hazard) return false;
      if (status !== ALL && row.verificationStatus !== status) return false;
      if (needle && !row.dataSource.toLocaleLowerCase(bcp47).includes(needle)) return false;
      return true;
    });
  }, [country, hazard, status, query, bcp47]);

  /** `compareRecords` is the kitchen sink's comparator, reused unchanged. */
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRecords(a, b, sort, formatters.collator)),
    [filtered, sort, formatters],
  );

  const totalPages = pageCount(sorted.length, PAGE_SIZE);
  const safePage = Math.min(page, totalPages);
  const visible = pageSlice(sorted, safePage, PAGE_SIZE);

  const filtersActive =
    country !== ALL || hazard !== ALL || status !== ALL || query.trim() !== "";

  /** Every filter change returns to page one, or the reader is stranded. */
  const onFilterChange = (apply: () => void): void => {
    apply();
    setPage(1);
  };

  const toggleSort = (key: SortableKey): void => {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
    setPage(1);
  };

  let candidate: ReactNode = null;
  if (candidateEnabled) {
    candidate = (
      <DirectionProvider>
        <DirectionSync dir={demo.dir} />
        {/* `forceColorScheme="light"`: the token set has no dark palette and the
            host is light-only. Without it Mantine reads localStorage and could
            render a dark island inside a light page between runs. */}
        <MantineProvider theme={undrrMantineTheme} forceColorScheme="light">
          <DemoContext.Provider value={demo}>
            <div className={`${TOKEN_SCOPE_CLASS} demo`} data-locale={locale}>
              <Group justify="space-between" align="flex-end" wrap="wrap" mb="md">
                <div>
                  <Title order={2} mb="xs">
                    {labels.navRecords}
                  </Title>
                  <Text className="demo__lede" size="sm">
                    {labels.longMethodologyNotice}
                  </Text>
                </div>

                {/* Locale switcher, native SegmentedControl, same as the sink. */}
                <SegmentedControl
                  aria-label="Locale"
                  value={locale}
                  onChange={(next) => setLocale(next as LocaleCode)}
                  data={LOCALES.map((entry) => ({ value: entry.code, label: entry.label }))}
                  maw="100%"
                />
              </Group>

              {/*
                * Filter controls ABOVE the table, which is where a real UNDRR page
                * puts them. Four controls rather than a filter menu on the table,
                * because a menu is a component feature and this is a layout
                * question — and because Mantine's Table has no filter UI at all.
                */}
              <Box
                component="form"
                className="demo-grid"
                mb="md"
                onSubmit={(event) => event.preventDefault()}
              >
                {/*
                  * THE UNFILTERED STATE IS AN EMPTY FIELD, NOT A SENTINEL OPTION.
                  * Same fix, and the same reasoning, as
                  * `apps/delta-mantine/src/AppView.tsx`: these three Selects used to
                  * carry a first option labelled `labels.actionClearFilters`, so a
                  * collapsed dropdown's visible text AND its accessible name both
                  * read "Clear filters" next to the real Clear-filters button.
                  * `clearable` is the library's own answer. NO PLACEHOLDER: the
                  * fixture set has no "All" string in any of the four locales, so the
                  * unfiltered state is Mantine's default empty input under the
                  * field's visible label. The gap is a missing `optionAll` key in
                  * `@undrr-eval/fixtures`, recorded rather than substituted.
                  */}
                <Select
                  label={labels.fieldCountry}
                  value={country === ALL ? null : country}
                  onChange={(next) => onFilterChange(() => setCountry(next ?? ALL))}
                  data={COUNTRIES.map((name) => ({ value: name, label: name }))}
                  clearable
                  allowDeselect={false}
                  comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
                  data-testid="island-filter-country"
                />
                <Select
                  label={labels.fieldHazard}
                  value={hazard === ALL ? null : hazard}
                  onChange={(next) => onFilterChange(() => setHazard(next ?? ALL))}
                  data={OPTIONS_SMALL.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  clearable
                  allowDeselect={false}
                  comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
                  data-testid="island-filter-hazard"
                />
                <Select
                  label={labels.colStatus}
                  value={status === ALL ? null : status}
                  onChange={(next) => onFilterChange(() => setStatus(next ?? ALL))}
                  data={STATUSES.map((value) => ({ value, label: value }))}
                  clearable
                  allowDeselect={false}
                  comboboxProps={{ classNames: { dropdown: OVERLAY_CLASS } }}
                  data-testid="island-filter-status"
                />
                <TextInput
                  label={labels.fieldDataSource}
                  value={query}
                  onChange={(event) =>
                    onFilterChange(() => setQuery(event.currentTarget.value))
                  }
                  data-testid="island-filter-query"
                />
              </Box>

              <Group justify="space-between" align="center" wrap="wrap" mb="xs">
                <Text size="sm" data-testid="island-count">
                  {formatters.integer.format(sorted.length)} /{" "}
                  {formatters.integer.format(LOSS_RECORDS.length)}
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  disabled={!filtersActive}
                  onClick={() =>
                    onFilterChange(() => {
                      setCountry(ALL);
                      setHazard(ALL);
                      setStatus(ALL);
                      setQuery("");
                    })
                  }
                >
                  {labels.actionClearFilters}
                </Button>
              </Group>

              {/*
                * `Table.ScrollContainer` is what keeps a six-column table from
                * scrolling the HOST document at 390px. In an island that is not a
                * nicety: the page around the candidate cannot reflow, so an
                * overflowing table breaks Mangrove's layout and not just ours.
                */}
              <Table.ScrollContainer minWidth={640} type="native">
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  tabularNums
                  aria-label={labels.navRecords}
                >
                  <Table.Thead>
                    <Table.Tr>
                      {COLUMNS.map((column) => (
                        <Table.Th
                          key={column.key}
                          aria-sort={ariaSortFor(column.key, sort)}
                          ta={column.numeric ? "end" : undefined}
                        >
                          {/*
                            * The sort affordance, `aria-sort` above it and the
                            * arrow glyph are all ours: `Table.Th` has no sorting
                            * of any kind. ONE shape across all four Mantine
                            * tables — this view, `sections/SectionDataTable.tsx`
                            * and the two delta-mantine equivalents — so the
                            * `.demo-sort` rules in demo.css reach every one of
                            * them. The glyph is `aria-hidden` because `aria-sort`
                            * on the `<th>` is what announces the state.
                            */}
                          <UnstyledButton
                            className="demo-sort"
                            data-numeric={column.numeric ? "true" : undefined}
                            onClick={() => toggleSort(column.key)}
                            aria-label={`Sort by ${labels[column.labelKey]}`}
                            data-testid={`island-sort-${column.key}`}
                          >
                            <Text span size="sm" fw="semibold" className="demo-sort__label">
                              {labels[column.labelKey]}
                            </Text>
                            <span aria-hidden="true" className="demo-sort__indicator">
                              {sort.key === column.key
                                ? sort.direction === "asc"
                                  ? "▲"
                                  : "▼"
                                : "↕"}
                            </span>
                          </UnstyledButton>
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {visible.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={COLUMNS.length}>
                          <Text c="dimmed" py="md">
                            {labels.stateEmpty}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      visible.map((record) => (
                        <Table.Tr key={record.id}>
                          <Table.Td>{record.country}</Table.Td>
                          <Table.Td>{record.hazardType}</Table.Td>
                          <Table.Td>
                            {formatters.date.format(new Date(`${record.eventDate}T00:00:00Z`))}
                          </Table.Td>
                          <Table.Td style={{ textAlign: "end" }}>
                            {formatters.integer.format(record.peopleAffected)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: "end" }}>
                            {formatters.decimal.format(record.economicLossUsdMillions)}
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={STATUS_COLOUR[record.verificationStatus]}
                              variant="light"
                              radius="sm"
                            >
                              {record.verificationStatus}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {/*
                * `Pagination` is native and complete — React Aria has no
                * equivalent at all. Its four EDGE controls ship with no
                * accessible name, so `getControlProps` supplies them; that is a
                * documented API, and the defect is that it is required.
                */}
              <Group justify="space-between" align="center" wrap="wrap" mt="md">
                {/*
                  * "Page" IS ENGLISH IN ALL FOUR LOCALES, deliberately. The fixture
                  * label set carries no pagination strings and inventing translations
                  * is out of bounds, so this line reads "٣ / 1 Page" in Arabic — an
                  * English word in a right-to-left line.
                  *
                  * AND MANTINE OFFERS NOTHING TO FALL BACK ON. `Pagination` renders
                  * no text of its own — icons and page numbers only — so
                  * `@mantine/core` ships no pagination translations and there is no
                  * locale bundle to point at. Any wording around it is application
                  * text by construction. Recorded as what Mantine ships.
                  */}
                <Text size="sm" c="dimmed" data-testid="island-page-summary">
                  Page {formatters.integer.format(safePage)} /{" "}
                  {formatters.integer.format(totalPages)}
                </Text>
                <Pagination
                  value={safePage}
                  onChange={setPage}
                  total={totalPages}
                  withEdges
                  getItemProps={(pageNumber) => ({ "aria-label": `Page ${pageNumber}` })}
                  getControlProps={(control) => ({
                    "aria-label": {
                      first: "First page",
                      previous: "Previous page",
                      next: "Next page",
                      last: "Last page",
                    }[control],
                  })}
                />
              </Group>
            </div>
          </DemoContext.Provider>
        </MantineProvider>
      </DirectionProvider>
    );
  }

  return (
    <IslandFrame
      title="Demo: Mangrove + Mantine"
      dir={demo.dir}
      /*
       * The frame's `pageHeader` and `notices` slots render both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they sit in the leakage baseline as well as the
       * candidate render and cannot themselves register as a difference.
       *
       * `"application"` is deliberately absent from `available`: the whole-DELTA-
       * screen view is a Delta view and this is the Mangrove host. Listing it would
       * produce a dead link to an `app.html` this app does not ship.
       */
      pageHeader={
        <ViewSwitcher
          views={viewLinks(["island", "inventory"], "island")}
          pairingName="Mantine on Mangrove"
          otherHost={{ label: "Mantine on Delta", href: "../delta-mantine/" }}
        />
      }
      notices={<KnownIssues candidate="mantine" host="mangrove" candidateName="Mantine" />}
    >
      {candidate}
    </IslandFrame>
  );
}
