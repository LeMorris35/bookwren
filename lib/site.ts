// Brand configuration — everything marketing-related lives here so the whole
// app can be re-branded from one file.

export const SITE = {
  /** App name. Change here to rename the whole app. */
  name: "BookWren",
  // Present tense only — never promise a price for all time. If BookWren
  // ever earns money, nothing here has to be walked back.
  tagline: "Track every minute you read.",
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
