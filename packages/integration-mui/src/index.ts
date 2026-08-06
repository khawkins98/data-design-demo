/**
 * The host-independent part of the MUI integration.
 *
 * This package exists to answer axis A3 (see `docs/decision-axes.md`): if UNDRR
 * runs many sites, can one internal package hold the integration, or must every
 * site own a copy?
 *
 * For MUI the answer is measured rather than argued. Nine of the thirteen source
 * files in the two MUI demos were already code-identical once comments are
 * ignored - including the entire token mapping in `theme.ts` and seven of the
 * eight page sections - so those files moved here unchanged and both apps now
 * import them.
 *
 * What deliberately did NOT move, and why:
 *
 *   main.tsx                 stylesheet imports and their order, which is
 *                            host-specific and load-bearing
 *   App.tsx                  wires in the host's own `HostShell` component
 *   demo.css                 host repair - undoing what the host's element-level
 *                            CSS does to the candidate. On Delta this is 2 rules;
 *                            on Mangrove it is 4, because Mangrove styles bare
 *                            `input[type=...]` at (0,1,1) and beats MUI's own
 *                            slot class at (0,1,0)
 *   SectionSideBySide.tsx    renders host markup beside candidate markup, so it
 *                            is host-specific by definition, not by accident
 *
 * That residue is the honest per-site cost, and its shape matters more than its
 * size: three of the four are wiring, and the fourth is a function of how
 * aggressively the host styles bare elements rather than of MUI.
 */

export { DemoContext, LOAD_STATES, labelsFor, recordsForState, useDemo } from "./demo-state.js";
export type { DemoContextValue, LoadState } from "./demo-state.js";

export { undrrMuiTheme } from "./theme.js";

export { SectionChrome } from "./sections/SectionChrome.js";
export { SectionDataTable } from "./sections/SectionDataTable.js";
export { SectionDates } from "./sections/SectionDates.js";
export { SectionForms } from "./sections/SectionForms.js";
export { SectionOverlays } from "./sections/SectionOverlays.js";
export { SectionSelection } from "./sections/SectionSelection.js";
export { SectionStates } from "./sections/SectionStates.js";
