/**
 * Kitchen-sink page: IBM Carbon inside the Mangrove host shell.
 *
 * Section order is fixed by the brief so screenshots line up across the eight
 * demos. Do not reorder.
 *
 * Three classes on the candidate wrapper, all load-bearing:
 *
 *   demo              the scope every rule in theme.css hangs off.
 *   undrr-tokens      declares `--undrr-*` here, since the token package scopes
 *                     them to a class rather than `:root`.
 *   cds--layer-one    Carbon's own layer class. In the scoped CSS build,
 *                     Carbon's `:root { --cds-layer: ... }` block becomes
 *                     `.demo :root` and stops matching; `.cds--layer-one`
 *                     declares the identical set, so this restores it. Inert in
 *                     the global build. See carbon-scoped.scss.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { RadioButton, RadioButtonGroup } from "@carbon/react";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";
import { KnownIssues } from "@undrr-eval/known-issues";

import { candidateEnabled, carbonCssMode } from "./css-mode.js";
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

const CANDIDATE_ON = candidateEnabled();
const CSS_MODE = carbonCssMode();

/**
 * Section 8: locale switcher.
 *
 * Lives here rather than in a section file because every other section consumes
 * the locale it sets. `RadioButtonGroup` is native Carbon and renders real
 * radio inputs, so Playwright's `getByRole("radio")` works — unlike the React
 * Aria run, which needed a label-clicking helper.
 */
function LocaleSwitcher({
  locale,
  onChange,
}: {
  readonly locale: LocaleCode;
  readonly onChange: (next: LocaleCode) => void;
}): ReactElement {
  return (
    <RadioButtonGroup
      className="demo-locale"
      name="locale"
      legendText="Locale"
      valueSelected={locale}
      onChange={(value) => onChange(String(value) as LocaleCode)}
    >
      {LOCALES.map((entry) => (
        <RadioButton
          key={entry.code}
          id={`locale-${entry.code}`}
          value={entry.code}
          labelText={entry.label}
        />
      ))}
    </RadioButtonGroup>
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
      title={demo.labels.appTitle}
      dir={demo.dir}
      pageHeader={
        /*
         * Cross-view navigation, in the frame's page-header slot. Host chrome on the
         * same terms as the known-issues box below: outside the candidate wrapper, present in both
         * candidate states. `"application"` is absent from `available` because the
         * whole-DELTA-screen view belongs to the Delta host and this app ships no
         * `app.html`.
         */
        <ViewSwitcher
          views={viewLinks(["island", "inventory"], "inventory")}
          pairingName="IBM Carbon on Mangrove"
          otherHost={{ label: "Carbon on Delta", href: "../delta-carbon/" }}
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

      <KnownIssues candidate="carbon" host="mangrove" candidateName="IBM Carbon" />

      {CANDIDATE_ON ? (
        <DemoContext.Provider value={demo}>
          <div
            className={`${TOKEN_SCOPE_CLASS} demo cds--layer-one`}
            data-locale={locale}
            data-carbon-css={CSS_MODE}
            dir={demo.dir}
          >
            <header className="demo__header">
              <h2 className="demo__title">IBM Carbon</h2>
              <p className="demo__lede">
                Every control below is Carbon, rendering the shared fixtures
                inside the Mangrove host. The host elements above this block are
                the leakage canaries and must be unaffected — for this pairing
                they are not, and that is the finding. Carbon CSS mode:{" "}
                <code>{CSS_MODE}</code>.
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
              THE 7-TO-9 JUMP IN THE HEADINGS IS DELIBERATE, AND SAYING SO HERE
              IS THE POINT. Requirements section 8 is Locale, and it is met — by
              the switcher in the header, which every section above consumes. It
              gets no numbered block because it is a page-level control, not a
              specimen. Renumbering would hide that a specified section exists;
              a note only at the foot of the page arrives long after the reader
              has read the jump as a mistake. So it sits where 8 would be.
            */}
            <div className="demo-section" id="section-8-note">
              <h3 className="demo-section__title">
                8. Locale — no numbered section of its own
              </h3>
              <p className="demo__footnote">
                Section 8 of the requirements (locale switcher, RTL, long labels)
                is exercised by the locale switcher at the top of this page,
                which drives every section above; Arabic sets{" "}
                <code>dir=&quot;rtl&quot;</code> on this wrapper and on the host
                shell. It gets no block here because it is page-wide rather than
                one specimen. The headings run 7 to 9 for that reason — nothing
                was dropped or hidden.
              </p>
            </div>

            <SectionSideBySide />
          </div>
        </DemoContext.Provider>
      ) : null}
    </HostShell>
  );
}
