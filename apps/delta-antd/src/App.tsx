/**
 * Kitchen-sink page: Ant Design inside the Delta host shell.
 *
 * Section order is fixed by the brief so screenshots line up. Do not reorder.
 *
 * Only four things live here rather than in `@undrr-eval/integration-antd`: the
 * host shell, the ConfigProvider wiring, the locale switcher, and the side-by-side
 * section. Everything else is shared with the Mangrove app.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ConfigProvider, Segmented, Typography } from "antd";
import arEG from "antd/es/locale/ar_EG";
import deDE from "antd/es/locale/de_DE";
import enGB from "antd/es/locale/en_GB";
import frFR from "antd/es/locale/fr_FR";
import { StyleProvider } from "@ant-design/cssinjs";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/en-gb";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { HostShell } from "@undrr-eval/host-delta";
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
  undrrAntdTheme,
} from "@undrr-eval/integration-antd";
import type { DemoContextValue } from "@undrr-eval/integration-antd";

import { SectionSideBySide } from "./sections/SectionSideBySide.js";

const params = new URLSearchParams(window.location.search);
const candidateEnabled = params.get("candidate") !== "off";

/** antd's own locale packs, keyed to the fixture locales. */
const ANTD_LOCALES = { en: enGB, fr: frFR, de: deDE, ar: arEG } as const;
/** dayjs locale ids, which the date pickers read. */
const DAYJS_LOCALES = { en: "en-gb", fr: "fr", de: "de", ar: "ar" } as const;

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

  // dayjs is global state, so this is set as a side effect of the locale rather
  // than passed down. antd reads it inside the picker.
  useMemo(() => dayjs.locale(DAYJS_LOCALES[locale]), [locale]);

  return (
    <HostShell title={demo.labels.appTitle} dir={demo.dir}>
      {candidateEnabled ? (
        /*
         * `layer` wraps every antd rule in a CSS `@layer`, which is antd's own
         * containment mechanism and the only first-class one in this evaluation.
         * Unlayered CSS always beats layered CSS regardless of specificity, so
         * this makes antd lose conflicts to the host rather than win them — the
         * direction that keeps the host correct. Verified in the leakage and
         * host-repair assertions rather than taken on trust.
         */
        <StyleProvider layer>
          <ConfigProvider
            theme={undrrAntdTheme}
            locale={ANTD_LOCALES[locale]}
            direction={demo.dir}
            /*
             * Overlays render inside the candidate subtree instead of at
             * document.body, so `var(--undrr-*)` resolves. Portalled overlays
             * losing their tokens caught out three earlier runs; antd makes it
             * one prop rather than a class passed to every overlay.
             */
            getPopupContainer={(trigger) =>
              (trigger?.closest(".demo") as HTMLElement) ?? document.body
            }
          >
            <div className={`${TOKEN_SCOPE_CLASS} demo`}>
              <DemoContext.Provider value={demo}>
                <Typography.Title level={2} style={{ marginBottom: "0.5rem" }}>
                  Ant Design
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ maxWidth: "68ch" }}>
                  Every control below is Ant Design, rendering the shared fixtures
                  inside the Delta host. The host elements above are the leakage
                  canaries and must be unaffected.
                </Typography.Paragraph>

                <Segmented
                  value={locale}
                  onChange={(next) => setLocale(next as LocaleCode)}
                  options={LOCALES.map((entry) => ({ value: entry.code, label: entry.label }))}
                  aria-label="Locale"
                  style={{ marginBottom: "2rem" }}
                />

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
          </ConfigProvider>
        </StyleProvider>
      ) : (
        /* Leakage baseline: host shell, empty candidate subtree. */
        <div className={`${TOKEN_SCOPE_CLASS} demo`} />
      )}
    </HostShell>
  );
}
