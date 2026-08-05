/**
 * Shared fixture types.
 *
 * Every candidate demo imports these. Brief 1 forbids modifying this package,
 * so if a candidate needs a shape that is not here, that is a finding to report
 * rather than an edit to make.
 */

export type HazardType =
  | "flood"
  | "tropical-cyclone"
  | "drought"
  | "earthquake"
  | "landslide"
  | "wildfire"
  | "heatwave"
  | "storm-surge";

export type VerificationStatus = "verified" | "pending" | "disputed" | "withdrawn";

/**
 * One row of the tabular fixture. Column types are chosen to exercise the
 * formatting and sorting behaviour a data table has to get right:
 * string, long string, integer, float, ISO date, ISO datetime, enum, nullable.
 */
export interface LossRecord {
  /** Stable synthetic identifier, `DRR-0001` upward. */
  readonly id: string;
  /** Short string column. */
  readonly country: string;
  /** Short string column, always three characters. */
  readonly countryIso3: string;
  /** Enum column. */
  readonly hazardType: HazardType;
  /** ISO 8601 calendar date, no time component. */
  readonly eventDate: string;
  /** ISO 8601 datetime with timezone, always UTC. */
  readonly reportedAt: string;
  /** Integer column. Synthetic; not a real casualty figure. */
  readonly peopleAffected: number;
  /** Float column, two decimal places. */
  readonly economicLossUsdMillions: number;
  /** Longer string column that wraps at narrow viewports. */
  readonly dataSource: string;
  /** Enum status column, the natural candidate for a status chip or badge. */
  readonly verificationStatus: VerificationStatus;
  /** Long string column, roughly 140-200 characters. */
  readonly narrative: string;
  /** Nullable column. Null for every verified record. */
  readonly reviewNote: string | null;
}

export type LocaleCode = "en" | "fr" | "de" | "ar";

export type TextDirection = "ltr" | "rtl";

export interface LocaleMeta {
  readonly code: LocaleCode;
  readonly label: string;
  readonly dir: TextDirection;
  /** BCP 47 tag for Intl formatting. */
  readonly bcp47: string;
}

/**
 * Label keys shared by every demo. Keeping this a closed union means a demo
 * that invents its own copy fails typecheck rather than quietly diverging.
 */
export type LabelKey =
  | "appTitle"
  | "navOverview"
  | "navRecords"
  | "navSubmissions"
  | "navVerification"
  | "navSettings"
  | "colCountry"
  | "colHazard"
  | "colEventDate"
  | "colReportedAt"
  | "colPeopleAffected"
  | "colEconomicLoss"
  | "colDataSource"
  | "colStatus"
  | "colNarrative"
  | "colReviewNote"
  | "actionSave"
  | "actionCancel"
  | "actionDelete"
  | "actionFilter"
  | "actionClearFilters"
  | "actionExport"
  | "fieldCountry"
  | "fieldHazard"
  | "fieldEventDate"
  | "fieldReportingWindow"
  | "fieldDataSource"
  | "fieldNarrative"
  | "stateLoading"
  | "stateEmpty"
  | "stateError"
  | "stateSuccess"
  | "validationRequired"
  | "validationFormat"
  | "validationRange"
  | "validationServer"
  | "longVerificationBanner"
  | "longMethodologyNotice"
  | "longRetentionNotice"
  | "longAccessibilityNotice"
  | "longSubmissionGuidance";

export type LabelSet = Readonly<Record<LabelKey, string>>;

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export type ValidationCaseKind =
  | "required-empty"
  | "format-invalid"
  | "out-of-range"
  | "server-rejected";

export interface ValidationCase {
  readonly kind: ValidationCaseKind;
  /** Which form field the case applies to. */
  readonly field: string;
  /** The value that triggers it. Empty string for required-empty. */
  readonly input: string;
  /** Label key for the message to display. */
  readonly messageKey: LabelKey;
}
