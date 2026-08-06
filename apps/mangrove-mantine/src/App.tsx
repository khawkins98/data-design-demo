/**
 * Kitchen-sink page: Mantine inside the UNDRR Mangrove host shell.
 *
 * Section order is fixed by the brief so screenshots line up across the eight
 * demos. Do not reorder.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  DirectionProvider,
  MantineProvider,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useDirection,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";

import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/de";
import "dayjs/locale/ar";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell, ViewSwitcher } from "@undrr-eval/host-mangrove";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";
import { KnownIssues } from "@undrr-eval/known-issues";

import { DemoContext, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { undrrMantineTheme } from "./theme.js";
import { SectionChrome } from "./sections/SectionChrome.js";
import { SectionDataTable } from "./sections/SectionDataTable.js";
import { SectionDates } from "./sections/SectionDates.js";
import { SectionForms } from "./sections/SectionForms.js";
import { SectionOverlays } from "./sections/SectionOverlays.js";
import { SectionSelection } from "./sections/SectionSelection.js";
import { SectionSideBySide } from "./sections/SectionSideBySide.js";
import { SectionStates } from "./sections/SectionStates.js";

/** dayjs locale ids, which are what `DatesProvider` and Mantine's dates want. */
const DAYJS_LOCALES: Record<LocaleCode, string> = {
  en: "en-gb",
  fr: "fr",
  de: "de",
  ar: "ar",
};

/**
 * Mantine's RTL plumbing, and the one place it needs help.
 *
 * `DirectionProvider` holds the direction in React context, but the only way to
 * change it is `setDirection()`, which writes `dir` to
 * `document.documentElement` — a mutation OUTSIDE the candidate subtree. Mantine
 * has no prop for "be RTL within this element": its own CSS is written as
 * `:where([dir="rtl"]) .m_xxx`, which matches from any ancestor, but the JS
 * context only reads the document element. So the locale switcher has to reach
 * the document to flip the library's internals.
 *
 * `HostShell` also sets `dir` on its own wrapper, so in Arabic the attribute
 * ends up on both — which is why the e2e RTL assertion counts two.
 */
function DirectionSync({ dir }: { readonly dir: "ltr" | "rtl" }): null {
  const { setDirection } = useDirection();
  useEffect(() => {
    setDirection(dir);
  }, [dir, setDirection]);
  return null;
}

export function App({
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

  let candidate: ReactNode = null;
  if (candidateEnabled) {
    candidate = (
      <DirectionProvider>
        <DirectionSync dir={demo.dir} />
        {/*
          `forceColorScheme="light"` because the token set has no dark palette
          and the host is light-only; without it Mantine reads localStorage and
          could render a dark subtree inside a light host between runs.
        */}
        <MantineProvider theme={undrrMantineTheme} forceColorScheme="light">
          <DatesProvider
            settings={{
              locale: DAYJS_LOCALES[locale],
              firstDayOfWeek: 1,
              weekendDays: [0, 6],
            }}
          >
            <DemoContext.Provider value={demo}>
              <div className={`${TOKEN_SCOPE_CLASS} demo`} data-locale={locale}>
                <header className="demo__header">
                  <Title order={2} mb="sm">
                    Mantine
                  </Title>
                  <Text className="demo__lede" mb="md">
                    Every control below is Mantine, rendering the shared fixtures
                    inside the Mangrove host. The host elements above this block
                    are the leakage canaries and must be unaffected.
                  </Text>

                  {/* Section 8: locale switcher. Native SegmentedControl. */}
                  <SegmentedControl
                    aria-label="Locale"
                    value={locale}
                    onChange={(next) => setLocale(next as LocaleCode)}
                    data={LOCALES.map((entry) => ({
                      value: entry.code,
                      label: entry.label,
                    }))}
                  />
                </header>

                <Stack gap="16">
                  <SectionForms />
                  <SectionSelection />
                  <SectionDates />
                  <SectionOverlays />
                  <SectionChrome />
                  <SectionDataTable />
                  <SectionStates />
                  <SectionSideBySide />
                </Stack>

                <Text size="sm" c="dimmed" mt="16">
                  Section 8 is the locale switcher above, which drives every
                  other section. Arabic applies RTL through Mantine&apos;s
                  <code> DirectionProvider</code>.
                </Text>
              </div>
            </DemoContext.Provider>
          </DatesProvider>
        </MantineProvider>
      </DirectionProvider>
    );
  }

  return (
    <HostShell title={demo.labels.appTitle} dir={demo.dir}>
      {/*
        * Cross-view navigation, outside the candidate wrapper for the same reason
        * the known-issues box is. `"application"` is deliberately absent from
        * `available`: the whole-DELTA-screen view is a Delta view and this is the
        * Mangrove host, so listing it would produce a dead link to an `app.html`
        * this app does not ship.
        */}
      <ViewSwitcher
        views={viewLinks(["island", "inventory"], "inventory")}
        pairingName="Mantine on Mangrove"
        otherHost={{ label: "Mantine on Delta", href: "../delta-mantine/" }}
      />

      {/*
        * Rendered OUTSIDE the candidate wrapper and in BOTH candidate states.
        * Outside, so no candidate stylesheet restyles the warning box and every
        * demo's box reads identically. In both states, so it is present in the
        * leakage baseline as well as the candidate render and therefore cannot
        * itself register as a difference.
        */}
      <KnownIssues candidate="mantine" host="mangrove" candidateName="Mantine" />

      {candidate}
    </HostShell>
  );
}
