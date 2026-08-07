/**
 * Full-application view: Ant Design carries a whole DELTA records screen.
 *
 * Modelled on DELTA's real `DisasterEventsPage`: page header with summary text, a
 * collapsible filter card, a table with status pills and row-action icon buttons,
 * pagination, and one modal flow (delete confirmation).
 *
 * WHAT ANTD GIVES AWAY HERE THAT THE MUI PILOT HAD TO WRITE. The MUI screen chose
 * `Table` + `TablePagination` over `DataGrid` and paid for it in application code:
 * the sort comparator, the page slice and the pagination wiring are all hand-
 * written there. antd's `Table` is one component that does sorting (`sorter` per
 * column), pagination (`pagination`) and the page slice itself, WITHOUT putting
 * the row actions behind a virtualised `renderCell` — so this screen keeps the
 * action buttons in normal DOM order and still writes none of the paging logic.
 * The only pagination state held here is `current`/`pageSize`, and only so that a
 * filter or sort change can return the reader to page one.
 *
 * NO ICON PACKAGE. `@ant-design/icons` is not a declared dependency of this app
 * and installing one was out of scope, so the three row actions use inline SVG
 * path data inside antd `Button`s. Deliberately the SAME path data as the MUI
 * pilot's `AppView`, so the two screens are visually comparable at the row-action
 * column and any difference there is antd's rather than the icons'.
 *
 * `rowSelection` IS ABSENT, and that is a cost, not an oversight. `rc-table`
 * renders an `aria-hidden` measure row whenever `scroll.x` is set, and
 * `rowSelection` puts a focusable checkbox inside it — a real `aria-hidden-focus`
 * violation that is antd's and would hit any wide UNDRR table. `scroll.x` is kept,
 * because eight columns overflow the viewport at 390px otherwise. So this screen
 * has row actions but no bulk actions. `app.spec.ts` measures that the measure row
 * is genuinely focusable-free rather than trusting this comment.
 *
 * Fixture data only. Deletion is local component state over `LOSS_RECORDS`; no
 * fixture is mutated and there is no `new Date()` outside `Intl` formatting of
 * fixture values.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Collapse,
  ConfigProvider,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import arEG from "antd/es/locale/ar_EG";
import deDE from "antd/es/locale/de_DE";
import enGB from "antd/es/locale/en_GB";
import frFR from "antd/es/locale/fr_FR";
import { StyleProvider } from "@ant-design/cssinjs";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { AppFrame, ViewSwitcher } from "@undrr-eval/host-delta";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { KnownIssues } from "@undrr-eval/known-issues";
import { DemoContext, labelsFor, undrrAntdTheme } from "@undrr-eval/integration-antd";
import type { DemoContextValue } from "@undrr-eval/integration-antd";
import { TOKEN_SCOPE_CLASS, color } from "@undrr-eval/undrr-tokens";

/** The leakage contract: `?candidate=off` renders the frame with no candidate. */
const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

/** antd's own locale packs, keyed to the fixture locales. */
const ANTD_LOCALES = { en: enGB, fr: frFR, de: deDE, ar: arEG } as const;

const ALL = "all";

const STATUSES: readonly VerificationStatus[] = [
  "verified",
  "pending",
  "disputed",
  "withdrawn",
];

/**
 * Status colours from the UNDRR tokens rather than antd's preset palette: antd's
 * own filled `green`/`gold`/`red` tags fail axe colour contrast, and they would be
 * antd's hues rather than UNDRR's regardless.
 */
const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: color.success,
  pending: color.warning,
  disputed: color.error,
  withdrawn: color.textSecondary,
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

/** Material path data, inlined because no icon package is installed. */
const PATHS = {
  view: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  remove: "M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
} as const;

