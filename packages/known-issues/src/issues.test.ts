/**
 * The known-issues box is the most prominent text on every demo page, so the
 * registry behind it gets the same treatment as the leakage assertion: pinned,
 * not trusted.
 *
 * The failure mode that matters is not a crash. It is showing a reader the wrong
 * pairing's issues, or an issue whose "measured" figure no longer matches the file
 * it cites, both of which look fine on screen.
 */

import { describe, expect, it } from "vitest";

import { KNOWN_ISSUES, SEVERITY_ORDER, issuesFor } from "./issues.js";

const CANDIDATES = ["react-aria", "mui", "carbon", "mantine", "antd"] as const;
const HOSTS = ["delta", "mangrove"] as const;

describe("known issues registry", () => {
  it("has a unique id for every issue", () => {
    const ids = KNOWN_ISSUES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scopes every issue to at least one candidate and one host", () => {
    for (const issue of KNOWN_ISSUES) {
      expect(issue.candidates.length, issue.id).toBeGreaterThan(0);
      expect(issue.hosts.length, issue.id).toBeGreaterThan(0);
    }
  });

  it("only names candidates and hosts that exist", () => {
    for (const issue of KNOWN_ISSUES) {
      for (const candidate of issue.candidates) {
        if (candidate === "*") continue;
        expect(CANDIDATES, `${issue.id} names an unknown candidate`).toContain(candidate);
      }
      for (const host of issue.hosts) {
        if (host === "*") continue;
        expect(HOSTS, `${issue.id} names an unknown host`).toContain(host);
      }
    }
  });

  it("gives every issue at least one link, and no empty hrefs", () => {
    for (const issue of KNOWN_ISSUES) {
      expect(issue.links.length, issue.id).toBeGreaterThan(0);
      for (const link of issue.links) {
        expect(link.href.length, `${issue.id} has an empty href`).toBeGreaterThan(0);
        expect(link.label.trim().length, `${issue.id} has an unlabelled link`).toBeGreaterThan(0);
      }
    }
  });

  it("writes details specific enough to be worth reading", () => {
    // A one-line warning with no figure in it is the thing this box exists to
    // avoid. Not a style rule: an unspecific entry cannot be checked against
    // evidence later, which is how stale claims survive.
    for (const issue of KNOWN_ISSUES) {
      expect(issue.detail.length, `${issue.id} detail is too short to be useful`).toBeGreaterThan(
        120,
      );
      expect(issue.title.length, issue.id).toBeGreaterThan(15);
    }
  });

  it("returns issues worst-first", () => {
    for (const candidate of CANDIDATES) {
      for (const host of HOSTS) {
        const ranks = issuesFor(candidate, host).map((i) => SEVERITY_ORDER.indexOf(i.severity));
        const sorted = [...ranks].sort((a, b) => a - b);
        expect(ranks, `${candidate} on ${host} is out of severity order`).toEqual(sorted);
      }
    }
  });

  it("shows every pairing at least one issue", () => {
    // If a pairing came back empty it would read as "no known problems", which is
    // never true here and would be the most misleading possible outcome.
    for (const candidate of CANDIDATES) {
      for (const host of HOSTS) {
        expect(issuesFor(candidate, host).length, `${candidate} on ${host}`).toBeGreaterThan(0);
      }
    }
  });

  it("does not leak one candidate's issues into another", () => {
    // The specific regression guarded against: MUI's RTL blocker must never
    // appear on a pairing that does not have it.
    const muiOnly = issuesFor("mui", "delta").map((i) => i.id);
    expect(muiOnly).toContain("mui-rtl-unfixable");

    for (const candidate of CANDIDATES) {
      if (candidate === "mui") continue;
      for (const host of HOSTS) {
        expect(issuesFor(candidate, host).map((i) => i.id)).not.toContain("mui-rtl-unfixable");
      }
    }
  });

  it("keeps host-scoped issues off the other host", () => {
    // antd's layer finding is specific to Mangrove; on Delta the opposite is true,
    // so showing it there would be actively wrong rather than merely noisy.
    expect(issuesFor("antd", "mangrove").map((i) => i.id)).toContain(
      "antd-layer-loses-to-mangrove",
    );
    expect(issuesFor("antd", "delta").map((i) => i.id)).not.toContain(
      "antd-layer-loses-to-mangrove",
    );

    expect(issuesFor("carbon", "mangrove").map((i) => i.id)).toContain("carbon-leakage-failure");
    expect(issuesFor("carbon", "delta").map((i) => i.id)).not.toContain("carbon-leakage-failure");
  });

  it("applies wildcard host issues to both hosts", () => {
    for (const host of HOSTS) {
      expect(issuesFor("mui", host).map((i) => i.id)).toContain("mui-rtl-unfixable");
    }
  });

  it("applies wildcard candidate issues to every candidate on that host", () => {
    for (const candidate of CANDIDATES) {
      expect(issuesFor(candidate, "mangrove").map((i) => i.id)).toContain(
        "mangrove-no-runtime-tokens",
      );
      expect(issuesFor(candidate, "delta").map((i) => i.id)).not.toContain(
        "mangrove-no-runtime-tokens",
      );
    }
  });

  it("records who each issue belongs to", () => {
    // A reader's first question is whose problem it is. Guarding this because it
    // is the field most likely to be forgotten when adding an entry.
    for (const issue of KNOWN_ISSUES) {
      expect(
        ["candidate", "host", "pairing", "this evaluation"],
        `${issue.id} has no valid owner`,
      ).toContain(issue.owner);
    }
  });
});
