import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ensureProfile, handler, requireUserId } from "@/lib/server/helpers";
import { bookKey } from "@/lib/title-clean";

/**
 * Two-way merge sync.
 *
 * Every signed-in device sends its whole library and gets back the merged
 * result. Rules:
 *
 *   • Books are matched across devices by normalised title+author, because
 *     each device generates its own local ids.
 *   • When both sides know a record, the newer `updatedAt` wins.
 *   • Deletions are tombstoned, so an old device syncing a stale copy can't
 *     resurrect a book someone deleted on their phone.
 *
 * The server returns a complete, self-consistent snapshot — including
 * sessions rewritten to point at the canonical book ids — so the client can
 * simply adopt it.
 */

const MAX_BOOKS = 5000;
const MAX_SESSIONS = 50000;

interface InBook {
  clientId: string;
  title: string;
  author: string;
  coverUrl?: string;
  format: string;
  status: string;
  finishedAt?: string;
  rating?: number;
  review?: string;
  totalPages?: number;
  seriesName?: string;
  seriesNumber?: number;
  tags?: string[];
  addedAt?: string;
  updatedAt?: string;
}

interface InSession {
  clientId: string;
  bookClientId: string;
  date: string;
  minutes: number;
  pagesRead?: number;
  endPage?: number;
  updatedAt?: string;
}

interface InDeletion {
  kind: "book" | "session";
  key: string;
  deletedAt: string;
}

const EPOCH = "1970-01-01T00:00:00.000Z";

