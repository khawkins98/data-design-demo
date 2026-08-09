/**
 * Kitchen-sink page: IBM Carbon inside the Delta host shell.
 *
 * Section order is fixed by the brief so screenshots line up. Do not reorder.
 *
 * Carbon has no provider at all — no ThemeProvider, no LocalizationProvider, no
 * CacheProvider. Components read `--cds-*` custom properties from whatever
 * ancestor declares them, which is `.demo`. There is nothing to wrap and nothing
 * to rebuild on a locale change: `dir` on the host shell is the whole RTL story
 * for Carbon's own CSS, because it is authored with logical properties
 * (`padding-inline-start`, `inset-inline-end`) rather than left/right.
 *
 * The one exception is flatpickr inside DatePicker, which needs its locale passed
 * as a prop; see SectionDates.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ContentSwitcher, Switch } from "@carbon/react";

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
const candidateEnabled = params.get("candidate") !== "off";

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

  const selectedIndex = LOCALES.findIndex((entry) => entry.code === locale);

  return (
    <HostShell
      title="Demo: Delta + Carbon"
      dir={demo.dir}
      pageHeader={
        /*
         * Cross-view navigation, in the frame's page-header slot. Host chrome on the
         * same terms as the known-issues box below: outside the candidate wrapper, present in both
         * candidate states. `"island"` is absent from `available` because the
         * embedded-island view belongs to the Mangrove host and this app ships no
         * `island.html`.
         */
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "inventory")}
          pairingName="IBM Carbon on Delta"
          otherHost={{ label: "Carbon on Mangrove", href: "../mangrove-carbon/" }}
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

      <KnownIssues candidate="carbon" host="delta" candidateName="IBM Carbon" />

      {candidateEnabled ? (
        /* `.undrr-tokens` declares the UNDRR custom properties; `.demo` maps
           them onto Carbon's `--cds-*` names. Both must be on an ancestor of
           every Carbon component. */
        <div className={`${TOKEN_SCOPE_CLASS} demo`}>
          <DemoContext.Provider value={demo}>
            <h2 className="demo__heading">IBM Carbon</h2>
            <p className="demo__prose">
              Every control below is Carbon, rendering the shared fixtures inside
              the Delta host. The host elements above are the leakage canaries and
              must be unaffected. Carbon&apos;s prebuilt global stylesheet is not
              loaded — see EVIDENCE.md for what it does to those canaries when it
              is.
            </p>

            <ContentSwitcher
              selectedIndex={selectedIndex === -1 ? 0 : selectedIndex}
              onChange={({ name }) => {
                if (typeof name === "string") setLocale(name as LocaleCode);
              }}
              aria-label="Locale"
              className="demo__locale-switcher"
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

            <div style={{ height: "var(--undrr-space-8)" }} />

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
              the switcher above, which every section consumes. It gets no
              numbered block because it is a page-level control, not a specimen.
              Renumbering would hide that a specified section exists, and a note
              at the foot of the page arrives long after the reader has read the
              jump as a mistake. So it sits where 8 would be.
            */}
            <div className="demo__section" id="section-8-note">
              <h3 className="demo__heading">
                8. Locale — no numbered section of its own
              </h3>
              <p className="demo__prose">
                Section 8 of the requirements (locale switcher, RTL, long labels)
                is exercised by the locale switcher at the top of this page,
                which drives every section above; Arabic sets{" "}
                <code>dir=&quot;rtl&quot;</code> on this wrapper. It gets no
                block here because it is page-wide rather than one specimen. The
                headings run 7 to 9 for that reason — nothing was dropped or
                hidden.
              </p>
            </div>

            <SectionSideBySide />
          </DemoContext.Provider>
        </div>
      ) : null}
    </HostShell>
  );
}
