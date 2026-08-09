/**
 * The view contract, shared by both host shells and both realistic frames.
 *
 * Lives here for the same reason `canaries.ts` does: it is a contract several
 * packages must agree on, and a copy per host is a copy that drifts.
 *
 * WHY THE LABELS READ THE WAY THEY DO. "Kitchen sink", "island" and "app" are
 * builder vocabulary. A reader deciding whether to adopt a library does not know
 * those words, and worse, "kitchen sink" reads as the canonical view purely
 * because it came first and owns `index.html`. The public labels below name each
 * view by the QUESTION IT ANSWERS, taken from the table in apps/README.md, and the
 * inventory carries a hint that demotes it explicitly: it proves capability, which
 * is not the same as proving adoption.
 */

/** A view a demo can link to. */
export interface ViewLink {
  /** Public label. Names the question, not the genre. */
  readonly label: string;
  /** Href relative to the app's own directory. */
  readonly href: string;
  /** One line on what this view is for. */
  readonly hint: string;
  /** Whether this is the view currently being shown. */
  readonly current?: boolean;
}

/** The three views, in the order a reader should meet them. */
export const VIEW_DEFINITIONS = Object.freeze({
  island: {
    label: "Inside a real page",
    href: "island.html",
    hint: "the candidate owns one region of a live Mangrove page",
  },
  application: {
    label: "A whole DELTA screen",
    href: "app.html",
    hint: "layout, navigation and a full records workflow",
  },
  inventory: {
    label: "Component inventory",
    href: "index.html",
    hint: "every component on one page - proves capability, not adoption",
  },
} as const);

export type ViewId = keyof typeof VIEW_DEFINITIONS;

/**
 * Builds the switcher list for one demo page.
 *
 * `available` is what that pairing actually ships, so a candidate without the
 * realistic layouts yet simply shows fewer links rather than dead ones. The
 * realistic views are listed BEFORE the inventory where they exist, which is the
 * other half of stopping the inventory from reading as the main event.
 */
export function viewLinks(available: readonly ViewId[], current: ViewId): ViewLink[] {
  const order: ViewId[] = ["island", "application", "inventory"];
  return order
    .filter((id) => available.includes(id))
    .map((id) => ({ ...VIEW_DEFINITIONS[id], current: id === current }));
}
