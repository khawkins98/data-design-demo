/**
 * The host-independent records capability used by both React Aria pairings.
 *
 * This is the A3 reuse experiment made concrete. Filters, table, pagination,
 * locale-aware data derivation and announcement policy live here once. Hosts
 * retain their frame, page composition and CSS because those are the deliberate
 * points where a shared capability meets a product environment.
 */
export {
  DemoContext,
  LOAD_STATES,
  filterRecords,
  labelsFor,
  recordsForState,
  sortRecords,
  useDemo,
} from "./demo-state.js";
export type { DemoContextValue, LoadState, SortColumn } from "./demo-state.js";

export { RecordsFilters } from "./records/RecordsFilters.js";
export { RecordsPagination } from "./records/RecordsPagination.js";
export { RecordsTable } from "./records/RecordsTable.js";
export {
  ANY_KEY,
  HAZARD_OPTIONS,
  PAGE_SIZES,
  STATUS_OPTIONS,
  useOverlayDir,
  useRecordsView,
  useSettled,
} from "./records/records-state.js";
export type { RecordsView, RecordsViewOptions } from "./records/records-state.js";
