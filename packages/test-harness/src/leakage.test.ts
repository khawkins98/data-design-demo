/**
 * Pins the URL handling in checkLeakage.
 *
 * An earlier version absolutised the URL against http://localhost, which
 * discarded Playwright's baseURL and navigated to port 80. The snapshot came
 * back empty and the assertion passed vacuously — the worst possible failure
 * mode for a check whose entire job is to catch something.
 *
 * withCandidate is exported solely so this can be tested without a browser.
 */

import { describe, expect, it } from "vitest";

import { withCandidate } from "./leakage.js";

describe("withCandidate", () => {
  it("keeps the URL relative so baseURL still applies", () => {
    // The regression: the result must never gain a scheme or host.
    expect(withCandidate("/?host=delta", "off")).not.toMatch(/^https?:\/\//);
    expect(withCandidate("/", "on")).not.toMatch(/^https?:\/\//);
  });

  it("preserves existing query parameters", () => {
    const result = withCandidate("/?host=delta", "off");
    const params = new URLSearchParams(result.split("?")[1]);
    expect(params.get("host")).toBe("delta");
    expect(params.get("candidate")).toBe("off");
  });

  it("adds the parameter when there is no query string", () => {
    expect(withCandidate("/", "on")).toBe("/?candidate=on");
  });

  it("overwrites an existing candidate parameter rather than duplicating it", () => {
    const result = withCandidate("/?candidate=on&host=mangrove", "off");
    const params = new URLSearchParams(result.split("?")[1]);
    expect(params.getAll("candidate")).toEqual(["off"]);
    expect(params.get("host")).toBe("mangrove");
  });

  it("preserves a subpath, as GitHub Pages deployments need", () => {
    expect(withCandidate("/data-design-demo/delta-mui/", "on")).toBe(
      "/data-design-demo/delta-mui/?candidate=on",
    );
  });

  it("produces different URLs for the two states", () => {
    // If these ever collided, both snapshots would be identical and the
    // assertion would always pass.
    expect(withCandidate("/?host=delta", "off")).not.toBe(
      withCandidate("/?host=delta", "on"),
    );
  });
});
