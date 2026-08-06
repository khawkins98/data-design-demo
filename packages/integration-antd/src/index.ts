/**
 * The host-independent part of the Ant Design integration.
 *
 * Built as a shared package from the start, rather than as two apps later
 * refactored. That is a deliberate change of method after axis A3 (see
 * `docs/decision-axes.md`): the MUI extraction showed 86% of an integration is
 * host-independent, so building the shared part first is the arrangement a real
 * multi-site deployment would use.
 *
 * The honest caveat, since building it this way could flatter the result: any
 * host-specific need that arose was pushed OUT to the consuming app and counted
 * there, never absorbed here to keep the number down. What each app still owns:
 *
 *   main.tsx               stylesheet imports and their order
 *   App.tsx                the host's HostShell, and ConfigProvider wiring
 *   demo.css               host repair
 *   SectionSideBySide.tsx  renders host markup beside candidate markup
 *
 * `demo-state.ts` here is byte-identical to the one in `integration-mui`. That
 * duplication is itself a finding and is noted in that file.
 */

export { DemoContext, LOAD_STATES, labelsFor, recordsForState, useDemo } from "./demo-state.js";
export type { DemoContextValue, LoadState } from "./demo-state.js";

export { CANDIDATE_BASE_STYLE, undrrAntdTheme } from "./theme.js";

export { useColumnResize } from "./use-column-resize.js";
export type { ColumnResize, ColumnWidths } from "./use-column-resize.js";

export { SectionChrome } from "./sections/SectionChrome.js";
export { SectionDataTable } from "./sections/SectionDataTable.js";
export { SectionDates } from "./sections/SectionDates.js";
export { SectionForms } from "./sections/SectionForms.js";
export { SectionOverlays } from "./sections/SectionOverlays.js";
export { SectionSelection } from "./sections/SectionSelection.js";
export { SectionStates } from "./sections/SectionStates.js";
