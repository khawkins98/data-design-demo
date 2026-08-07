/**
 * These tests assert the guarantees the brief makes about the fixtures.
 *
 * They are not testing our own code so much as pinning the promises the eight
 * demo runs rely on. If one fails, a demo built against it is comparing
 * something different from its siblings.
 */

import { describe, expect, it } from "vitest";

import {
  LABELS,
  LOCALES,
  LONG_LABEL_KEYS,
  LOSS_RECORDS,
  NO_VALUE,
  OPTIONS_LARGE,
  OPTIONS_MEDIUM,
  OPTIONS_SMALL,
  REVIEW_GROUPS,
  TODAY_ISO,
  VALIDATION_CASES,
  WIZARD_STEPS,
  today,
} from "./index.js";
import type { LabelKey, LocaleCode } from "./types.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("loss records", () => {
  it("has exactly 250 rows", () => {
    expect(LOSS_RECORDS).toHaveLength(250);
  });

  it("has unique, stably formatted identifiers", () => {
    const ids = LOSS_RECORDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(250);
    expect(ids[0]).toBe("DRR-0001");
    expect(ids[249]).toBe("DRR-0250");
  });

  it("uses well-formed ISO dates and datetimes", () => {
    for (const record of LOSS_RECORDS) {
      expect(record.eventDate, record.id).toMatch(ISO_DATE);
      expect(record.reportedAt, record.id).toMatch(ISO_DATETIME);
    }
  });

  it("always reports on or after the event", () => {
    for (const record of LOSS_RECORDS) {
      const event = Date.parse(`${record.eventDate}T00:00:00.000Z`);
      expect(Date.parse(record.reportedAt), record.id).toBeGreaterThanOrEqual(event);
    }
  });

  it("keeps integer and float columns genuinely distinct", () => {
    for (const record of LOSS_RECORDS) {
      expect(Number.isInteger(record.peopleAffected), record.id).toBe(true);
    }
    // At least some float values must have a fractional part, or a demo could
    // render the column as integers and nobody would notice.
    const fractional = LOSS_RECORDS.filter(
      (r) => !Number.isInteger(r.economicLossUsdMillions),
    );
    expect(fractional.length).toBeGreaterThan(100);
  });

  it("exercises the nullable column in both directions", () => {
    const withNote = LOSS_RECORDS.filter((r) => r.reviewNote !== null);
    const withoutNote = LOSS_RECORDS.filter((r) => r.reviewNote === null);
    expect(withNote.length).toBeGreaterThan(20);
    expect(withoutNote.length).toBeGreaterThan(20);
  });

  it("covers every enum value in both enum columns", () => {
    const statuses = new Set(LOSS_RECORDS.map((r) => r.verificationStatus));
    expect([...statuses].sort()).toEqual([
      "disputed",
      "pending",
      "verified",
      "withdrawn",
    ]);

    const hazards = new Set(LOSS_RECORDS.map((r) => r.hazardType));
    expect(hazards.size).toBe(8);
  });

  it("includes long narratives that will wrap", () => {
    const long = LOSS_RECORDS.filter((r) => r.narrative.length > 120);
    expect(long.length).toBe(250);
  });

  it("ties null review notes to verified status", () => {
    for (const record of LOSS_RECORDS) {
      if (record.verificationStatus === "verified") {
        expect(record.reviewNote, record.id).toBeNull();
      } else {
        expect(record.reviewNote, record.id).not.toBeNull();
      }
    }
  });
});

describe("wizard steps", () => {
  it("names four steps, in the design file's order, with distinct ids", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual(["basics", "linked", "details", "review"]);
  });

  it("resolves every step label and sublabel in every locale", () => {
    // A stepper rendering "undefined" under step 3 in Arabic is the failure this
    // catches, and it is the kind that survives an English-only screenshot.
    for (const locale of LOCALES) {
      for (const step of WIZARD_STEPS) {
        expect(LABELS[locale.code][step.labelKey], `${locale.code}.${step.id}`).toBeTruthy();
        expect(
          LABELS[locale.code][step.optionalityKey],
          `${locale.code}.${step.id}.optionality`,
        ).toBeTruthy();
      }
    }
  });

  it("marks the first and last steps required, per the design file", () => {
    expect(WIZARD_STEPS.map((s) => s.optionalityKey)).toEqual([
      "stepRequired",
      "stepOptional",
      "stepOptional",
      "stepRequired",
    ]);
  });

  it("keeps empty values in the review fixture", () => {
    /*
     * Load-bearing. The design file shows four em-dashed values on the review
     * step, and a fixture that quietly filled them in would stop asking how each
     * library renders an absent value - which is most of what a review screen does.
     */
    const values = REVIEW_GROUPS.flatMap((g) => g.rows.map((r) => r.value));
    expect(values.filter((v) => v === NO_VALUE).length).toBeGreaterThanOrEqual(4);
  });

  it("resolves every review label in every locale, and every row has one value", () => {
    /*
     * The review labels are keys so they translate; the values are literals because
     * they are data. This pins both halves: a key that resolves to undefined would
     * render the string "undefined" as a field name, and a row with both a literal
     * and a key - or neither - would render ambiguously in five different ways
     * across five demos.
     */
    for (const locale of LOCALES) {
      for (const group of REVIEW_GROUPS) {
        expect(LABELS[locale.code][group.titleKey], `${locale.code}.${group.id}`).toBeTruthy();
        for (const row of group.rows) {
          expect(LABELS[locale.code][row.labelKey], `${locale.code}.${row.labelKey}`).toBeTruthy();
          expect(
            (row.value === undefined) !== (row.valueKey === undefined),
            `${group.id}.${row.labelKey} must set exactly one of value / valueKey`,
          ).toBe(true);
          if (row.valueKey) {
            expect(LABELS[locale.code][row.valueKey], `${locale.code}.${row.valueKey}`).toBeTruthy();
          }
        }
      }
    }
  });
});