export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const inBooks: InBook[] = (Array.isArray(body.books) ? body.books : [])
    .slice(0, MAX_BOOKS)
    .filter((b: InBook) => b?.clientId && b?.title);
  const inSessions: InSession[] = (
    Array.isArray(body.sessions) ? body.sessions : []
  )
    .slice(0, MAX_SESSIONS)
    .filter(
      (s: InSession) =>
        s?.clientId &&
        /^\d{4}-\d{2}-\d{2}$/.test(s?.date ?? "") &&
        Number.isFinite(s?.minutes)
    );
  const inDeletions: InDeletion[] = (
    Array.isArray(body.deletions) ? body.deletions : []
  ).filter(
    (d: InDeletion) =>
      (d?.kind === "book" || d?.kind === "session") && d?.key && d?.deletedAt
  );

  // ── Tombstones first, so nothing deleted gets re-added below ──
  for (const d of inDeletions) {
    await db.syncDeletion.upsert({
      where: { userId_kind_key: { userId, kind: d.kind, key: d.key } },
      create: { userId, kind: d.kind, key: d.key, deletedAt: d.deletedAt },
      update: {},
    });
  }
  const tombstones = await db.syncDeletion.findMany({ where: { userId } });
  const deadBooks = new Map(
    tombstones.filter((t) => t.kind === "book").map((t) => [t.key, t.deletedAt])
  );
  const deadSessions = new Map(
    tombstones
      .filter((t) => t.kind === "session")
      .map((t) => [t.key, t.deletedAt])
  );

  // ── Books: merge by matchKey, newest edit wins ──
  const existingBooks = await db.syncedBook.findMany({ where: { userId } });
  const merged = new Map(existingBooks.map((b) => [b.matchKey, b]));

  for (const b of inBooks) {
    const key = bookKey(b.title, b.author);
    const stamp = b.updatedAt ?? b.addedAt ?? EPOCH;

    // Deleted elsewhere more recently than this copy was edited? Stay gone.
    const killed = deadBooks.get(key);
    if (killed && killed >= stamp) continue;

    const current = merged.get(key);
    if (current && (current.updatedAt ?? EPOCH) > stamp) continue;

    merged.set(key, {
      id: current?.id ?? "",
      userId,
      // Keep whichever device saw it first, so session links stay stable
      clientId: current?.clientId ?? b.clientId,
      matchKey: key,
      title: String(b.title).slice(0, 300),
      author: String(b.author ?? "").slice(0, 200),
      coverUrl:
        b.coverUrl && !b.coverUrl.startsWith("data:")
          ? String(b.coverUrl).slice(0, 500)
          : (current?.coverUrl ?? null),
      format: String(b.format ?? "physical"),
      status: String(b.status ?? "want"),
      finishedAt: b.finishedAt ?? null,
      rating: Number.isFinite(b.rating) ? Number(b.rating) : null,
      review: b.review ? String(b.review).slice(0, 2000) : null,
      totalPages: Number.isFinite(b.totalPages) ? Number(b.totalPages) : null,
      seriesName: b.seriesName ? String(b.seriesName).slice(0, 200) : null,
      seriesNumber: Number.isFinite(b.seriesNumber)
        ? Number(b.seriesNumber)
        : null,
      tags: b.tags?.length ? JSON.stringify(b.tags.slice(0, 12)) : null,
      addedAt: b.addedAt ?? current?.addedAt ?? null,
      updatedAt: stamp,
    });
  }
  for (const key of deadBooks.keys()) {
    const rec = merged.get(key);
    if (rec && (deadBooks.get(key) ?? "") >= (rec.updatedAt ?? EPOCH)) {
      merged.delete(key);
    }
  }

  // Local book id (from any device) → the canonical id we settled on
  const canonicalByClientId = new Map<string, string>();
  for (const b of merged.values()) canonicalByClientId.set(b.clientId, b.clientId);
  for (const b of inBooks) {
    const rec = merged.get(bookKey(b.title, b.author));
    if (rec) canonicalByClientId.set(b.clientId, rec.clientId);
  }

  // ── Sessions: merge by their own id, and repoint at canonical books ──
  const existingSessions = await db.syncedSession.findMany({ where: { userId } });
  const mergedSessions = new Map(existingSessions.map((s) => [s.clientId, s]));

  for (const s of inSessions) {
    const stamp = s.updatedAt ?? EPOCH;
    const killed = deadSessions.get(s.clientId);
    if (killed && killed >= stamp) continue;

    const current = mergedSessions.get(s.clientId);
    if (current && (current.updatedAt || EPOCH) > stamp) continue;

    mergedSessions.set(s.clientId, {
      id: current?.id ?? "",
      userId,
      clientId: s.clientId,
      bookClientId:
        canonicalByClientId.get(s.bookClientId) ?? s.bookClientId,
      date: s.date,
      minutes: Math.max(0, Math.round(s.minutes)),
      pagesRead: Math.max(0, Math.round(Number(s.pagesRead) || 0)),
      endPage: Number.isFinite(s.endPage) ? Number(s.endPage) : null,
      updatedAt: stamp,
    });
  }
  for (const key of deadSessions.keys()) mergedSessions.delete(key);

  // Drop sessions whose book is gone
  const liveBookIds = new Set([...merged.values()].map((b) => b.clientId));
  for (const [id, s] of mergedSessions) {
    if (!liveBookIds.has(s.bookClientId)) mergedSessions.delete(id);
  }

  // ── Persist the merged result ──
  const bookRows = [...merged.values()];
  const sessionRows = [...mergedSessions.values()];

  await db.$transaction([
    db.syncedBook.deleteMany({ where: { userId } }),
    db.syncedSession.deleteMany({ where: { userId } }),
    db.syncedBook.createMany({
      data: bookRows.map(({ id: _id, ...rest }) => rest),
    }),
    db.syncedSession.createMany({
      data: sessionRows.map(({ id: _id, ...rest }) => rest),
    }),
  ]);

  // ── Hand back a complete snapshot for the device to adopt ──
  return NextResponse.json({
    books: bookRows.map((b) => ({
      id: b.clientId,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl ?? undefined,
      format: b.format,
      status: b.status,
      finishedAt: b.finishedAt ?? undefined,
      rating: b.rating ?? undefined,
      review: b.review ?? undefined,
      totalPages: b.totalPages ?? undefined,
      seriesName: b.seriesName ?? undefined,
      seriesNumber: b.seriesNumber ?? undefined,
      tags: b.tags ? (JSON.parse(b.tags) as string[]) : undefined,
      addedAt: b.addedAt ?? new Date().toISOString(),
      updatedAt: b.updatedAt,
    })),
    sessions: sessionRows.map((s) => ({
      id: s.clientId,
      bookId: s.bookClientId,
      date: s.date,
      minutes: s.minutes,
      pagesRead: s.pagesRead || undefined,
      endPage: s.endPage ?? undefined,
      createdAt: s.updatedAt || new Date().toISOString(),
      updatedAt: s.updatedAt || undefined,
    })),
    deletions: tombstones.map((t) => ({
      kind: t.kind as "book" | "session",
      key: t.key,
      deletedAt: t.deletedAt,
    })),
    syncedAt: new Date().toISOString(),
  });
});
