/**
 * Canaries for the page chrome the realistic layouts add.
 *
 * Deliberately a SEPARATE contract from `CANARY_IDS`, not an extension of it.
 *
 * `CANARY_IDS` is pinned by `tests/host-parity.test.tsx`, which asserts the two
 * host shells render an identical element skeleton, identical canary order and
 * identical visible text. That assertion is what lets a difference between two
 * demos be attributed to the candidate library. The realistic layouts break
 * parity on purpose - a Mangrove page header is not a Delta application toolbar,
 * and forcing them to match would defeat the point of building them - so their
 * chrome cannot live in a contract that requires the hosts to agree.
 *
 * What the two contracts have in common is the leakage question: is this element
 * still rendering the way the host rendered it after the candidate mounts. The
 * frames therefore reuse the host shells' own `HostCanaries` block unchanged for
 * that, and add these ids only for the chrome the frames introduce.
 */

/**
 * Chrome canaries, per frame.
 *
 * Not every id appears in every frame. `MANGROVE_FRAME_CANARY_IDS` and
 * `DELTA_FRAME_CANARY_IDS` below say which, and the frames' own tests assert it,
 * so a frame cannot quietly stop rendering one.
 */
export const FRAME_CANARY_IDS = Object.freeze([
  /** Mangrove: the four-colour decoration bar above the masthead. */
  "frame-decoration",
  /** Mangrove: the masthead logo block. */
  "frame-logo",
  /** Both: prose immediately above the candidate region. */
  "frame-prose-before",
  /** Both: prose immediately below the candidate region. */
  "frame-prose-after",
  /** Delta: the application toolbar's own button. */
  "frame-toolbar-button",
  /** Delta: the `mg-`classed element proving Mangrove and Tailwind coexist. */
  "frame-mangrove-in-delta",
] as const);

/**
 * Note on what is NOT here: navigation links.
 *
 * Both frames render a navigation region, and `CANARY_IDS` already covers one
 * (`nav`, `nav-link`) because `HostShell` renders its nav outside the canary
 * block. The frames' navs ARE the host nav, so they carry those existing ids
 * rather than frame-specific duplicates. Double-labelling the same element would
 * mean two contracts asserting the same thing, and the second one drifting
 * unnoticed.
 */

export type FrameCanaryId = (typeof FRAME_CANARY_IDS)[number];

/** Chrome the Mangrove island frame must render. */
export const MANGROVE_FRAME_CANARY_IDS = Object.freeze([
  "frame-decoration",
  "frame-logo",
  "frame-prose-before",
  "frame-prose-after",
] as const satisfies readonly FrameCanaryId[]);

/** Chrome the Delta application frame must render. */
export const DELTA_FRAME_CANARY_IDS = Object.freeze([
  "frame-toolbar-button",
  "frame-mangrove-in-delta",
  "frame-prose-before",
  "frame-prose-after",
] as const satisfies readonly FrameCanaryId[]);

/** Attribute selector for one frame canary. */
export function frameCanarySelector(id: FrameCanaryId): string {
  return `[data-frame-canary="${id}"]`;
}

/** Attribute selector matching every frame canary at once. */
export const ALL_FRAME_CANARIES_SELECTOR = "[data-frame-canary]";
