/**
 * The leakage diff is the one piece of harness logic with real branching, and
 * it is the thing eight demos will rely on to tell them whether their candidate
 * misbehaved. A false negative here would let a leaking library through.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_CANARIES_SELECTOR,
  CANARY_IDS,
  WATCHED_PROPERTIES,
  canarySelector,
  diffSnapshots,
} from "./canaries.js";

describe("canary contract", () => {
  it("covers every element the brief requires of a host shell", () => {
    // heading hierarchy, paragraph with links, three buttons, table, two cards,
    // left-hand navigation list.
    expect(CANARY_IDS).toContain("heading-1");
    expect(CANARY_IDS).toContain("heading-2");
    expect(CANARY_IDS).toContain("heading-3");
    expect(CANARY_IDS).toContain("paragraph");
    expect(CANARY_IDS).toContain("link");
    expect(CANARY_IDS).toContain("button-primary");
    expect(CANARY_IDS).toContain("button-secondary");
    expect(CANARY_IDS).toContain("button-disabled");
    expect(CANARY_IDS).toContain("table");
    expect(CANARY_IDS).toContain("card-first");
    expect(CANARY_IDS).toContain("card-second");
    expect(CANARY_IDS).toContain("nav");
  });

  it("has no duplicate ids", () => {
    expect(new Set(CANARY_IDS).size).toBe(CANARY_IDS.length);
  });

  it("builds selectors that match the shared attribute selector", () => {
    expect(canarySelector("heading-1")).toBe('[data-canary="heading-1"]');
    expect(ALL_CANARIES_SELECTOR).toBe("[data-canary]");
  });

  it("watches the properties a leaking global stylesheet would change", () => {
    // These four are the classic symptoms: a button reset, a box-sizing reset,
    // a body font override, a heading margin reset.
    expect(WATCHED_PROPERTIES).toContain("background-color");
    expect(WATCHED_PROPERTIES).toContain("box-sizing");
    expect(WATCHED_PROPERTIES).toContain("font-family");
    expect(WATCHED_PROPERTIES).toContain("margin-top");
  });
});

describe("diffSnapshots", () => {
  const baseline = {
    "button-primary": { color: "rgb(255, 255, 255)", "font-family": "Roboto" },
    paragraph: { color: "rgb(20, 35, 46)", "font-family": "Roboto" },
  };

  it("reports nothing when the candidate changed nothing", () => {
    expect(diffSnapshots(baseline, structuredClone(baseline))).toEqual([]);
  });

  it("reports a changed property with both values", () => {
    const after = structuredClone(baseline);
    after["button-primary"].color = "rgb(0, 0, 0)";

    expect(diffSnapshots(baseline, after)).toEqual([
      {
        canary: "button-primary",
        property: "color",
        before: "rgb(255, 255, 255)",
        after: "rgb(0, 0, 0)",
      },
    ]);
  });

  it("reports every difference, not just the first", () => {
    const after = structuredClone(baseline);
    after["button-primary"].color = "rgb(0, 0, 0)";
    after["button-primary"]["font-family"] = "Inter";
    after["paragraph"]["font-family"] = "Inter";

    expect(diffSnapshots(baseline, after)).toHaveLength(3);
  });

  it("treats a canary that disappeared as a failure", () => {
    const after: Record<string, Record<string, string>> = structuredClone(baseline);
    delete after["button-primary"];

    const differences = diffSnapshots(baseline, after);
    expect(differences).toEqual([
      {
        canary: "button-primary",
        property: "(element)",
        before: "present",
        after: "missing",
      },
    ]);
  });

  it("treats a canary that appeared as a failure too", () => {
    const after = structuredClone(baseline) as Record<string, Record<string, string>>;
    after["injected"] = { color: "rgb(1, 2, 3)" };

    expect(diffSnapshots(baseline, after)).toEqual([
      {
        canary: "injected",
        property: "(element)",
        before: "missing",
        after: "present",
      },
    ]);
  });

  it("does not report properties present only in the after snapshot", () => {
    // The baseline defines what we watch. An extra key after mounting is noise
    // from a browser default, not evidence of leakage.
    const before = { paragraph: { color: "rgb(20, 35, 46)" } };
    const after = {
      paragraph: { color: "rgb(20, 35, 46)", "letter-spacing": "normal" },
    };

    expect(diffSnapshots(before, after)).toEqual([]);
  });

  it("finds leakage on an empty-string to value transition", () => {
    const before = { paragraph: { "text-transform": "" } };
    const after = { paragraph: { "text-transform": "uppercase" } };

    expect(diffSnapshots(before, after)).toEqual([
      {
        canary: "paragraph",
        property: "text-transform",
        before: "",
        after: "uppercase",
      },
    ]);
  });
});