describe("labels", () => {
  const codes = LOCALES.map((l) => l.code);

  it("covers four locales, one of them RTL", () => {
    expect(codes.sort()).toEqual(["ar", "de", "en", "fr"]);
    const rtl = LOCALES.filter((l) => l.dir === "rtl");
    expect(rtl.map((l) => l.code)).toEqual(["ar"]);
  });

  it("defines identical key sets in every locale", () => {
    const reference = Object.keys(LABELS.en).sort();
    for (const code of codes) {
      expect(Object.keys(LABELS[code]).sort(), code).toEqual(reference);
    }
  });

  it("has no empty label in any locale", () => {
    for (const code of codes) {
      for (const [key, value] of Object.entries(LABELS[code])) {
        expect(value.trim(), `${code}.${key}`).not.toBe("");
      }
    }
  });

  it("provides at least five labels over 60 characters in every locale", () => {
    for (const code of codes) {
      const long = Object.values(LABELS[code]).filter((v) => v.length > 60);
      expect(long.length, code).toBeGreaterThanOrEqual(5);
    }
  });

  it("guarantees the documented long keys really are long everywhere", () => {
    for (const code of codes) {
      for (const key of LONG_LABEL_KEYS) {
        expect(LABELS[code][key].length, `${code}.${key}`).toBeGreaterThan(60);
      }
    }
  });

  it("actually uses non-Latin script for Arabic and diacritics for fr/de", () => {
    // Guards against a well-meaning edit transliterating these back to ASCII,
    // which would silently remove the RTL and long-compound test material.
    expect(LABELS.ar.appTitle).toMatch(/[؀-ۿ]/);
    expect(Object.values(LABELS.fr).join(" ")).toMatch(/[àâçéèêëîïôùûü]/);
    expect(Object.values(LABELS.de).join(" ")).toMatch(/[äöüß]/);
  });

  it("keeps German longer than English overall, as the long-label test needs", () => {
    const total = (code: LocaleCode) => Object.values(LABELS[code]).join("").length;
    expect(total("de")).toBeGreaterThan(total("en"));
  });
});

describe("option lists", () => {
  it("has the three documented sizes", () => {
    expect(OPTIONS_SMALL).toHaveLength(8);
    expect(OPTIONS_MEDIUM).toHaveLength(40);
    expect(OPTIONS_LARGE).toHaveLength(400);
  });

  it("uses unique values within each list", () => {
    for (const list of [OPTIONS_SMALL, OPTIONS_MEDIUM, OPTIONS_LARGE]) {
      const values = list.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("includes at least one option label over 60 characters", () => {
    const all = [...OPTIONS_SMALL, ...OPTIONS_MEDIUM, ...OPTIONS_LARGE];
    expect(all.some((o) => o.label.length > 60)).toBe(true);
  });
});

describe("fixed today", () => {
  it("is a stable instant", () => {
    expect(TODAY_ISO).toBe("2026-06-15T09:30:00.000Z");
    expect(today().toISOString()).toBe(TODAY_ISO);
  });

  it("returns a fresh object each call so callers cannot corrupt it", () => {
    const a = today();
    a.setFullYear(1999);
    expect(today().toISOString()).toBe(TODAY_ISO);
  });
});

describe("validation cases", () => {
  it("covers all four kinds exactly once", () => {
    const kinds = VALIDATION_CASES.map((c) => c.kind).sort();
    expect(kinds).toEqual([
      "format-invalid",
      "out-of-range",
      "required-empty",
      "server-rejected",
    ]);
  });

  it("references label keys that exist in every locale", () => {
    for (const testCase of VALIDATION_CASES) {
      for (const locale of LOCALES) {
        const key: LabelKey = testCase.messageKey;
        expect(LABELS[locale.code][key], `${locale.code}.${key}`).toBeTruthy();
      }
    }
  });
});
