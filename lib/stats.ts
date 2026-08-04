import type { AppData, BookFormat, ReadingSession } from "./types";
import { WORDS_PER_PAGE } from "./challenge-metrics";
import {
  addDays,
  lastNDays,
  monthPrefix,
  todayKey,
  weekRange,
  yearPrefix,
} from "./dates";

export function minutesOnDate(sessions: ReadingSession[], dateKey: string): number {
  return sessions
    .filter((s) => s.date === dateKey)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesInRange(
  sessions: ReadingSession[],
  start: string,
  end: string
): number {
  return sessions
    .filter((s) => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesToday(sessions: ReadingSession[]): number {
  return minutesOnDate(sessions, todayKey());
}

export function minutesThisWeek(sessions: ReadingSession[]): number {
  const { start, end } = weekRange(todayKey());
  return minutesInRange(sessions, start, end);
}

export function minutesThisMonth(sessions: ReadingSession[]): number {
  const prefix = monthPrefix(todayKey());
  return sessions
    .filter((s) => s.date.startsWith(prefix))
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesThisYear(sessions: ReadingSession[]): number {
  const prefix = yearPrefix(todayKey());
  return sessions
    .filter((s) => s.date.startsWith(prefix))
    .reduce((sum, s) => sum + s.minutes, 0);
}

/**
 * Current reading streak: consecutive days with at least one minute logged.
 * Today counts if read; an unread today doesn't break a streak that ran
 * through yesterday (you still have time to keep it alive).
 */
export function currentStreak(sessions: ReadingSession[]): number {
  const daysWithReading = new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date));
  const today = todayKey();
  let cursor = daysWithReading.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (daysWithReading.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Daily minute totals for the last `n` days, oldest first. */
export function dailyTotals(
  sessions: ReadingSession[],
  n: number
): { date: string; minutes: number }[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes);
  }
  return lastNDays(n).map((date) => ({ date, minutes: byDate.get(date) ?? 0 }));
}

/** Monthly minute totals for the current year, Jan..Dec. */
export function monthlyTotalsThisYear(
  sessions: ReadingSession[]
): { month: string; minutes: number }[] {
  const year = yearPrefix(todayKey());
  const out: { month: string; minutes: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const prefix = `${year}-${String(m).padStart(2, "0")}`;
    const minutes = sessions
      .filter((s) => s.date.startsWith(prefix))
      .reduce((sum, s) => sum + s.minutes, 0);
    out.push({ month: prefix, minutes });
  }
  return out;
}

/** Minutes split by book format (read vs listened, etc.). */
export function minutesByFormat(data: AppData): Record<BookFormat, number> {
  const formatOf = new Map(data.books.map((b) => [b.id, b.format]));
  const out: Record<BookFormat, number> = { physical: 0, ebook: 0, audiobook: 0 };
  for (const s of data.sessions) {
    const fmt = formatOf.get(s.bookId);
    if (fmt) out[fmt] += s.minutes;
  }
  return out;
}

export function booksFinishedThisYear(data: AppData): number {
  const year = yearPrefix(todayKey());
  return data.books.filter(
    (b) => b.status === "finished" && b.finishedAt?.startsWith(year)
  ).length;
}

// ── Pages & words ─────────────────────────────────────────────

export function pagesTotal(
  sessions: ReadingSession[],
  filter?: (date: string) => boolean
): number {
  return sessions.reduce(
    (sum, s) => (!filter || filter(s.date) ? sum + (s.pagesRead ?? 0) : sum),
    0
  );
}

export function pagesThisYear(sessions: ReadingSession[]): number {
  const year = yearPrefix(todayKey());
  return pagesTotal(sessions, (d) => d.startsWith(year));
}

/** Estimated words read (≈275 words per page). */
export function estimatedWords(pages: number): number {
  return pages * WORDS_PER_PAGE;
}

/**
 * Words read across sessions. Books with an exact `wordCount` use their real
 * words-per-page rate; everything else falls back to the 275/page estimate.
 * Returns the total plus whether any of it came from exact counts.
 */
export function wordsRead(
  data: AppData,
  filter?: (date: string) => boolean
): { words: number; anyExact: boolean } {
  const rateByBook = new Map<string, number>();
  let anyExact = false;
  for (const b of data.books) {
    if (b.wordCount && b.totalPages) {
      rateByBook.set(b.id, b.wordCount / b.totalPages);
    }
  }
  let words = 0;
  for (const s of data.sessions) {
    if (filter && !filter(s.date)) continue;
    const pages = s.pagesRead ?? 0;
    if (pages <= 0) continue;
    const rate = rateByBook.get(s.bookId);
    if (rate) anyExact = true;
    words += pages * (rate ?? WORDS_PER_PAGE);
  }
  return { words: Math.round(words), anyExact };
}

// ── Records (all-time bests) ──────────────────────────────────

/** Longest streak of consecutive reading days, ever. */
export function longestStreak(sessions: ReadingSession[]): number {
  const days = [...new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Count of distinct days with any reading logged. */
export function daysRead(sessions: ReadingSession[]): number {
  return new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date)).size;
}

/** Biggest single reading day: its date and total minutes. */
export function bestDay(
  sessions: ReadingSession[]
): { date: string; minutes: number } | null {
  const byDate = new Map<string, number>();
  for (const s of sessions) byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes);
  let best: { date: string; minutes: number } | null = null;
  for (const [date, minutes] of byDate) {
    if (!best || minutes > best.minutes) best = { date, minutes };
  }
  return best;
}

export function averageSessionMinutes(sessions: ReadingSession[]): number {
  if (sessions.length === 0) return 0;
  return sessions.reduce((sum, s) => sum + s.minutes, 0) / sessions.length;
}

/**
 * Favorite author: most books finished, ties broken by minutes spent.
 * Returns null until at least one book is finished or read.
 */
export function favoriteAuthor(
  data: AppData
): { author: string; books: number; minutes: number } | null {
  const byAuthor = new Map<string, { books: number; minutes: number }>();
  const minutesByBook = new Map<string, number>();
  for (const s of data.sessions) {
    minutesByBook.set(s.bookId, (minutesByBook.get(s.bookId) ?? 0) + s.minutes);
  }
  for (const b of data.books) {
    if (!b.author || b.author === "Unknown author") continue;
    const entry = byAuthor.get(b.author) ?? { books: 0, minutes: 0 };
    if (b.status === "finished") entry.books++;
    entry.minutes += minutesByBook.get(b.id) ?? 0;
    byAuthor.set(b.author, entry);
  }
  let best: { author: string; books: number; minutes: number } | null = null;
  for (const [author, { books, minutes }] of byAuthor) {
    if (books === 0 && minutes === 0) continue;
    if (
      !best ||
      books > best.books ||
      (books === best.books && minutes > best.minutes)
    ) {
      best = { author, books, minutes };
    }
  }
  return best;
}

/**
 * Average minutes on the days you actually read. Averaging over every
 * calendar day since you started makes a long gap look like "1m a day",
 * which tells the reader nothing useful.
 */
export function averageReadingDayMinutes(sessions: ReadingSession[]): number {
  const days = daysRead(sessions);
  if (days === 0) return 0;
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
  return total / days;
}

/** Total minutes per book, most-read first. */
export function topBooksByMinutes(
  data: AppData,
  limit: number
): { bookId: string; minutes: number }[] {
  const totals = new Map<string, number>();
  for (const s of data.sessions) {
    totals.set(s.bookId, (totals.get(s.bookId) ?? 0) + s.minutes);
  }
  return [...totals.entries()]
    .map(([bookId, minutes]) => ({ bookId, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit);
}
