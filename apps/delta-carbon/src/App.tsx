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
import { HostShell } from "@undrr-eval/host-delta";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

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
    <HostShell title={demo.labels.appTitle} dir={demo.dir}>
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
            <SectionSideBySide />
          </DemoContext.Provider>
        </div>
      ) : null}
    </HostShell>
  );
}
