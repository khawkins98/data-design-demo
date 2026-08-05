/**
 * The fixed "today".
 *
 * Date pickers render a highlighted current day, relative-time labels read
 * "3 days ago", and default months open around now. If demos call `new Date()`
 * they drift apart from each other and from yesterday's screenshots, and the
 * comparison stops being a comparison.
 *
 * Brief 1 forbids calling `new Date()` in demo code. Use `TODAY` instead.
 */

/** 2026-06-15T09:30:00Z. Midweek, mid-month, mid-year: no edge-case behaviour. */
export const TODAY_ISO = "2026-06-15T09:30:00.000Z";

/**
 * Returns a fresh Date each call so a demo mutating it cannot corrupt the
 * fixture for everything else on the page.
 */
export function today(): Date {
  return new Date(TODAY_ISO);
}

/** Timezone every demo formats in, so rendered times do not depend on the runner. */
export const FIXED_TIME_ZONE = "UTC";

/** A date-time range pre-selected in demos, expressed against TODAY. */
export const DEFAULT_RANGE = Object.freeze({
  startIso: "2026-05-01T00:00:00.000Z",
  endIso: "2026-06-15T23:59:00.000Z",
});
