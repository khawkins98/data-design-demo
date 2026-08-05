/**
 * Shared fixtures for the UNDRR data design system evaluation.
 *
 * Import only. Brief 1 forbids modifying this package: if a candidate demo
 * needs something that is not exported here, that is a finding to record in
 * EVIDENCE.md, not a change to make.
 */

export type {
  HazardType,
  LabelKey,
  LabelSet,
  LocaleCode,
  LocaleMeta,
  LossRecord,
  SelectOption,
  TextDirection,
  ValidationCase,
  ValidationCaseKind,
  VerificationStatus,
} from "./types.js";

export { LOSS_RECORDS } from "./records.generated.js";
export { LABELS, LOCALES, LONG_LABEL_KEYS } from "./labels.js";
export { OPTIONS_SMALL, OPTIONS_MEDIUM, OPTIONS_LARGE } from "./options.js";
export { TODAY_ISO, today, FIXED_TIME_ZONE, DEFAULT_RANGE } from "./time.js";
export { VALIDATION_CASES } from "./validation.js";
