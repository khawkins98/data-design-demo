/**
 * Known integration issues, and the box that surfaces them.
 *
 * Import only. Adding an issue means adding it to `issues.ts` with a link to the
 * file that measured it.
 */

export {
  KNOWN_ISSUES,
  SCOREABLE_OWNERS,
  SEVERITY_ORDER,
  issuesFor,
  openIssuesFor,
} from "./issues.js";
export type { IssueLink, IssueSeverity, KnownIssue } from "./issues.js";
export { KnownIssues } from "./KnownIssues.js";
export type { KnownIssuesProps } from "./KnownIssues.js";
