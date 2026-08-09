/**
 * The four steps of DELTA's add-disaster-event flow.
 *
 * Shared so that five libraries render the same wizard rather than five
 * different ones. The comparison is the product: if one demo shows three steps
 * and another five, a screenshot of the two says nothing about the libraries.
 *
 * WHY A WIZARD IS THE RIGHT THING TO ASK FOR. Every candidate ships buttons,
 * inputs and tables, which is why the component inventory came back with zero
 * unsupported requirements and discriminated between nothing. A stepper is
 * different: PrimeReact, the incumbent being replaced, ships one, and DELTA's own
 * add-event screen uses it. So "can this library do what DELTA already does" has
 * a concrete answer here, and the answers are not the same - some candidates ship
 * a stepper, and at least one ships nothing of the kind and has to have one
 * built. That difference is invisible in a component inventory and it is exactly
 * the kind of cost this evaluation exists to surface.
 *
 * `optionality` is from the design file, which marks steps 1 and 4 REQUIRED and
 * steps 2 and 3 OPTIONAL. It is here because it is a second line of text under a
 * step label, and a stepper that has nowhere to put it is a finding.
 */

import type { LabelKey } from "./types.js";

export interface WizardStep {
  /** Stable id for state, test selectors and screenshot names. */
  readonly id: string;
  /** Label key, so every locale's wording comes from `LABELS`. */
  readonly labelKey: LabelKey;
  /** Sublabel key: `stepRequired` or `stepOptional`. */
  readonly optionalityKey: Extract<LabelKey, "stepRequired" | "stepOptional">;
}

export const WIZARD_STEPS: readonly WizardStep[] = Object.freeze([
  { id: "basics", labelKey: "stepEventBasics", optionalityKey: "stepRequired" },
  { id: "linked", labelKey: "stepLinkedEvents", optionalityKey: "stepOptional" },
  { id: "details", labelKey: "stepAdditionalDetails", optionalityKey: "stepOptional" },
  { id: "review", labelKey: "stepReview", optionalityKey: "stepRequired" },
]);

/**
 * The review step's label/value pairs, from the design file's "Review and save"
 * cards.
 *
 * LABELS ARE KEYS, VALUES ARE LITERALS, and the split is the same one the rest of
 * these fixtures make: field names translate, data does not. The country names,
 * data sources and narratives in `LOSS_RECORDS` are English in every locale
 * because they are content; "Name (local)" is chrome and has to be Arabic on an
 * Arabic page. The first draft had both as literal strings, which left
 * "GLIDE NUMBER" sitting inside a fully mirrored Arabic card - and quietly
 * weakened the RTL evidence, because English text does not test Arabic wrapping.
 *
 * `valueKey` exists for the one value that IS chrome: "No spatial data defined"
 * is the system describing its own absence of data, not a datum.
 *
 * The em dashes are load-bearing. This step renders a part-completed submission,
 * which is what the design file shows, and a fixture that filled them in would
 * stop asking how each library renders an empty value - most of what a review
 * screen does.
 */
export interface ReviewRow {
  readonly labelKey: LabelKey;
  /** Literal value, for data. Exactly one of `value` / `valueKey` is set. */
  readonly value?: string;
  /** Label key, for a value that is really chrome. */
  readonly valueKey?: LabelKey;
}

export interface ReviewGroup {
  readonly id: string;
  readonly titleKey: LabelKey;
  readonly rows: readonly ReviewRow[];
}

/** The em dash the design file uses for "no value recorded". */
export const NO_VALUE = "—";

export const REVIEW_GROUPS: readonly ReviewGroup[] = Object.freeze([
  {
    id: "basics",
    titleKey: "stepEventBasics",
    rows: [
      { labelKey: "fieldNameLocal", value: "Hurricane Haroon" },
      { labelKey: "fieldNameEnglish", value: NO_VALUE },
      { labelKey: "fieldNationalId", value: NO_VALUE },
      { labelKey: "fieldGlideNumber", value: NO_VALUE },
      { labelKey: "fieldEventUuid", value: "ed7564a1-b2c3-4d5e-6f7g-8h9i0j1k2l3m" },
      { labelKey: "fieldOriginator", value: "Ministry of Interior" },
    ],
  },
  {
    id: "hazard",
    titleKey: "groupHazardDetails",
    rows: [
      { labelKey: "fieldHazard", value: "geological" },
      { labelKey: "fieldStart", value: "2026" },
      { labelKey: "fieldEnd", value: NO_VALUE },
    ],
  },
  {
    id: "location",
    titleKey: "groupLocation",
    rows: [
      { labelKey: "fieldGeographicLevels", value: "Country: National [id:country-1]" },
      { labelKey: "fieldSpatialFootprint", valueKey: "valueNoSpatialData" },
    ],
  },
]);
