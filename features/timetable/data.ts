import type { SubjectColor } from "./types";

/**
 * Presentation-only palette for subject blocks. Everything else on the board
 * (days, periods, offerings, slots, external busy) comes live from the database
 * via the timetable service — there is intentionally no mock board data here.
 */
export const subjectColors: Record<SubjectColor, { bg: string; ink: string; bar: string; ring: string }> = {
  blue: { bg: "oklch(0.955 0.03 250)", ink: "oklch(0.4 0.13 254)", bar: "oklch(0.55 0.14 252)", ring: "oklch(0.55 0.14 252)" },
  teal: { bg: "oklch(0.955 0.035 195)", ink: "oklch(0.4 0.08 200)", bar: "oklch(0.55 0.1 195)", ring: "oklch(0.55 0.1 195)" },
  green: { bg: "oklch(0.955 0.04 150)", ink: "oklch(0.4 0.1 152)", bar: "oklch(0.55 0.12 150)", ring: "oklch(0.55 0.12 150)" },
  amber: { bg: "oklch(0.96 0.05 78)", ink: "oklch(0.46 0.11 66)", bar: "oklch(0.7 0.13 72)", ring: "oklch(0.7 0.13 72)" },
  purple: { bg: "oklch(0.955 0.035 300)", ink: "oklch(0.44 0.14 300)", bar: "oklch(0.55 0.16 300)", ring: "oklch(0.55 0.16 300)" },
  rose: { bg: "oklch(0.955 0.035 12)", ink: "oklch(0.48 0.16 15)", bar: "oklch(0.6 0.18 15)", ring: "oklch(0.6 0.18 15)" },
  cyan: { bg: "oklch(0.955 0.04 220)", ink: "oklch(0.42 0.1 225)", bar: "oklch(0.58 0.12 222)", ring: "oklch(0.58 0.12 222)" },
  indigo: { bg: "oklch(0.955 0.035 275)", ink: "oklch(0.42 0.14 278)", bar: "oklch(0.5 0.16 278)", ring: "oklch(0.5 0.16 278)" },
};
