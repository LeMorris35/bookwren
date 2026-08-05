// Core data types for ShelfMark.
// Everything lives in the user's browser (localStorage) — no accounts, no server.

export type BookFormat = "physical" | "ebook" | "audiobook";

export type BookStatus = "want" | "reading" | "finished" | "dnf";

export interface Book {
  id: string;
  title: string;
  author: string;
  /** Either an Open Library cover URL or a data: URI from a photo upload. */
  coverUrl?: string;
  totalPages?: number;
  /** Exact word count, if the reader knows it (no API provides this). */
  wordCount?: number;
  /** Custom series this book belongs to, e.g. "Throne of Glass". */
  seriesName?: string;
  /** Position in the series (book #). */
  seriesNumber?: number;
  format: BookFormat;
  status: BookStatus;
  /**
   * Reader-defined categories — genres, moods, anything ("scary love story",
   * "comfort reread"). Free-form so readers invent their own shelves.
   */
  tags?: string[];
  /** ISO timestamp when the book was added. */
  addedAt: string;
  /** Last edit on any device. Newer wins when two devices disagree. */
  updatedAt?: string;
  /** ISO timestamp when marked finished. */
  finishedAt?: string;
  /** Rating out of 5 stars, set when finished. */
  rating?: number;
  /** Your own written review — private unless you send it to a friend. */
  review?: string;
}

/** Reader-created series: just a name plus how many books it will have. */
export interface SeriesMeta {
  name: string;
  /** Total books planned in the series (shows "holes" for unread slots). */
  plannedCount?: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  /** Local calendar date the reading happened on, as YYYY-MM-DD. */
  date: string;
  minutes: number;
  /** Optional page the reader stopped on (physical/ebook). */
  endPage?: number;
  /** Pages covered in this session (computed from endPage progression). */
  pagesRead?: number;
  note?: string;
  createdAt: string;
  /** Last edit on any device. Newer wins when two devices disagree. */
  updatedAt?: string;
}

/**
 * A record of something deleted, so syncing an older device can't resurrect
 * it. Kept locally and on the server.
 */
export interface Deletion {
  kind: "book" | "session";
  /** Normalised title|author for books, the session id for sessions. */
  key: string;
  deletedAt: string;
}

export interface Settings {
  /** Daily reading goal in minutes. */
  dailyGoalMinutes: number;
  /** Books-per-year goal. */
  yearlyBookGoal: number;
}

export interface AppData {
  version: 1;
  books: Book[];
  sessions: ReadingSession[];
  settings: Settings;
  /** Metadata for reader-created series (keyed by name in books). */
  series?: SeriesMeta[];
  /** Tombstones, so deletes survive a sync from an older device. */
  deletions?: Deletion[];
  /** When this device last merged with the server. */
  lastSyncedAt?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 20,
  yearlyBookGoal: 12,
};

export const EMPTY_DATA: AppData = {
  version: 1,
  books: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
};

export const FORMAT_LABELS: Record<BookFormat, string> = {
  physical: "Physical book",
  ebook: "E-book",
  audiobook: "Audiobook",
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "Want to read",
  reading: "Reading",
  finished: "Finished",
  dnf: "Did not finish",
};