/** A 16px inline icon. `aria-hidden`, because the button carries the name. */
function Icon({ path }: { readonly path: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function AppView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  /**
   * Mirrors antd's own sort state rather than controlling it. antd owns the
   * comparator and the ordering; this is here only so a sort change can send the
   * reader back to page one, which antd does not do for you.
   */
  const [sortKey, setSortKey] = useState<string | undefined>("eventDate");
  const [sortOrder, setSortOrder] = useState<string | undefined>("descend");

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

  const filtersActive =
    country !== ALL || hazard !== ALL || status !== ALL || query.trim() !== "";

  const onFilterChange = (apply: () => void): void => {
    apply();
    setPage(1);
  };

  const resetFilters = (): void => {
    setCountry(ALL);
    setHazard(ALL);
    setStatus(ALL);
    setQuery("");
    setPage(1);
  };

  const columns = useMemo<ColumnsType<LossRecord>>(
    () => [
      {
        key: "country",
        dataIndex: "country",
        title: labels.colCountry,
        width: 130,
        // antd owns the comparator. The MUI pilot wrote this by hand.
        sorter: (a, b) => a.country.localeCompare(b.country, bcp47),
      },
      { key: "hazardType", dataIndex: "hazardType", title: labels.colHazard, width: 150 },
      {
        key: "eventDate",
        dataIndex: "eventDate",
        title: labels.colEventDate,
        width: 140,
        defaultSortOrder: "descend",
        sorter: (a, b) => a.eventDate.localeCompare(b.eventDate),
        render: (value: string) => formatters.date.format(new Date(`${value}T00:00:00Z`)),
      },
      {
        key: "peopleAffected",
        dataIndex: "peopleAffected",
        title: labels.colPeopleAffected,
        width: 150,
        // antd's column `align` takes `"start" | "center" | "end"`. Those are
        // LOGICAL values, so this column — and the row-action column below it —
        // follows the reading direction in Arabic with no RTL code of ours, no
        // second stylesheet and no per-locale branch. Asserted in `app.spec.ts`
        // ("RTL flips the row-action column with the row"), which reads the
        // computed keyword back as `end` rather than a resolved physical side.
        align: "end",
        sorter: (a, b) => a.peopleAffected - b.peopleAffected,
        render: (value: number) => formatters.number.format(value),
      },
      {
        key: "economicLossUsdMillions",
        dataIndex: "economicLossUsdMillions",
        title: labels.colEconomicLoss,
        width: 180,
        align: "end",
        sorter: (a, b) => a.economicLossUsdMillions - b.economicLossUsdMillions,
        render: (value: number) => formatters.decimal.format(value),
      },
      {
        key: "verificationStatus",
        dataIndex: "verificationStatus",
        title: labels.colStatus,
        width: 160,
        render: (value: VerificationStatus) => <Tag color={STATUS_COLOUR[value]}>{value}</Tag>,
      },
      {
        key: "reviewNote",
        dataIndex: "reviewNote",
        title: labels.colReviewNote,
        width: 240,
        render: (value: string | null) => value ?? "—",
      },
      /*
       * "ACTIONS", "VIEW" AND "EDIT" ARE ENGLISH IN ALL FOUR LOCALES, recorded
       * rather than substituted. This column previously took its header from
       * `labels.navSettings` ("Settings" — a nav destination, not a column), its
       * view button from `labels.navRecords` ("Loss records") and its edit button
       * from `labels.actionSave` ("Save"), so the row's edit control announced
       * itself as a control that writes. The fixture action strings are Save /
       * Cancel / Delete / Filter / Clear filters / Export; there is no view, no
       * edit and no actions among them, and antd's locale packs carry table chrome
       * rather than application vocabulary, so there is no library default to fall
       * back on either. Only DELETE has a true fixture label and it keeps it. THE
       * FIXTURE GAP IS missing `colActions` / `actionView` / `actionEdit` keys in
       * `@undrr-eval/fixtures`; until they exist, an untranslated verb that is
       * correct beats a translated one that is wrong. Same decision, same three
       * strings, as `apps/delta-mantine/src/AppView.tsx`.
       */
      {
        key: "actions",
        title: "Actions",
        width: 140,
        align: "end",
        render: (_value, row) => (
          <Space size={0}>
            <Button
              type="text"
              size="small"
              aria-label={`View ${row.id}`}
              title={`View: ${row.id}`}
              icon={<Icon path={PATHS.view} />}
            />
            <Button
              type="text"
              size="small"
              aria-label={`Edit ${row.id}`}
              title={`Edit: ${row.id}`}
              icon={<Icon path={PATHS.edit} />}
            />
            <Button
              type="text"
              size="small"
              danger
              aria-label={`${labels.actionDelete} ${row.id}`}
              title={`${labels.actionDelete}: ${row.id}`}
              icon={<Icon path={PATHS.remove} />}
              onClick={() => setPendingDelete(row)}
            />
          </Space>
        ),
      },
    ],
    [labels, bcp47, formatters],
  );

  return (
    <AppFrame
      title={labels.appTitle}
      dir={demo.dir}
      /*
       * The frame's `pageHeader` and `notices` slots render both of these OUTSIDE
       * `data-candidate-root`, so no candidate stylesheet can restyle them and the
       * candidate subtree is genuinely empty under `?candidate=off`. Passed
       * unconditionally, so they are present in the leakage baseline as well as the
       * candidate render and therefore cannot themselves register as a difference.
       *
       * `"island"` is deliberately absent from `available`: the embedded-island view
       * is a Mangrove view, and this is the Delta host. Listing it here would produce
       * a dead link to an `island.html` this app does not ship.
       */
      pageHeader={
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "application")}
          pairingName="Ant Design on Delta"
          otherHost={{ label: "Ant Design on Mangrove", href: "../mangrove-antd/" }}
        />
      }
      notices={<KnownIssues candidate="antd" host="delta" candidateName="Ant Design" />}
    >
      {candidateEnabled ? (
        /*
         * `layer` is set here exactly as the kitchen sink sets it, so the two views
         * stay comparable. On THIS host it is close to invisible: Tailwind 4
         * compiles Preflight into `@layer base`, so both sides are layered and
         * antd's later layer wins normally. The frame's genuine `mg-button` is the
         * one unlayered adversary, and the frame-canary assertion covers it.
         */
        <StyleProvider layer>
          <ConfigProvider
            theme={undrrAntdTheme}
            locale={ANTD_LOCALES[locale]}
            direction={demo.dir}
            /*
             * Overlays render inside the candidate subtree instead of at
             * document.body, so `var(--undrr-*)` resolves and the overlay inherits
             * CSS `direction` from the frame's `dir` wrapper. The pilot found
             * portalled overlays lose direction against these frames because `dir`
             * sits on a frame wrapper rather than on `<html>`.
             *
             * The delete Modal is the exception and it is deliberate: see its
             * `getContainer` below.
             */
            getPopupContainer={(trigger) =>
              (trigger?.closest(".demo") as HTMLElement) ?? document.body
            }
          >
            <div className={`${TOKEN_SCOPE_CLASS} demo`}>
              <DemoContext.Provider value={demo}>
                {/* ---------------------------------------------- page header -- */}
                <div className="demo-app-header">
                  <div style={{ minWidth: 0 }}>
                    <Typography.Title level={2} style={{ marginBottom: "0.5rem" }}>
                      {labels.navRecords}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ maxWidth: "68ch" }}>
                      {formatters.number.format(filtered.length)} /{" "}
                      {formatters.number.format(LOSS_RECORDS.length)} —{" "}
                      {labels.longVerificationBanner}
                    </Typography.Paragraph>
                  </div>

                  <Segmented
                    value={locale}
                    onChange={(next) => setLocale(next as LocaleCode)}
                    options={LOCALES.map((entry) => ({ value: entry.code, label: entry.label }))}
                    aria-label="Locale"
                  />
                </div>

                {/* ------------------------------------- collapsible filters -- */}
                {/*
                  * antd's own `Collapse`, not a Card plus a hand-rolled toggle.
                  * Its header is a real `role="button"` with `aria-expanded` and
                  * `aria-controls` wired by the component, which is the difference
                  * from the MUI pilot: there the toggle, the `aria-expanded` and
                  * the `aria-controls` are application code.
                  */}
                <Collapse
                  activeKey={filtersOpen ? ["filters"] : []}
                  onChange={(keys) => setFiltersOpen((keys as string[]).length > 0)}
                  style={{ marginBottom: "1.5rem" }}
                  items={[
                    {
                      key: "filters",
                      label: labels.actionFilter,
                      extra: (
                        <Button
                          size="small"
                          disabled={!filtersActive}
                          onClick={(event) => {
                            // The header is the toggle, so a click on a control
                            // inside it would collapse the panel as a side effect.
                            event.stopPropagation();
                            resetFilters();
                          }}
                        >
                          {labels.actionClearFilters}
                        </Button>
                      ),
                      children: (
                        <Form
                          layout="vertical"
                          id="records-filters"
                          onSubmitCapture={(event) => event.preventDefault()}
                          style={{
                            display: "grid",
                            gap: "0 1.5rem",
                            gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
                          }}
                        >
                          {/*
                            * THE UNFILTERED STATE IS A PLACEHOLDER, NOT A SENTINEL OPTION.
                            *
                            * These three Selects used to carry a first option labelled
                            * `labels.actionClearFilters`, so a resting dropdown read
                            * "Clear filters" — the same words as the real Clear-filters
                            * button in the panel header a few pixels above, and the
                            * select's accessible name as well. antd has `placeholder`
                            * and `allowClear`, which is the library's own answer: the
                            * empty state is an empty control, and the clear affordance
                            * belongs on the field rather than in its option list.
                            * `value={x === ALL ? undefined : x}` is what makes the
                            * placeholder show, since antd treats only `undefined` as
                            * unset — `"all"` would be an unmatched key, rendered raw.
                            *
                            * THE PLACEHOLDER IS THE FIELD'S OWN LABEL, matching the
                            * Carbon views, whose `Dropdown` splits `titleText` from the
                            * collapsed `label` the same way. The register React Aria uses
                            * ("Any hazard type" / "Any status") reads better, but it only
                            * exists there in English: `@undrr-eval/fixtures` HAS NO
                            * `optionAll`/`filterAny*` KEY in any of the four locales, and
                            * the package is import-only for this run. The field name is
                            * the only fully-localised string available for this slot, so
                            * three fields stay Arabic and German instead of dropping to
                            * English. THE FIXTURE GAP IS RECORDED, not papered over: add
                            * an `optionAll` key and the "Any X" register can be adopted
                            * in all four locales here, in Carbon, and in React Aria.
                            */}
                          <Form.Item label={labels.fieldCountry} htmlFor="app-country">
                            <Select
                              id="app-country"
                              value={country === ALL ? undefined : country}
                              placeholder={labels.fieldCountry}
                              allowClear
                              onChange={(next?: string) =>
                                onFilterChange(() => setCountry(next ?? ALL))
                              }
                              style={{ width: "100%" }}
                              options={COUNTRIES.map((name) => ({ value: name, label: name }))}
                            />
                          </Form.Item>

                          <Form.Item label={labels.fieldHazard} htmlFor="app-hazard">
                            <Select
                              id="app-hazard"
                              value={hazard === ALL ? undefined : hazard}
                              placeholder={labels.fieldHazard}
                              allowClear
                              onChange={(next?: string) =>
                                onFilterChange(() => setHazard(next ?? ALL))
                              }
                              style={{ width: "100%" }}
                              options={OPTIONS_SMALL.map((option) => ({
                                value: option.value,
                                label: option.label,
                              }))}
                            />
                          </Form.Item>

                          <Form.Item label={labels.colStatus} htmlFor="app-status">
                            <Select
                              id="app-status"
                              value={status === ALL ? undefined : status}
                              placeholder={labels.colStatus}
                              allowClear
                              onChange={(next?: string) =>
                                onFilterChange(() => setStatus(next ?? ALL))
                              }
                              style={{ width: "100%" }}
                              options={STATUSES.map((value) => ({ value, label: value }))}
                            />
                          </Form.Item>

                          <Form.Item label={labels.fieldDataSource} htmlFor="app-source">
                            <Input
                              id="app-source"
                              value={query}
                              onChange={(event) =>
                                onFilterChange(() => setQuery(event.currentTarget.value))
                              }
                            />
                          </Form.Item>
                        </Form>
                      ),
                    },
                  ]}
                />

                {/* ----------------------------------------- records table -- */}
                <Table<LossRecord>
                  columns={columns}
                  dataSource={[...filtered]}
                  rowKey="id"
                  size="small"
                  aria-label={labels.navRecords}
                  /* No `rowSelection`: see the header comment. */
                  scroll={{ x: "max-content" }}
                  onChange={(nextPagination, _filters, nextSorter) => {
                    const single = Array.isArray(nextSorter) ? nextSorter[0] : nextSorter;
                    const key = single?.columnKey ? String(single.columnKey) : undefined;
                    const order = single?.order ?? undefined;
                    const sortChanged = key !== sortKey || order !== sortOrder;
                    setSortKey(key);
                    setSortOrder(order);
                    setPageSize(nextPagination.pageSize ?? 10);
                    // A sort change while on page 5 would otherwise strand the
                    // reader mid-list. antd does not do this for you.
                    setPage(sortChanged ? 1 : (nextPagination.current ?? 1));
                  }}
                  pagination={{
                    current: page,
                    pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 25, 50],
                    /*
                     * "1-10 of 250" is written here because the fixtures carry no
                     * pagination strings, and it is the ONLY string in this table's
                     * chrome that is. Everything else — the page-size suffix, the
                     * sort tooltips, the empty state, the page-jump label — comes
                     * from `antd/es/locale/*` through ConfigProvider, in all four
                     * locales, from the one `locale` prop at the top of this view.
                     * A wired locale pack rather than a comparison: antd ships the
                     * translations and one prop switches them.
                     */
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  }}
                  locale={{ emptyText: labels.stateEmpty }}
                />

                {/* ------------------------------------------- modal flow -- */}
                <Modal
                  open={pendingDelete !== null}
                  title={labels.actionDelete}
                  onCancel={() => setPendingDelete(null)}
                  onOk={() => {
                    if (pendingDelete) {
                      setDeleted((prev) => [...prev, pendingDelete.id]);
                      setPage(1);
                    }
                    setPendingDelete(null);
                  }}
                  okText={labels.actionDelete}
                  cancelText={labels.actionCancel}
                  okButtonProps={{ danger: true }}
                  /*
                   * The Modal renders at document.body rather than inside `.demo`.
                   * `getPopupContainer` above does not reach it — Modal takes
                   * `getContainer`, a separate prop — and it is left at the default
                   * on purpose, because a modal inside `.demo` would be clipped by
                   * the table's own `overflow` scroll container. The consequence is
                   * the portal problem the pilot found: at document.body the dialog
                   * is outside the frame's `dir` wrapper, so it does not inherit
                   * CSS `direction`. antd repairs that itself by stamping
                   * `.ant-modal-wrap-rtl` on the wrapper from ConfigProvider's
                   * `direction`, and `app.spec.ts` measures the computed
                   * `direction` rather than trusting the class.
                   */
                  className={TOKEN_SCOPE_CLASS}
                >
                  <Typography.Paragraph>{labels.longRetentionNotice}</Typography.Paragraph>
                  {pendingDelete ? (
                    <Typography.Paragraph>
                      <strong>{pendingDelete.id}</strong> — {pendingDelete.country},{" "}
                      {pendingDelete.hazardType},{" "}
                      {formatters.date.format(new Date(`${pendingDelete.eventDate}T00:00:00Z`))}
                    </Typography.Paragraph>
                  ) : null}
                </Modal>
              </DemoContext.Provider>
            </div>
          </ConfigProvider>
        </StyleProvider>
      ) : null}
    </AppFrame>
  );
}
