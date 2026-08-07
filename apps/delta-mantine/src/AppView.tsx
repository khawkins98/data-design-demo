/**
 * Full-application view: Mantine carries a whole DELTA records screen.
 *
 * Modelled on DELTA's real `DisasterEventsPage`: page header with summary text, a
 * COLLAPSIBLE filter card, a table with status pills and row-action icon buttons,
 * pagination, and one modal flow (delete confirmation). See `AppFrame.tsx` for why
 * leakage reads differently from a view the candidate owns outright.
 *
 * WHAT MANTINE GIVES AND WHAT IT DOES NOT, in this layout specifically:
 *
 *   - `Collapse` is a real component and takes `expanded` + `keepMounted={false}`,
 *     so the filter panel leaves the DOM when closed. The `aria-expanded` /
 *     `aria-controls` pairing on the trigger is ours; `Collapse` has no trigger.
 *   - `Pagination` is complete and accessible, except that its four EDGE controls
 *     ship with no accessible name at all, so `getControlProps` has to supply
 *     them. That is a documented API; the defect is that it is required.
 *   - `Table` is presentational only. Sorting is `src/table-model.ts`, reused from
 *     the kitchen sink unchanged, which is the honest A3 reading: the model is ours
 *     either way, so it transplants; the inventory markup does not.
 *   - `ActionIcon` + `Tooltip` cover the row actions, but there is NO ICON PACKAGE
 *     here. `@tabler/icons-react` is Mantine's documented icon source and is not a
 *     dependency of this app, so the three row actions use inline Material path
 *     data, exactly as the delta-mui run did with `SvgIcon`.
 *
 * NO COLUMN RESIZE. `useColumnResize` in `src/table-model.ts` exists and works, and
 * this view deliberately does not call it: a records screen's row actions and
 * delete flow are what the brief asks this view to cover, and the "Mantine ships no
 * column sizing" finding is already measured by the kitchen sink. Re-rendering it
 * here would add lines without adding evidence.
 *
 * Fixture data only. Deletion is local component state over `LOSS_RECORDS`; no
 * fixture is mutated, and no value comes from a clock.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  DirectionProvider,
  Group,
  MantineProvider,
  Modal,
  Pagination,
  SegmentedControl,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LabelSet, LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { AppFrame, ViewSwitcher } from "@undrr-eval/host-delta";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { DemoContext, labelsFor, useDemo } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { useComboboxPortalProps, usePortalProps } from "./overlay-class.js";
import { sortRecords } from "./table-model.js";
import type { SortState, SortableKey } from "./table-model.js";
import { undrrCssVariablesResolver, undrrMantineTheme } from "./theme.js";

/** "All", as a Select value: Mantine's Select cannot hold an empty-string value. */
const ALL = "all";

const PAGE_SIZE = 10;

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

/** The theme's own token-mapped colour keys. See `theme.ts`. */
const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: "undrrSuccess",
  pending: "undrrWarning",
  disputed: "undrrError",
  withdrawn: "undrrNeutral",
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

/**
 * Material path data, inlined because Mantine ships no icons and
 * `@tabler/icons-react` is not a dependency of this app. Same decision, and the
 * same three actions, as `apps/delta-mui/src/AppView.tsx`.
 */
const PATHS = {
  view: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  remove: "M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  chevron: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
} as const;

/** 20px inline icon. `currentColor` so `ActionIcon`'s variant colours reach it. */
function Icon({ path, spin }: { readonly path: string; readonly spin?: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={spin === undefined ? undefined : {
        transition: "transform 120ms",
        transform: spin ? "rotate(180deg)" : "none",
      }}
    >
      <path d={path} />
    </svg>
  );
}

interface ColumnSpec {
  readonly key: SortableKey;
  readonly labelKey: keyof LabelSet;
  readonly numeric?: boolean;
}

const COLUMNS: readonly ColumnSpec[] = [
  { key: "country", labelKey: "colCountry" },
  { key: "hazardType", labelKey: "colHazard" },
  { key: "eventDate", labelKey: "colEventDate" },
  { key: "peopleAffected", labelKey: "colPeopleAffected", numeric: true },
  { key: "economicLossUsdMillions", labelKey: "colEconomicLoss", numeric: true },
  { key: "verificationStatus", labelKey: "colStatus" },
];

