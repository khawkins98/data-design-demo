/**
 * Embedded-island view: Ant Design owns ONE region inside a real UNDRR page frame.
 *
 * The kitchen sink hands antd the whole content column. This view is the opposite
 * and the realistic Mangrove case: host prose above, host prose below, and a
 * single filterable data table in between. See `IslandFrame.tsx` for what that
 * arrangement is meant to surface.
 *
 * WHY THIS VIEW IS THE ONE THAT MATTERS FOR THIS PAIRING. `StyleProvider layer`
 * wraps every antd rule in a CSS `@layer`, and Mangrove 1.8.1 ships zero
 * `@layer` at-rules, so antd loses every specificity conflict with the host and
 * its controls render as MANGROVE's controls with no repair CSS at all. The
 * kitchen sink measures that against a canary block. The island measures it where
 * it is actually decided: antd's Select and Input sitting a few pixels below
 * Mangrove's own `h1`, prose and links, inside `mg-container`, under the real
 * masthead. Read `EVIDENCE.md` for the decision this forces.
 *
 * WHY `SectionDataTable` FROM `@undrr-eval/integration-antd` IS NOT REUSED. Same
 * reason the MUI island rebuilt its grid: that section renders `id="section-6"`, a
 * numbered `h3` ("6. Data table, 250 rows"), eight columns with resize grips, and
 * `rowSelection` — a component inventory entry, not a screen. Its filtering is
 * antd's own column header menu, not the filter controls a real UNDRR page puts
 * above a table. The column DEFINITIONS are the genuinely shared part and are
 * rebuilt here at the narrower island width, which is honest A3 evidence: the
 * theme and labels extracted cleanly, the inventory sections did not.
 *
 * WHAT WAS DELIBERATELY LEFT OUT, and it is a real cost. `rowSelection` is
 * absent. `rc-table` renders an `aria-hidden` measure row whenever `scroll.x` is
 * set, and `rowSelection` puts a focusable checkbox inside it — a genuine
 * `aria-hidden-focus` violation that belongs to antd, not to this integration, and
 * that would hit any real UNDRR table wide enough to need horizontal scrolling.
 * `scroll.x` is kept, because without it a seven-column table overflows the
 * Mangrove content column at the mobile viewport; the checkboxes are what went.
 * The island therefore has no bulk-action affordance, which a real loss-record
 * review screen would want. `island.spec.ts` measures the absence rather than
 * asserting it from this comment.
 *
 * Fixture data only, and no `new Date()` outside `Intl` formatting of fixture
 * values.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ConfigProvider, Form, Input, Segmented, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import arEG from "antd/es/locale/ar_EG";
import deDE from "antd/es/locale/de_DE";
import enGB from "antd/es/locale/en_GB";
import frFR from "antd/es/locale/fr_FR";
import { StyleProvider } from "@ant-design/cssinjs";

import { LOCALES, LOSS_RECORDS, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { LocaleCode, LossRecord, VerificationStatus } from "@undrr-eval/fixtures";
import { IslandFrame, ViewSwitcher } from "@undrr-eval/host-mangrove";
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
 * Status colours from the UNDRR tokens rather than antd's preset palette, for the
 * same reason `SectionDataTable` does it: antd's own `green`/`gold`/`red` filled
 * tags fail axe colour contrast, and they would be antd's hues rather than
 * UNDRR's regardless.
 */
const STATUS_COLOUR: Record<VerificationStatus, string> = {
  verified: color.success,
  pending: color.warning,
  disputed: color.error,
  withdrawn: color.textSecondary,
};

/** Country list derived from the fixture rather than invented. */
const COUNTRIES = Array.from(new Set(LOSS_RECORDS.map((row) => row.country))).sort();

