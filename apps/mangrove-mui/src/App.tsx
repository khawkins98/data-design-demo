/**
 * Kitchen-sink page: MUI Community inside the Mangrove host shell.
 *
 * Section order is fixed by the brief so screenshots line up. Do not reorder.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Box,
  ScopedCssBaseline,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ar, de, enGB, fr } from "date-fns/locale";
import { createTheme } from "@mui/material/styles";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import {
  DemoContext,
  SectionChrome,
  SectionDataTable,
  SectionDates,
  SectionForms,
  SectionOverlays,
  SectionSelection,
  SectionStates,
  labelsFor,
  MUI_LOCALES,
  undrrMuiTheme,
} from "@undrr-eval/integration-mui";
import type { DemoContextValue } from "@undrr-eval/integration-mui";
import { KnownIssues } from "@undrr-eval/known-issues";

import { SectionSideBySide } from "./sections/SectionSideBySide.js";

const params = new URLSearchParams(window.location.search);

/**
 * The leakage contract from the test harness. When off, the host renders with an
 * empty candidate subtree so the assertion has a baseline to compare against.
 */
const candidateEnabled = params.get("candidate") !== "off";

/** date-fns locales for the picker adapter, keyed to the fixture locales. */
const DATE_FNS_LOCALES = { en: enGB, fr, de, ar } as const;

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

  /**
   * MUI needs `direction` on the theme itself for RTL, not just a `dir`
   * attribute — its own components read it to flip margins and icon positions.
   * Unlike React Aria's I18nProvider, this is a theme rebuild per locale.
   */
  const theme = useMemo(
    // Locale pack LAST, so the direction patch cannot overwrite it. See the twin
    // in apps/delta-mui/src/App.tsx for why all three views must be configured
    // the same way.
    () => createTheme(undrrMuiTheme, { direction: demo.dir }, MUI_LOCALES[locale]),
    // `locale` too: en, fr and de share ltr, so direction alone would never
    // rebuild the theme between them.
    [demo.dir, locale],
  );

  return (
    <HostShell
      title={demo.labels.appTitle}
      dir={demo.dir}
      pageHeader={
        /*
         * Cross-view navigation, in the frame's page-header slot, on the same terms as
         * the known-issues box below: outside the candidate wrapper, in both candidate states. This
         * page is the inventory, so it is the one flagged `current`. `"application"`
         * is not listed — that view belongs to the Delta host, and the link to it
         * goes through `otherHost` instead.
         */
        <ViewSwitcher
          views={viewLinks(["island", "inventory"], "inventory")}
          pairingName="MUI Community on Mangrove"
          otherHost={{ label: "MUI on Delta", href: "../delta-mui/" }}
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
      <KnownIssues candidate="mui" host="mangrove" candidateName="MUI Community" />

      {candidateEnabled ? (
        <ThemeProvider theme={theme}>
          {/* Scoped, not global: see the note in main.tsx. */}
          <ScopedCssBaseline className={`${TOKEN_SCOPE_CLASS} demo`}>
            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              adapterLocale={DATE_FNS_LOCALES[locale]}
            >
              <DemoContext.Provider value={demo}>
                <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
                  MUI Community
                </Typography>
                <Typography sx={{ mb: 2, maxWidth: "68ch" }} color="text.secondary">
                  Every control below is MUI, rendering the shared fixtures inside
                  the Mangrove host. The host elements above are the leakage
                  canaries and must be unaffected.
                </Typography>

                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={locale}
                  onChange={(_event, next: LocaleCode | null) => {
                    if (next) setLocale(next);
                  }}
                  aria-label="Locale"
                  sx={{ mb: 4 }}
                >
                  {LOCALES.map((entry) => (
                    <ToggleButton key={entry.code} value={entry.code}>
                      {entry.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <SectionForms />
                <SectionSelection />
                <SectionDates />
                <SectionOverlays />
                <SectionChrome />
                <SectionDataTable />
                <SectionStates />

                {/*
                  THE 7-TO-9 JUMP IN THE HEADINGS IS DELIBERATE, AND SAYING SO
                  HERE IS THE POINT. Requirements section 8 is Locale, and it is
                  met — by the switcher above, which every section consumes. It
                  gets no numbered block because it is a page-level control, not
                  a specimen. Renumbering would hide that a specified section
                  exists, and a note at the foot of the page arrives long after
                  the reader has read the jump as a mistake. So it sits where 8
                  would be.
                */}
                <Box component="section" id="section-8-note" sx={{ mb: 8 }}>
                  <Typography variant="h3" component="h3" sx={{ mb: 2 }}>
                    8. Locale — no numbered section of its own
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: "68ch" }}>
                    Section 8 of the requirements (locale switcher, RTL, long
                    labels) is exercised by the locale switcher at the top of
                    this page, which drives every section above; Arabic applies
                    RTL through the theme&apos;s <code>direction</code>. It gets
                    no block here because it is page-wide rather than one
                    specimen. The headings run 7 to 9 for that reason — nothing
                    was dropped or hidden.
                  </Typography>
                </Box>

                <SectionSideBySide />
              </DemoContext.Provider>
            </LocalizationProvider>
          </ScopedCssBaseline>
        </ThemeProvider>
      ) : null}
    </HostShell>
  );
}
