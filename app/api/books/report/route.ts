import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";

/**
 * Reports needed before an entry auto-hides from search. Low, because the
 * catalog is shared and a bad entry (wrong cover, junk title) is visible to
 * everyone — better to hide early and let a moderator restore it.
 */
const AUTO_HIDE_THRESHOLD = 2;

export const REPORT_REASONS = [
  "wrong-cover",
  "wrong-details",
  "duplicate",
  "inappropriate",
  "spam",
  "other",
] as const;

export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const bookId = String(body.bookId ?? "");
  const reason = String(body.reason ?? "");
  const note = String(body.note ?? "").trim().slice(0, 300);

  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
    throw new ApiError(400, "Pick a reason for the report");
  }
  const book = await db.communityBook.findUnique({ where: { id: bookId } });
  if (!book) throw new ApiError(404, "That book isn't in the catalog");

  // One report per person per book — re-reporting just updates the reason
  await db.bookReport.upsert({
    where: { bookId_reporterId: { bookId, reporterId: userId } },
    create: { bookId, reporterId: userId, reason, note: note || null },
    update: { reason, note: note || null },
  });

  const count = await db.bookReport.count({
    where: { bookId, resolved: false },
  });
  // The person who added it reporting their own entry hides it immediately
  const ownEntry = book.addedBy === userId;
  if (!book.hidden && (ownEntry || count >= AUTO_HIDE_THRESHOLD)) {
    await db.communityBook.update({
      where: { id: bookId },
      data: { hidden: true },
    });
  }

  return NextResponse.json({ ok: true, reports: count });
});
