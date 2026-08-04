import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ensureProfile, handler, requireUserId } from "@/lib/server/helpers";

const MAX_BOOKS = 1000;
const MAX_SESSIONS = 20000;

interface SyncBook {
  clientId: string;
  title: string;
  author: string;
  coverUrl?: string;
  format: string;
  status: string;
  finishedAt?: string;
}

interface SyncSession {
  clientId: string;
  bookClientId: string;
  date: string;
  minutes: number;
  pagesRead?: number;
}

/**
 * Push the browser's library up to the server. The client is the source of
 * truth, so we replace this user's mirror wholesale — simple and can't drift.
 */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const books: SyncBook[] = (Array.isArray(body.books) ? body.books : [])
    .slice(0, MAX_BOOKS)
    .filter((b: SyncBook) => b?.clientId && b?.title);
  const sessions: SyncSession[] = (
    Array.isArray(body.sessions) ? body.sessions : []
  )
    .slice(0, MAX_SESSIONS)
    .filter(
      (s: SyncSession) =>
        s?.clientId && /^\d{4}-\d{2}-\d{2}$/.test(s?.date ?? "") &&
        Number.isFinite(s?.minutes)
    );

  await db.$transaction([
    db.syncedBook.deleteMany({ where: { userId } }),
    db.syncedSession.deleteMany({ where: { userId } }),
    db.syncedBook.createMany({
      data: books.map((b) => ({
        userId,
        clientId: String(b.clientId),
        title: String(b.title).slice(0, 300),
        author: String(b.author ?? "").slice(0, 200),
        // Photo covers are data: URIs — too big to mirror, friends see a placeholder
        coverUrl:
          b.coverUrl && !b.coverUrl.startsWith("data:")
            ? String(b.coverUrl).slice(0, 500)
            : null,
        format: String(b.format),
        status: String(b.status),
        finishedAt: b.finishedAt ? String(b.finishedAt) : null,
      })),
    }),
    db.syncedSession.createMany({
      data: sessions.map((s) => ({
        userId,
        clientId: String(s.clientId),
        bookClientId: String(s.bookClientId),
        date: s.date,
        minutes: Math.max(0, Math.round(s.minutes)),
        pagesRead: Math.max(0, Math.round(Number(s.pagesRead) || 0)),
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, books: books.length, sessions: sessions.length });
});
