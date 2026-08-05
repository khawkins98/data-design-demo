/**
 * The four validation cases every demo must render.
 *
 * These cover the states a form library has to express: a field the user left
 * blank, a value that is the wrong shape, a value in the right shape but out of
 * bounds, and a value the client accepted but the server refused. The last one
 * matters most, because it is the case libraries most often have no answer for
 * and where custom wrapper code tends to appear.
 */

import type { ValidationCase } from "./types.js";

export const VALIDATION_CASES: readonly ValidationCase[] = Object.freeze([
  {
    kind: "required-empty",
    field: "country",
    input: "",
    messageKey: "validationRequired",
  },
  {
    kind: "format-invalid",
    field: "eventDate",
    input: "15/06/2026",
    messageKey: "validationFormat",
  },
  {
    kind: "out-of-range",
    field: "peopleAffected",
    input: "9999999",
    messageKey: "validationRange",
  },
  {
    kind: "server-rejected",
    field: "dataSource",
    input: "Municipal loss register",
    messageKey: "validationServer",
  },
]);
