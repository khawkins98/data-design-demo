/**
 * Kitchen-sink page: Mantine inside the Delta host shell.
 *
 * Section order is fixed by the brief so screenshots line up. Do not reorder.
 *
 * Provider stack, outermost first, and each one is load-bearing:
 *
 *   DirectionProvider   Mantine reads direction from React context, not from the
 *                       `dir` attribute, for anything it cannot express in CSS
 *                       logical properties. `detectDirection` is off because the
 *                       attribute lives on the host's wrapper div rather than on
 *                       <html>, where Mantine looks for it.
 *   MantineProvider     theme + cssVariablesResolver.
 *   DatesProvider       dayjs locale and first day of week for @mantine/dates.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  DirectionProvider,
  MantineProvider,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell } from "@undrr-eval/host-delta";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { DAYJS_LOCALES, DemoContext, labelsFor } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { undrrCssVariablesResolver, undrrMantineTheme } from "./theme.js";
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

  /**
   * Keeps portalled overlays in the current text direction.
   *
   * Mantine's `Portal` builds its container node inside an effect whose only
   * dependency is `target`, copying `className`, `style` and `id` from the props
   * it had AT MOUNT. A locale change re-renders the overlay's contents but never
   * revisits the container, so a direction class passed through `portalProps`
   * is correct on first paint and stale forever after.
   *
   * The container is outside the host's `dir="rtl"` wrapper, so there is nothing
   * for it to inherit from either — see src/overlay-class.ts.
   *
   * Hence this: after each locale change, stamp `dir` on the portal containers
   * this demo created. Scoped to `.demo-portal`, which only our own
   * `portalProps` applies, so it cannot touch host DOM. Recorded as an escape
   * hatch in evidence.json.
   */
  useEffect(() => {
    for (const node of document.querySelectorAll<HTMLElement>(".demo-portal")) {
      node.setAttribute("dir", demo.dir);
    }
  }, [demo.dir]);

  return (
    <HostShell title={demo.labels.appTitle} dir={demo.dir}>
      {candidateEnabled ? (
        <DirectionProvider initialDirection={demo.dir} detectDirection={false}>
          <MantineProvider
            theme={undrrMantineTheme}
            cssVariablesResolver={undrrCssVariablesResolver}
            forceColorScheme="light"
          >
            <DatesProvider
              settings={{ locale: DAYJS_LOCALES[locale], firstDayOfWeek: 1 }}
            >
              <DemoContext.Provider value={demo}>
                {/* The token scope class is needed here for the `var(--undrr-*)`
                    rules in demo.css, and again on every portal — see
                    src/overlay-class.ts. */}
                <div className={`${TOKEN_SCOPE_CLASS} demo`}>
                  <Stack gap="lg" mb="xl">
                    <div>
                      <Title order={2} fz="4xl">
                        Mantine
                      </Title>
                      <Text c="dimmed" maw="68ch" mt="xs">
                        Every control below is Mantine, rendering the shared fixtures
                        inside the Delta host. The host elements above are the leakage
                        canaries and must be unaffected.
                      </Text>
                    </div>

                    <SegmentedControl
                      aria-label="Locale"
                      value={locale}
                      onChange={(next) => setLocale(next as LocaleCode)}
                      data={LOCALES.map((entry) => ({
                        value: entry.code,
                        label: entry.label,
                      }))}
                      w="fit-content"
                      maw="100%"
                    />
                  </Stack>

                  <SectionForms />
                  <SectionSelection />
                  <SectionDates />
                  <SectionOverlays />
                  <SectionChrome />
                  <SectionDataTable />
                  <SectionStates />
                  <SectionSideBySide />
                </div>
              </DemoContext.Provider>
            </DatesProvider>
          </MantineProvider>
        </DirectionProvider>
      ) : null}
    </HostShell>
  );
}
