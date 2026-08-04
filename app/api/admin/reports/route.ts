import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ApiError, handler, requireUserId } from "@/lib/server/helpers";
import { isAdmin } from "@/lib/server/admin";

/** Non-moderators get a 404 — the dashboard shouldn't announce it exists. */
function assertAdmin(userId: string): void {
  if (!isAdmin(userId)) throw new ApiError(404, "Not found");
}

/** Every open report, newest first. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  assertAdmin(userId);

  const [bookReports, userReports] = await Promise.all([
    db.bookReport.findMany({
      where: { resolved: false },
      include: { book: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.userReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // Attach display names for the people involved in user reports
  const ids = [
    ...new Set(userReports.flatMap((r) => [r.reporterId, r.targetId])),
  ];
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, displayName: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    bookReports: bookReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt,
      book: {
        id: r.book.id,
        title: r.book.title,
        author: r.book.author,
        coverData: r.book.coverData,
        hidden: r.book.hidden,
        addedCount: r.book.addedCount,
      },
    })),
    userReports: userReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      blocked: r.blocked,
      createdAt: r.createdAt,
      reporter: byId.get(r.reporterId) ?? null,
      target: byId.get(r.targetId) ?? null,
    })),
  });
});

/** Moderator actions: hide/restore/delete a catalog entry, dismiss a report. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  assertAdmin(userId);

  const body = await req.json();
  const action = String(body.action ?? "");

  switch (action) {
    case "hide-book":
    case "restore-book": {
      const bookId = String(body.bookId ?? "");
      await db.communityBook.update({
        where: { id: bookId },
        data: { hidden: action === "hide-book" },
      });
      if (action === "restore-book") {
        await db.bookReport.updateMany({
          where: { bookId },
          data: { resolved: true },
        });
      }
      return NextResponse.json({ ok: true });
    }
    case "delete-book": {
      const bookId = String(body.bookId ?? "");
      const exists = await db.communityBook.findUnique({ where: { id: bookId } });
      if (!exists) throw new ApiError(404, "That entry is already gone");
      await db.communityBook.delete({ where: { id: bookId } });
      return NextResponse.json({ ok: true });
    }
    case "resolve-book-report": {
      await db.bookReport.update({
        where: { id: String(body.reportId ?? "") },
        data: { resolved: true },
      });
      return NextResponse.json({ ok: true });
    }
    case "resolve-user-report": {
      await db.userReport.update({
        where: { id: String(body.reportId ?? "") },
        data: { resolved: true },
      });
      return NextResponse.json({ ok: true });
    }
    default:
      throw new ApiError(400, "Unknown action");
  }
});
