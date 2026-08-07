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
import { HostShell, ViewSwitcher } from "@undrr-eval/host-delta";
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
  undrrAntdTheme,
} from "@undrr-eval/integration-antd";
import type { DemoContextValue } from "@undrr-eval/integration-antd";
import { KnownIssues } from "@undrr-eval/known-issues";

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
    <HostShell
      title="Demo: Delta + Ant Design"
      dir={demo.dir}
      pageHeader={
        /*
         * Cross-view navigation, in the frame's page-header slot. Host chrome on the
         * same terms as the known-issues box below: outside the candidate wrapper, present in
         * both candidate states. This page is the inventory, so it is the one
         * flagged `current`. `"island"` is NOT listed — that view belongs to the
         * Mangrove host, and the link to it goes through `otherHost` instead. This
         * host ships no `island.html`, so listing it would be a dead link.
         */
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "inventory")}
          pairingName="Ant Design on Delta"
          otherHost={{ label: "Ant Design on Mangrove", href: "../mangrove-antd/" }}
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
      <KnownIssues candidate="antd" host="delta" candidateName="Ant Design" />

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

                {/*
                  THE 7-TO-9 JUMP IN THE HEADINGS IS DELIBERATE, AND SAYING SO
                  HERE IS THE POINT. Requirements section 8 is Locale
                  (`docs/requirements.md`: locale-switcher, rtl, long-labels) and
                  it is met — by the Segmented switcher above, which every section
                  below consumes. It gets no numbered block because it is a
                  page-level control rather than a specimen. Renumbering would
                  hide that a specified section exists, and a note at the foot of
                  the page arrives long after the reader has read the jump as a
                  mistake. So it sits where 8 would be.

                  Structure matches the numbered sections deliberately — a
                  `<section>` and a `Typography.Title level={3}`, as in
                  `packages/integration-antd/src/sections/*` — so it lands in the
                  heading outline a reader is scanning rather than beside it. The
                  id is `section-8-note`, NOT `section-8`: it is not a specimen
                  block and must not be picked up as one.
                */}
                <section id="section-8-note" style={{ marginBottom: "4rem" }}>
                  <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
                    8. Locale — no numbered section of its own
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ maxWidth: "68ch" }}>
                    Section 8 of the requirements (locale switcher, RTL, long labels) is
                    exercised by the locale switcher at the top of this page, which drives
                    every section above; Arabic applies RTL through{" "}
                    <Typography.Text code>ConfigProvider</Typography.Text>&apos;s{" "}
                    <Typography.Text code>direction</Typography.Text> prop, which carries it
                    into component internals as well. It gets no block here because it is
                    page-wide rather than one specimen. The headings run 7 to 9 for that
                    reason — nothing was dropped or hidden.
                  </Typography.Paragraph>
                </section>

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
