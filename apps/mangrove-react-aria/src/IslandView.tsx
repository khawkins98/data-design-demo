/**
 * Embedded-island view: React Aria owning ONE region of a real UNDRR page.
 *
 * `IslandFrame` supplies the four-colour decoration bar, the masthead, the
 * `role="menubar"` navigation and host prose either side of the candidate. All
 * this file renders is the region between those two paragraphs: filter controls,
 * a data table, and pagination — a filterable data table is the thing a Mangrove
 * page actually embeds.
 *
 * WHAT THIS VIEW ADDS OVER THE KITCHEN SINK. The kitchen sink hands React Aria
 * the whole content column, so the only Mangrove markup near it is a canary
 * block. Here Mangrove's own `h1` and `p` styling runs directly into the
 * candidate's first component and resumes directly under its last, which is
 * where scale mismatch and vertical-rhythm breaks actually show up.
 *
 * THE KNOWN-ISSUES BOX goes through the frame's `notices` prop, not through
 * `children`. `IslandFrame` renders it outside `data-candidate-root`, which is
 * what the kitchen sink achieves by putting it before the candidate wrapper: no
 * candidate stylesheet can restyle it, every demo's box reads identically, and it
 * is present in the `?candidate=off` baseline as well as the candidate render, so
 * it cannot itself register as a leakage difference. Passing it inside `children`
 * would break both properties and would also leave that subtree non-empty under
 * `?candidate=off`.
 *
 * `?candidate=off` renders the frame with an empty candidate subtree, the same
 * contract the kitchen sink honours, because the leakage assertion loads this
 * page twice and diffs the host canaries across the two.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { I18nProvider, Radio, RadioGroup } from "react-aria-components";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { IslandFrame, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { DemoContext, labelsFor, useDemo } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { RecordsFilters } from "./views/RecordsFilters.js";
import { RecordsPagination } from "./views/RecordsPagination.js";
import { RecordsTable } from "./views/RecordsTable.js";
import { useRecordsView } from "./views/records-state.js";

const params = new URLSearchParams(window.location.search);

const candidateEnabled = params.get("candidate") !== "off";

/** Same control as the kitchen sink's section 8, so the two views switch alike. */
function LocaleSwitcher({
  locale,
  onChange,
}: {
  readonly locale: LocaleCode;
  readonly onChange: (next: LocaleCode) => void;
}): ReactElement {
  return (
    <RadioGroup
      className="demo-field demo-field--inline demo-locale"
      value={locale}
      onChange={(next) => onChange(next as LocaleCode)}
      aria-label="Locale"
      orientation="horizontal"
    >
      {LOCALES.map((entry) => (
        <Radio key={entry.code} value={entry.code} className="demo-locale__option">
          {entry.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}

/**
 * The candidate region.
 *
 * Separated from `IslandView` for two reasons: its hooks must not run at all in
 * the `?candidate=off` baseline, and `useRecordsView` reads `DemoContext`, which
 * only exists below the provider.
 */
function RecordsIsland(): ReactElement {
  const { labels } = useDemo();
  const view = useRecordsView();

  return (
    <>
      <p className="demo-pageheader__summary">{labels.longVerificationBanner}</p>
      <RecordsFilters view={view} />
      <RecordsTable rows={view.rows} sort={view.sort} onSortChange={view.setSort} />
      <RecordsPagination view={view} id="island-page-size" />
    </>
  );
}

export function IslandView(): ReactElement {
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

  return (
    <IslandFrame
      title="Demo: Mangrove + React Aria"
      dir={demo.dir}
      pageHeader={
        /*
         * Host chrome, reaching the page through the frame's `pageHeader` slot rather
         * than `notices` - the known-issues box is a caveat about this page and
         * belongs with the content, the switcher is the way off it and belongs with
         * the frame - so it renders outside `data-candidate-root` in both states.
         * `island` is listed but `application` is not: the full-application view
         * is Delta-only, and a link to an `app.html` this app does not ship would
         * be a dead end — the exact problem the switcher exists to fix.
         */
        <ViewSwitcher
          views={viewLinks(["island", "inventory"], "island")}
          pairingName="Adobe React Aria on Mangrove"
          otherHost={{ label: "React Aria on Delta", href: "../delta-react-aria/" }}
        />
      }
      notices={<KnownIssues candidate="react-aria" host="mangrove" candidateName="Adobe React Aria" />}
    >
      {candidateEnabled ? (
        /**
         * `I18nProvider` is React Aria's documented entry point for locale, and
         * it carries direction too: under `ar-EG` the components mirror
         * themselves without any custom plumbing. `dir` still goes to the frame,
         * because the frame's own markup is not React Aria's to flip.
         */
        <I18nProvider locale={demo.bcp47}>
          <DemoContext.Provider value={demo}>
            <div
              className={`${TOKEN_SCOPE_CLASS} demo demo-view`}
              data-locale={locale}
              data-view="island"
            >
              <div className="demo-row">
                <LocaleSwitcher locale={locale} onChange={setLocale} />
              </div>
              <RecordsIsland />
            </div>
          </DemoContext.Provider>
        </I18nProvider>
      ) : null}
    </IslandFrame>
  );
}