/** ARIA sort for a header, which `Table.Th` does not compute. */
function ariaSort(sort: SortState | null, key: SortableKey): "ascending" | "descending" | "none" {
  if (sort?.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

/* ------------------------------------------------------------------------- *
 * The screen itself. Split from `AppView` because the portal hooks and every
 * label read `useDemo()`, and the provider is rendered by `AppView`.
 * ------------------------------------------------------------------------- */

function RecordsScreen({
  locale,
  onLocaleChange,
}: {
  readonly locale: LocaleCode;
  readonly onLocaleChange: (next: LocaleCode) => void;
}): ReactElement {
  const { labels, bcp47 } = useDemo();
  const portalProps = usePortalProps();
  const comboboxProps = useComboboxPortalProps();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const [sort, setSort] = useState<SortState | null>({ key: "eventDate", direction: "desc" });
  const [page, setPage] = useState(1);

  const [deleted, setDeleted] = useState<readonly string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LossRecord | null>(null);

  const formatters = useMemo(
    () => ({
      integer: new Intl.NumberFormat(bcp47),
      decimal: new Intl.NumberFormat(bcp47, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      date: new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
      /*
       * The comparator's collator, built from the SELECTED locale. Without it
       * `localeCompare` falls back to the runtime default and the German and
       * French passes order accented country names by whatever locale the runner
       * happens to have. See `sortRecords` in src/table-model.ts.
       */
      collator: new Intl.Collator(bcp47),
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

  /**
   * `sortRecords` is the kitchen sink's comparator, reused unchanged — including
   * its required `Intl.Collator` argument, so this view's ordering is locale-
   * correct rather than runner-dependent, and its descending sort is the exact
   * inverse of its ascending one.
   */
  const sorted = useMemo(
    () => sortRecords(filtered, sort, formatters.collator),
    [filtered, sort, formatters],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filtersActive =
    country !== ALL || hazard !== ALL || status !== ALL || query.trim() !== "";

  const onFilterChange = (apply: () => void): void => {
    apply();
    setPage(1);
  };

  const toggleSort = (key: SortableKey): void => {
    setSort((previous) =>
      previous?.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
    setPage(1);
  };

  return (
    <>
      {/* ------------------------------------------------------ page header -- */}
      <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg">
        <Box>
          <Title order={2} mb="xs">
            {labels.navRecords}
          </Title>
          <Text c="dimmed" maw="68ch" data-testid="app-summary">
            {formatters.integer.format(sorted.length)} /{" "}
            {formatters.integer.format(LOSS_RECORDS.length)} —{" "}
            {labels.longVerificationBanner}
          </Text>
        </Box>

        {/* Locale switcher, native SegmentedControl, same as the kitchen sink. */}
        <SegmentedControl
          aria-label="Locale"
          value={locale}
          onChange={(next) => onLocaleChange(next as LocaleCode)}
          data={LOCALES.map((entry) => ({ value: entry.code, label: entry.label }))}
          maw="100%"
        />
      </Group>

      {/* ------------------------------------------------- collapsible filters -- */}
      <Card withBorder padding="0" mb="lg">
        <Group justify="space-between" align="center" px="md" py="sm">
          {/*
            * `aria-controls` IS PRESENT ONLY WHILE THE PANEL IS MOUNTED. With
            * `keepMounted={false}` below, the collapsed panel leaves the DOM, and an
            * `aria-controls` IDREF that resolves to nothing is not a documented
            * trade-off — it is a dangling reference. `aria-expanded` carries the
            * state in both cases, which is the attribute assistive technology acts
            * on; `aria-controls` is the optional one, so it is the one that goes
            * when its target does. Asserted both ways in
            * `e2e/app.spec.ts` ("collapses and expands the filter card").
            */}
          <Button
            variant="subtle"
            onClick={() => setFiltersOpen((previous) => !previous)}
            aria-expanded={filtersOpen}
            aria-controls={filtersOpen ? "records-filters" : undefined}
            rightSection={<Icon path={PATHS.chevron} spin={filtersOpen} />}
          >
            {labels.actionFilter}
          </Button>
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
          * `keepMounted={false}` so the panel LEAVES the DOM when collapsed,
          * which is why `aria-controls` above is conditional rather than constant.
          * Mantine's default keeps it mounted behind React's
          * `<Activity>`, which preserves field state but leaves the fields in the
          * accessibility tree — the wrong trade for a filter panel whose whole
          * state is already lifted into this component.
          */}
        <Collapse expanded={filtersOpen} keepMounted={false}>
          {/*
            * `SimpleGrid` rather than a hand-written CSS grid: `cols` takes a
            * responsive object, which is the one piece of layout this view would
            * otherwise have had to add CSS for.
            */}
          <SimpleGrid
            component="form"
            id="records-filters"
            cols={{ base: 1, sm: 2, lg: 4 }}
            spacing="md"
            px="md"
            pb="md"
            onSubmit={(event) => event.preventDefault()}
          >
            {/*
              * THE UNFILTERED STATE IS AN EMPTY FIELD, NOT A SENTINEL OPTION.
              *
              * These three Selects used to carry a first option whose label was
              * `labels.actionClearFilters` — so a collapsed dropdown read "Clear
              * filters", its accessible name was "Clear filters", and the real
              * Clear-filters button sat a few pixels away saying the same thing.
              * `Select` has `clearable`, which is the library's own answer: the
              * clear affordance belongs on the field, not in the option list.
              *
              * NO PLACEHOLDER, deliberately. The fixture label set has no "All"
              * string in any of the four locales and inventing four translations is
              * out of bounds, so the unfiltered state is Mantine's own default —
              * an empty input under a visible `Country` / `Hazard type` /
              * `Verification status` label. THE FIXTURE GAP IS: no `optionAll` (or
              * equivalent) key in `@undrr-eval/fixtures`. Recorded rather than
              * papered over with a label that means something else.
              */}
            <Select
              label={labels.fieldCountry}
              value={country === ALL ? null : country}
              onChange={(next) => onFilterChange(() => setCountry(next ?? ALL))}
              data={COUNTRIES.map((name) => ({ value: name, label: name }))}
              clearable
              allowDeselect={false}
              comboboxProps={comboboxProps}
              data-testid="app-filter-country"
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
              comboboxProps={comboboxProps}
              data-testid="app-filter-hazard"
            />
            <Select
              label={labels.colStatus}
              value={status === ALL ? null : status}
              onChange={(next) => onFilterChange(() => setStatus(next ?? ALL))}
              data={STATUSES.map((value) => ({ value, label: value }))}
              clearable
              allowDeselect={false}
              comboboxProps={comboboxProps}
              data-testid="app-filter-status"
            />
            <TextInput
              label={labels.fieldDataSource}
              value={query}
              onChange={(event) => onFilterChange(() => setQuery(event.currentTarget.value))}
              data-testid="app-filter-query"
            />
          </SimpleGrid>
        </Collapse>
      </Card>

      {/* ---------------------------------------------------- records table -- */}
      <Table.ScrollContainer minWidth={720} type="native">
        <Table striped highlightOnHover withTableBorder tabularNums aria-label={labels.navRecords}>
          <Table.Thead>
            <Table.Tr>
              {COLUMNS.map((column) => (
                <Table.Th
                  key={column.key}
                  aria-sort={ariaSort(sort, column.key)}
                  ta={column.numeric ? "end" : undefined}
                >
                  {/*
                    * ONE sort-trigger shape across all four Mantine tables — this
                    * view, `sections/SectionDataTable.tsx`, and the two
                    * mangrove-mantine equivalents. `demo-sort` carries the full-width
                    * hit area, the logical `text-align: start` and the hover colour;
                    * `demo-sort__indicator` carries the glyph and is `aria-hidden`,
                    * because `aria-sort` on the `<th>` is what announces the state and
                    * a screen reader should not also hear "▲". Earlier this view
                    * inlined the arrow into the label text and set no class at all, so
                    * `demo.css`'s `.demo-sort` rules reached the kitchen sink and not
                    * the application screen.
                    */}
                  <UnstyledButton
                    className="demo-sort"
                    data-numeric={column.numeric ? "true" : undefined}
                    onClick={() => toggleSort(column.key)}
                    aria-label={`Sort by ${labels[column.labelKey]}`}
                    data-testid={`app-sort-${column.key}`}
                  >
                    <Text span size="sm" fw="semibold" className="demo-sort__label">
                      {labels[column.labelKey]}
                    </Text>
                    <span aria-hidden="true" className="demo-sort__indicator">
                      {sort?.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </UnstyledButton>
                </Table.Th>
              ))}
              {/*
                * `ta="end"` is a LOGICAL value on Mantine's own style-prop API, so
                * the row-action column follows the reading direction in Arabic
                * without a second rule and without any RTL code of ours. Stated as
                * a property of Mantine's `Box` style props, which is all it is.
                *
                * THE HEADER IS ENGLISH IN ALL FOUR LOCALES, and that is the honest
                * option here. This column holds the three row actions; the fixture
                * label set has no "Actions" string, and it previously borrowed
                * `labels.colReviewNote` — "Review note" — which names a DIFFERENT
                * column that this table also renders in the kitchen sink. Mantine
                * has no default header text to fall back on either. So: an
                * untranslated English word, recorded, exactly as the pagination
                * "Page" line below is. THE FIXTURE GAP IS a missing `colActions`
                * key in `@undrr-eval/fixtures`.
                */}
              <Table.Th ta="end">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {visible.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={COLUMNS.length + 1}>
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
                  <Table.Td ta="end">{formatters.integer.format(record.peopleAffected)}</Table.Td>
                  <Table.Td ta="end">
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
                  <Table.Td ta="end">
                    {/*
                      * Row actions. Every tooltip is PORTALLED, so each one takes
                      * `portalProps` — the token scope class for the focus ring
                      * and the direction class, because `Portal` forwards neither
                      * a `dir` prop nor the frame's `dir` attribute. See
                      * src/overlay-class.ts and the effect in `AppView` below.
                      */}
                    {/*
                      * "VIEW" AND "EDIT" ARE ENGLISH IN ALL FOUR LOCALES, recorded
                      * for the same reason as the column header above. The fixture
                      * action strings are Save / Cancel / Delete / Filter / Clear
                      * filters / Export: there is no "view" and no "edit". These
                      * buttons previously borrowed `labels.navRecords` ("Loss
                      * records") and `labels.actionSave` ("Save"), so the row's edit
                      * control announced itself as "Save DRR-0001" — a button that
                      * says it will write when it will not. Only DELETE has a true
                      * fixture label, and it keeps it. THE FIXTURE GAP IS missing
                      * `actionView` / `actionEdit` keys in `@undrr-eval/fixtures`;
                      * until they exist, an untranslated verb that is correct beats
                      * a translated one that is wrong.
                      */}
                    <Group gap="0" justify="flex-end" wrap="nowrap">
                      <Tooltip
                        label={`View: ${record.id}`}
                        events={{ hover: true, focus: true, touch: true }}
                        portalProps={portalProps}
                      >
                        <ActionIcon
                          variant="subtle"
                          color="undrrAccent"
                          aria-label={`View ${record.id}`}
                        >
                          <Icon path={PATHS.view} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip
                        label={`Edit: ${record.id}`}
                        events={{ hover: true, focus: true, touch: true }}
                        portalProps={portalProps}
                      >
                        <ActionIcon
                          variant="subtle"
                          color="undrrAccent"
                          aria-label={`Edit ${record.id}`}
                        >
                          <Icon path={PATHS.edit} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip
                        label={`${labels.actionDelete}: ${record.id}`}
                        events={{ hover: true, focus: true, touch: true }}
                        portalProps={portalProps}
                      >
                        <ActionIcon
                          variant="subtle"
                          color="undrrError"
                          aria-label={`${labels.actionDelete} ${record.id}`}
                          onClick={() => setPendingDelete(record)}
                        >
                          <Icon path={PATHS.remove} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* ------------------------------------------------------- pagination -- */}
      <Group justify="space-between" align="center" wrap="wrap" mt="md">
                {/*
                  * "Page" IS ENGLISH IN ALL FOUR LOCALES, deliberately. The fixture
                  * label set carries no pagination strings and inventing translations
                  * is out of bounds, so this line reads "٣ / 1 Page" in Arabic — an
                  * English word in a right-to-left line.
                  *
                  * AND MANTINE OFFERS NOTHING TO FALL BACK ON. `Pagination` renders
                  * no text of its own — the controls are icons and page numbers — so
                  * `@mantine/core` ships no translations for pagination at all and
                  * there is no locale bundle to point at. Any wording around it is
                  * application text by construction. Recorded as what Mantine ships,
                  * not papered over.
                  */}
        <Text size="sm" c="dimmed" data-testid="app-page-summary">
          Page {formatters.integer.format(safePage)} / {formatters.integer.format(totalPages)}
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

      {/* -------------------------------------------------------- modal flow -- */}
      <Modal
        opened={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={labels.actionDelete}
        portalProps={portalProps}
        /*
         * MANTINE'S MODAL CLOSE BUTTON SHIPS WITH NO ACCESSIBLE NAME, and this view
         * drops it rather than name it. Measured, not inferred: with the default
         * close button present, axe reports a CRITICAL `button-name` violation on
         * `.mantine-Modal-close` — an icon-only button whose accessible name is
         * empty, which a screen-reader user meets as "button".
         *
         * The kitchen sink has the same defect and CANNOT SEE IT: its modal is
         * portalled to `document.body`, outside `[data-candidate-root]`, and its axe
         * run is scoped to that subtree. This spec runs axe against the open dialog
         * specifically, which is how it surfaced. Same class of gap as
         * `Pagination`'s four nameless edge controls.
         *
         * `closeButtonProps={{ "aria-label": … }}` is the documented fix and was
         * tried first. It produces a second control named "Cancel" in a dialog that
         * already has one, because the fixture label set has no "close" string and
         * inventing four translations is out of bounds — two identically named
         * dismiss buttons is a worse outcome than one. A confirmation dialog with
         * explicit Cancel and Delete actions does not need a third route out; Escape
         * still closes it, and `closes the delete dialog on Escape` asserts that.
         */
        withCloseButton={false}
      >
        <Text mb="sm">{labels.longRetentionNotice}</Text>
        {pendingDelete ? (
          <Text mb="md" data-testid="app-delete-target">
            <strong>{pendingDelete.id}</strong> — {pendingDelete.country},{" "}
            {pendingDelete.hazardType},{" "}
            {formatters.date.format(new Date(`${pendingDelete.eventDate}T00:00:00Z`))}
          </Text>
        ) : null}
        <Group gap="sm" justify="flex-end">
          <Button variant="default" onClick={() => setPendingDelete(null)}>
            {labels.actionCancel}
          </Button>
          <Button
            variant="filled"
            color="undrrError"
            onClick={() => {
              if (pendingDelete) {
                setDeleted((previous) => [...previous, pendingDelete.id]);
                setPage(1);
              }
              setPendingDelete(null);
            }}
          >
            {labels.actionDelete}
          </Button>
        </Group>
      </Modal>
    </>
  );
}

export function AppView({
  candidateEnabled,
}: {
  readonly candidateEnabled: boolean;
}): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

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
   * Keeps portalled overlays in the current text direction. Identical to the
   * effect in `App.tsx`, and needed for identical reasons — `AppFrame` puts `dir`
   * on its own wrapper exactly as `HostShell` does, so a portal appended to
   * `document.body` sits outside it and falls back to `<html dir="ltr">`, which
   * the host owns and the candidate must not rewrite.
   *
   * `Portal` builds its container inside an effect keyed only on `target`, copying
   * `className` from the props it had AT MOUNT, so a direction class delivered
   * through `portalProps` is correct on first paint and stale forever after. Hence
   * the stamp, scoped to `.demo-portal`, which only our own `portalProps` applies.
   */
  useEffect(() => {
    for (const node of document.querySelectorAll<HTMLElement>(".demo-portal")) {
      node.setAttribute("dir", demo.dir);
    }
  }, [demo.dir]);

  let candidate: ReactNode = null;
  if (candidateEnabled) {
    candidate = (
      /*
       * Same provider stack, and the same compromise, as `App.tsx`.
       * `detectDirection={false}` because the `dir` attribute lives on the frame's
       * wrapper rather than on `<html>`, where Mantine looks for it. Mantine's
       * direction CONTEXT therefore stays at `initialDirection` for the life of the
       * mount: `DirectionProvider` seeds its state once and exposes only
       * `setDirection()`, which writes to `document.documentElement` — a mutation
       * outside the candidate subtree, which the mangrove-mantine run accepted and
       * this one does not. Every Mantine RTL rule is CSS
       * (`:where([dir="rtl"]) .m_…`) and matches from the frame's wrapper, so the
       * rendered result is right; what is stale is the JS-side value, and the one
       * place that shows is a portal, which is what `portalProps` and the effect
       * above exist for.
       */
      <DirectionProvider initialDirection={demo.dir} detectDirection={false}>
        <MantineProvider
          theme={undrrMantineTheme}
          cssVariablesResolver={undrrCssVariablesResolver}
          forceColorScheme="light"
        >
          <DemoContext.Provider value={demo}>
            <div className={`${TOKEN_SCOPE_CLASS} demo`} data-locale={locale}>
              <RecordsScreen locale={locale} onLocaleChange={setLocale} />
            </div>
          </DemoContext.Provider>
        </MantineProvider>
      </DirectionProvider>
    );
  }

  return (
    <AppFrame
      title={demo.labels.appTitle}
      dir={demo.dir}
      /*
       * The frame's `pageHeader` and `notices` slots render both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they sit in the leakage baseline as well as the
       * candidate render and cannot themselves register as a difference.
       *
       * `"island"` is deliberately absent from `available`: the embedded-island
       * view is a Mangrove view and this is the Delta host. Listing it would
       * produce a dead link to an `island.html` this app does not ship.
       */
      pageHeader={
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "application")}
          pairingName="Mantine on Delta"
          otherHost={{ label: "Mantine on Mangrove", href: "../mangrove-mantine/" }}
        />
      }
      notices={<KnownIssues candidate="mantine" host="delta" candidateName="Mantine" />}
    >
      {candidate}
    </AppFrame>
  );
}

