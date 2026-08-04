// One place that defines every challenge metric — labels, defaults, and how
// progress values are shown. Used by the create form, the leaderboard, and
// the challenge list, so adding a metric here lights it up everywhere.
import { formatMinutes } from "./dates";

/**
 * Word counts per book aren't published anywhere free, so "words" is an
 * estimate: pages × 275 (an industry-standard average for adult fiction).
 */
export const WORDS_PER_PAGE = 275;

export type ChallengeMetric = "minutes" | "books" | "pages" | "words" | "days";

export const CHALLENGE_METRICS: Record<
  ChallengeMetric,
  {
    label: string;
    /** How the goal is phrased in the create form. */
    goalHint: string;
    defaultTarget: number;
    format: (value: number) => string;
  }
> = {
  minutes: {
    label: "Minutes read",
    goalHint: "total minutes",
    defaultTarget: 300,
    format: (v) => formatMinutes(v),
  },
  books: {
    label: "Books finished",
    goalHint: "books",
    defaultTarget: 2,
    format: (v) => `${v} book${v === 1 ? "" : "s"}`,
  },
  pages: {
    label: "Pages read",
    goalHint: "pages",
    defaultTarget: 500,
    format: (v) => `${v.toLocaleString()} pages`,
  },
  words: {
    label: "Words read (est.)",
    goalHint: "words (≈275/page)",
    defaultTarget: 150_000,
    format: (v) => `${v.toLocaleString()} words`,
  },
  days: {
    label: "Days with reading",
    goalHint: "days",
    defaultTarget: 20,
    format: (v) => `${v} day${v === 1 ? "" : "s"}`,
  },
};

export const METRIC_KEYS = Object.keys(CHALLENGE_METRICS) as ChallengeMetric[];

export function isChallengeMetric(value: string): value is ChallengeMetric {
  return value in CHALLENGE_METRICS;
}
