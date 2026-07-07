import { describe, it, expect } from "vitest";
import { euclideanDistance, findBestMatch, type MatchTemplate } from "@/features/faces/lib/match";

function vec(fill: number): number[] {
  return Array.from({ length: 128 }, () => fill);
}

describe("euclideanDistance", () => {
  it("is zero for identical vectors", () => {
    expect(euclideanDistance(vec(0.1), vec(0.1))).toBe(0);
  });

  it("computes the L2 distance", () => {
    expect(euclideanDistance([3, 0], [0, 4])).toBe(5);
  });
});

describe("findBestMatch", () => {
  const templates: MatchTemplate[] = [
    { studentId: "a", embedding: vec(0) },
    { studentId: "b", embedding: vec(1) },
  ];

  it("returns null for a malformed descriptor", () => {
    expect(findBestMatch([1, 2, 3], templates, 0.6)).toBeNull();
  });

  it("matches the closest template within threshold", () => {
    const query = vec(0.001); // essentially "a"
    const result = findBestMatch(query, templates, 0.6);
    expect(result?.studentId).toBe("a");
    expect(result?.distance).toBeLessThan(0.6);
  });

  it("returns null when nothing is within threshold", () => {
    // vec(0.5) is ~5.66 from vec(0) and vec(1) — far beyond 0.6.
    expect(findBestMatch(vec(0.5), templates, 0.6)).toBeNull();
  });

  it("returns null for empty template set", () => {
    expect(findBestMatch(vec(0), [], 0.6)).toBeNull();
  });
});
