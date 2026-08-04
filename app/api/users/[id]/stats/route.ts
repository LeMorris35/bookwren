import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  areFriends,
  assertNotBlocked,
  handler,
  publicUser,
  requireUserId,
} from "@/lib/server/helpers";
import { addDays, monthPrefix, weekRange, yearPrefix } from "@/lib/dates";

/**
 * A friend's reading stats. Only visible to accepted friends (or yourself).
 * The viewer sends their local date as ?today= so "this week" isn't skewed
 * by the server's timezone.
 */
export const GET = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUserId();
    const { id: targetId } = await ctx.params;

    if (viewerId !== targetId) {
      await assertNotBlocked(viewerId, targetId);
      if (!(await areFriends(viewerId, targetId)))
        throw new ApiError(403, "You can only see stats of accepted friends");
    }

    const user = await db.user.findUnique({
      where: { id: targetId },
      select: publicUser,
    });
    if (!user) throw new ApiError(404, "Reader not found");

    const todayParam = req.nextUrl.searchParams.get("today") ?? "";
    const today = /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : new Date().toISOString().slice(0, 10);

    const [sessions, books] = await Promise.all([
      db.syncedSession.findMany({ where: { userId: targetId } }),
      db.syncedBook.findMany({ where: { userId: targetId } }),
    ]);

    const sum = (filter: (date: string) => boolean) =>
      sessions.reduce((t, s) => (filter(s.date) ? t + s.minutes : t), 0);

    const { start: weekStart, end: weekEnd } = weekRange(today);
    const daysWithReading = new Set(
      sessions.filter((s) => s.minutes > 0).map((s) => s.date)
    );
    let cursor = daysWithReading.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (daysWithReading.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }

    const year = yearPrefix(today);
    const shelfBook = (b: (typeof books)[number]) => ({
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      format: b.format,
    });

    // Favorite author: most finished books, ties broken by minutes
    const minutesByBook = new Map<string, number>();
    for (const s of sessions) {
      minutesByBook.set(
        s.bookClientId,
        (minutesByBook.get(s.bookClientId) ?? 0) + s.minutes
      );
    }
    const byAuthor = new Map<string, { books: number; minutes: number }>();
    for (const b of books) {
      if (!b.author || b.author === "Unknown author") continue;
      const entry = byAuthor.get(b.author) ?? { books: 0, minutes: 0 };
      if (b.status === "finished") entry.books++;
      entry.minutes += minutesByBook.get(b.clientId) ?? 0;
      byAuthor.set(b.author, entry);
    }
    let favoriteAuthor: { author: string; books: number } | null = null;
    let favBest = { books: 0, minutes: 0 };
    for (const [author, v] of byAuthor) {
      if (v.books === 0 && v.minutes === 0) continue;
      if (
        v.books > favBest.books ||
        (v.books === favBest.books && v.minutes > favBest.minutes)
      ) {
        favBest = v;
        favoriteAuthor = { author, books: v.books };
      }
    }

    return NextResponse.json({
      user,
      stats: {
        streak,
        minutesToday: sum((d) => d === today),
        minutesThisWeek: sum((d) => d >= weekStart && d <= weekEnd),
        minutesThisMonth: sum((d) => d.startsWith(monthPrefix(today))),
        minutesThisYear: sum((d) => d.startsWith(year)),
        totalMinutes: sum(() => true),
        pagesThisYear: sessions.reduce(
          (t, s) => (s.date.startsWith(year) ? t + s.pagesRead : t),
          0
        ),
        booksFinishedThisYear: books.filter(
          (b) => b.status === "finished" && b.finishedAt?.startsWith(year)
        ).length,
      },
      favoriteAuthor,
      currentlyReading: books.filter((b) => b.status === "reading").map(shelfBook),
      recentlyFinished: books
        .filter((b) => b.status === "finished" && b.finishedAt)
        .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1))
        .slice(0, 6)
        .map(shelfBook),
    });
  }
);
