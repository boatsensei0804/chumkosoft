/**
 * Pure face-descriptor matching — no I/O, so it is unit-testable and shared by
 * the scan service. face-api.js descriptors are 128-d; Euclidean distance below a
 * threshold means "same person" (0.6 is the library default; the kiosk uses a
 * slightly stricter value, see scan-service).
 */

export interface MatchTemplate {
  studentId: string;
  embedding: number[];
}

export interface MatchResult {
  studentId: string;
  distance: number;
}

export function euclideanDistance(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Returns the closest template within `threshold`, or null if none qualifies or
 * the descriptor is malformed. A tie keeps the first-seen template.
 */
export function findBestMatch(descriptor: readonly number[], templates: readonly MatchTemplate[], threshold: number): MatchResult | null {
  if (descriptor.length !== 128) return null;

  let best: MatchResult | null = null;
  for (const template of templates) {
    const distance = euclideanDistance(descriptor, template.embedding);
    if (distance <= threshold && (best === null || distance < best.distance)) {
      best = { studentId: template.studentId, distance };
    }
  }
  return best;
}