export function IslandView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const [country, setCountry] = useState<string>(ALL);
  const [hazard, setHazard] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  /**
   * Mirrors antd's own sort state rather than controlling it, exactly as
   * `apps/delta-antd/src/AppView.tsx` does. antd owns the comparators and the
   * ordering; this is here only so a sort change can return the reader to page
   * one, which antd does not do for you.
   */
  const [sortKey, setSortKey] = useState<string | undefined>("eventDate");
  const [sortOrder, setSortOrder] = useState<string | undefined>("descend");

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

  const columns = useMemo<ColumnsType<LossRecord>>(() => {
    const number = new Intl.NumberFormat(bcp47);
    const decimal = new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const date = new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" });

    /*
     * EVERY COLUMN SORTS, and none of it is written here. `sorter` is a comparator
     * plus a prop; antd supplies the header affordance, the tri-state cycle
     * (ascending → descending → unsorted), the `aria-sort` on the `<th>`, the
     * localised tooltip and the reordering. The string comparators pass `bcp47`, so
     * German and French order accented country names by the SELECTED locale rather
     * than by the runner's default. The island used to be the only one of the ten
     * views with an unsortable table — an omission of this view's, not a limit of
     * antd's, and the island views are meant to be a comparable feature surface.
     */
    return [
      {
        key: "country",
        dataIndex: "country",
        title: labels.colCountry,
        width: 130,
        sorter: (a, b) => a.country.localeCompare(b.country, bcp47),
      },
      {
        key: "hazardType",
        dataIndex: "hazardType",
        title: labels.colHazard,
        width: 150,
        sorter: (a, b) => a.hazardType.localeCompare(b.hazardType, bcp47),
      },
      {
        key: "eventDate",
        dataIndex: "eventDate",
        title: labels.colEventDate,
        width: 140,
        // ISO strings sort correctly as strings, which is why the fixtures use ISO;
        // no locale and no clock involved.
        defaultSortOrder: "descend",
        sorter: (a, b) => a.eventDate.localeCompare(b.eventDate),
        render: (value: string) => date.format(new Date(`${value}T00:00:00Z`)),
      },
      {
        key: "peopleAffected",
        dataIndex: "peopleAffected",
        title: labels.colPeopleAffected,
        width: 150,
        // `align: "end"` is a LOGICAL value: antd's column `align` accepts
        // `"start" | "center" | "end"`, so the column follows the reading
        // direction in Arabic on its own, with no RTL code in this view. One of
        // the reasons antd's RTL scores `native` — a property of antd's column
        // API, stated on its own terms.
        align: "end",
        sorter: (a, b) => a.peopleAffected - b.peopleAffected,
        render: (value: number) => number.format(value),
      },
      {
        key: "economicLossUsdMillions",
        dataIndex: "economicLossUsdMillions",
        title: labels.colEconomicLoss,
        width: 180,
        align: "end",
        sorter: (a, b) => a.economicLossUsdMillions - b.economicLossUsdMillions,
        render: (value: number) => decimal.format(value),
      },
      {
        key: "verificationStatus",
        dataIndex: "verificationStatus",
        title: labels.colStatus,
        width: 160,
        sorter: (a, b) => a.verificationStatus.localeCompare(b.verificationStatus, bcp47),
        render: (value: VerificationStatus) => <Tag color={STATUS_COLOUR[value]}>{value}</Tag>,
      },
      {
        key: "dataSource",
        dataIndex: "dataSource",
        title: labels.colDataSource,
        width: 220,
        sorter: (a, b) => a.dataSource.localeCompare(b.dataSource, bcp47),
      },
    ];
  }, [labels, bcp47]);

  /** Any filter change returns the reader to page one. */
  const onFilterChange = (apply: () => void): void => {
    apply();
    setPage(1);
  };

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
       * screen view is a Delta view, and this is the Mangrove host. Listing it here
       * would produce a dead link to an `app.html` this app does not ship.
       */
      notices={
        <>
          <ViewSwitcher
            views={viewLinks(["island", "inventory"], "island")}
            pairingName="Ant Design on Mangrove"
            otherHost={{ label: "Ant Design on Delta", href: "../delta-antd/" }}
          />
          <KnownIssues candidate="antd" host="mangrove" candidateName="Ant Design" />
        </>
      }
    >
      {candidateEnabled ? (
        /*
         * `layer` is the whole finding of this pairing, so it is set here exactly
         * as the kitchen sink sets it. Removing it for the island would have made
         * the two views incomparable and quietly hidden the effect the island
         * exists to show.
         */
        <StyleProvider layer>
          <ConfigProvider
            theme={undrrAntdTheme}
            locale={ANTD_LOCALES[locale]}
            direction={demo.dir}
            /*
             * Overlays render inside the candidate subtree instead of at
             * document.body. Two things depend on it in this view: `var(--undrr-*)`
             * resolves, because the tokens are scoped to `.undrr-tokens` rather
             * than `:root`; and the overlay inherits CSS `direction` from the
             * frame's own `dir` wrapper. The pilot found portalled overlays lose
             * direction against these frames precisely because `dir` sits on a
             * frame wrapper and not on `<html>` — antd makes that one prop rather
             * than a class threaded through every overlay.
             */
            getPopupContainer={(trigger) =>
              (trigger?.closest(".demo") as HTMLElement) ?? document.body
            }
          >
            <div className={`${TOKEN_SCOPE_CLASS} demo`}>
              <DemoContext.Provider value={demo}>
                <Segmented
                  value={locale}
                  onChange={(next) => setLocale(next as LocaleCode)}
                  options={LOCALES.map((entry) => ({ value: entry.code, label: entry.label }))}
                  aria-label="Locale"
                  style={{ marginBottom: "1.5rem" }}
                />

                {/*
                  * Filter controls ABOVE the table, which is where a real UNDRR
                  * page puts them. Four discrete controls rather than antd's own
                  * column filter menus, because the menus are a component feature
                  * and this is a layout question.
                  */}
                <Form
                  layout="vertical"
                  id="island-filters"
                  onSubmitCapture={(event) => event.preventDefault()}
                  style={{
                    display: "grid",
                    gap: "0 1.5rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
                    marginBottom: "1rem",
                  }}
                >
                  <Form.Item label={labels.fieldCountry} htmlFor="island-country">
                    <Select
                      id="island-country"
                      value={country}
                      onChange={(next) => onFilterChange(() => setCountry(next))}
                      style={{ width: "100%" }}
                      options={[
                        { value: ALL, label: labels.actionClearFilters },
                        ...COUNTRIES.map((name) => ({ value: name, label: name })),
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label={labels.fieldHazard} htmlFor="island-hazard">
                    <Select
                      id="island-hazard"
                      value={hazard}
                      onChange={(next) => onFilterChange(() => setHazard(next))}
                      style={{ width: "100%" }}
                      options={[
                        { value: ALL, label: labels.actionClearFilters },
                        ...OPTIONS_SMALL.map((option) => ({
                          value: option.value,
                          label: option.label,
                        })),
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label={labels.colStatus} htmlFor="island-status">
                    <Select
                      id="island-status"
                      value={status}
                      onChange={(next) => onFilterChange(() => setStatus(next))}
                      style={{ width: "100%" }}
                      options={[
                        { value: ALL, label: labels.actionClearFilters },
                        ...STATUSES.map((value) => ({ value, label: value })),
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label={labels.fieldDataSource} htmlFor="island-source">
                    <Input
                      id="island-source"
                      value={query}
                      onChange={(event) =>
                        onFilterChange(() => setQuery(event.currentTarget.value))
                      }
                    />
                  </Form.Item>
                </Form>

                <Typography.Paragraph type="secondary" style={{ marginBottom: "0.5rem" }}>
                  {new Intl.NumberFormat(bcp47).format(rows.length)} /{" "}
                  {new Intl.NumberFormat(bcp47).format(LOSS_RECORDS.length)} —{" "}
                  {labels.navRecords}
                </Typography.Paragraph>

                <Table<LossRecord>
                  columns={columns}
                  dataSource={[...rows]}
                  rowKey="id"
                  size="small"
                  aria-label={labels.navRecords}
                  /*
                   * NO `rowSelection`. See the header comment: with `scroll.x` set,
                   * rc-table's `aria-hidden` measure row would carry a focusable
                   * checkbox and produce a real `aria-hidden-focus` violation.
                   */
                  scroll={{ x: "max-content" }}
                  /*
                   * ONE handler for paging AND sorting, because a sort change while
                   * on page five would otherwise strand the reader mid-list — antd
                   * does not reset the page for you. This is the only paging or
                   * sorting logic the view owns; the comparators are props and the
                   * ordering is antd's. Same shape as `delta-antd/src/AppView.tsx`.
                   */
                  onChange={(nextPagination, _filters, nextSorter) => {
                    const single = Array.isArray(nextSorter) ? nextSorter[0] : nextSorter;
                    const key = single?.columnKey ? String(single.columnKey) : undefined;
                    const order = single?.order ?? undefined;
                    const sortChanged = key !== sortKey || order !== sortOrder;
                    setSortKey(key);
                    setSortOrder(order);
                    setPageSize(nextPagination.pageSize ?? 10);
                    setPage(sortChanged ? 1 : (nextPagination.current ?? 1));
                  }}
                  pagination={{
                    current: page,
                    pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 25, 50],
                    /*
                     * "1-10 of 250" is written here rather than taken from antd,
                     * because the fixtures carry no pagination strings — and it is
                     * the only string in this chrome that is ours. The page-size
                     * suffix, the sort tooltips and the empty state all come from
                     * `antd/es/locale/*` through the one `locale` prop on
                     * ConfigProvider above, in all four locales. Stated as what
                     * antd ships, which is a wired locale pack.
                     */
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                  }}
                />
              </DemoContext.Provider>
            </div>
          </ConfigProvider>
        </StyleProvider>
      ) : null}
    </IslandFrame>
  );
}
