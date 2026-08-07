/**
 * Kitchen-sink page: React Aria Components inside the Delta host shell.
 *
 * Section order is fixed by the brief so screenshots line up across the eight
 * demos. Do not reorder.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Button, I18nProvider, Radio, RadioGroup } from "react-aria-components";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell, ViewSwitcher } from "@undrr-eval/host-delta";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";
import { KnownIssues } from "@undrr-eval/known-issues";

import { DemoContext, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { SectionChrome } from "./sections/SectionChrome.js";
import { SectionDataTable } from "./sections/SectionDataTable.js";
import { SectionDates } from "./sections/SectionDates.js";
import { SectionForms } from "./sections/SectionForms.js";
import { SectionOverlays } from "./sections/SectionOverlays.js";
import { SectionSelection } from "./sections/SectionSelection.js";
import { SectionSideBySide } from "./sections/SectionSideBySide.js";
import { SectionStates } from "./sections/SectionStates.js";

const params = new URLSearchParams(window.location.search);

/**
 * The leakage contract from the test harness. When off, the host renders with
 * an empty candidate subtree so the assertion has a baseline to compare against.
 */
const candidateEnabled = params.get("candidate") !== "off";

/**
 * Section 8: locale switcher.
 *
 * Lives here rather than in a section file because every other section consumes
 * the locale it sets.
 */
function LocaleSwitcher({
  locale,
  onChange,
}: {
  readonly locale: LocaleCode;
  readonly onChange: (next: LocaleCode) => void;
}): ReactElement {
  return (
    <RadioGroup
      className="demo-field demo-locale"
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

export function App(): ReactElement {
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
    <HostShell
      title="Demo: Delta + React Aria"
      dir={demo.dir}
      pageHeader={
        /*
         * Cross-view navigation, in the frame's page-header slot. Host chrome on the
         * same terms as the known-issues box below: rendered OUTSIDE the candidate
         * wrapper and in BOTH candidate states, so no candidate stylesheet restyles
         * it and it cannot itself register as a leakage difference.
         *
         * `application` is listed but `island` is not: the island view is
         * Mangrove-only, and linking to an `island.html` this app does not ship
         * would be a dead end — the problem the switcher exists to fix.
         */
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "inventory")}
          pairingName="Adobe React Aria on Delta"
          otherHost={{ label: "React Aria on Mangrove", href: "../mangrove-react-aria/" }}
        />
      }
    >

      {/*
        * Rendered OUTSIDE the candidate wrapper and in BOTH candidate states.
        * Outside, so no candidate stylesheet restyles the warning box and every
        * demo's box reads identically. In both states, so it is present in the
        * leakage baseline as well as the candidate render and therefore cannot
        * itself register as a difference.
        */}
      <KnownIssues candidate="react-aria" host="delta" candidateName="Adobe React Aria" />

      {candidateEnabled ? (
        /**
         * I18nProvider drives React Aria's locale-aware behaviour: calendar
         * systems, date and number formatting, first day of week, and RTL for
         * Arabic. It is the library's documented entry point for this, so no
         * custom direction plumbing is needed inside components.
         */
        <I18nProvider locale={demo.bcp47}>
          <DemoContext.Provider value={demo}>
            <div className={`${TOKEN_SCOPE_CLASS} demo`} data-locale={locale}>
              <header className="demo__header">
                <h2 className="demo__title">React Aria Components</h2>
                <p className="demo__lede">
                  Every control below is React Aria, rendering the shared
                  fixtures inside the Delta host. The host elements above this
                  block are the leakage canaries and must be unaffected.
                </p>
                <LocaleSwitcher locale={locale} onChange={setLocale} />
              </header>

              <SectionForms />
              <SectionSelection />
              <SectionDates />
              <SectionOverlays />
              <SectionChrome />
              <SectionDataTable />
              <SectionStates />

              {/*
                THE 7-TO-9 JUMP IN THE HEADINGS IS DELIBERATE, AND SAYING SO
                HERE IS THE POINT.

                Requirements section 8 is Locale, and it is met — by the
                switcher in the header, which every section above consumes. It
                has no numbered block of its own because it is a page-level
                control, not a specimen. Renumbering to close the gap would hide
                that a specified section exists; a note only at the foot of the
                page arrives long after the reader has already read the jump as
                a mistake. So it sits where section 8 would have been.
              */}
              <div className="demo-section" id="section-8-note">
                <h3 className="demo-section__title">
                  8. Locale — no numbered section of its own
                </h3>
                <p className="demo__footnote">
                  Section 8 of the requirements (locale switcher, RTL, long
                  labels) is exercised by the locale switcher at the top of this
                  page, which drives every section above; Arabic applies RTL
                  through <code>I18nProvider</code>. It gets no block here
                  because it is page-wide rather than one specimen. The headings
                  run 7 to 9 for that reason — nothing was dropped or hidden.
                </p>
              </div>

              <SectionSideBySide />

              {/* Kept last so a screenshot of any section never captures it. */}
              <Button
                className="demo-button demo-button--ghost"
                onPress={() => window.scrollTo({ top: 0 })}
              >
                Back to top
              </Button>
            </div>
          </DemoContext.Provider>
        </I18nProvider>
      ) : null}
    </HostShell>
  );
}
