// Brand configuration — everything marketing-related lives here so the whole
// app can be re-branded from one file.

export const SITE = {
  /** App name. Change here to rename the whole app. */
  name: "BookWren",
  tagline: "Track every minute you read. Free, forever.",
  description:
    "A free reading tracker. Log your books, time your reading sessions, keep your streak alive, and share your stats — no account needed.",
  /** Where the app will live once deployed. Update after deploying to Vercel. */
  url: "https://bookwren.app",
  /** Parent brand shown in the footer and on share cards. */
  brand: {
    name: "LAM Media",
    url: "https://lammediaweb.com",
  },
} as const;
