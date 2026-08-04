import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";

export const USER_REPORT_REASONS = [
  "harassment",
  "inappropriate-content",
  "spam",
  "fake-account",
  "other",
] as const;

/**
 * Report and/or block another reader. Blocking is the immediate, personal
 * remedy — it deletes the friendship and any recommendations between the two
 * so contact stops right away, regardless of moderator review.
 */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const targetId = String(body.targetId ?? "");
  const reason = String(body.reason ?? "");
  const note = String(body.note ?? "").trim().slice(0, 300);
  const blocked = body.blocked !== false; // blocking is the default action

  if (!targetId || targetId === userId) {
    throw new ApiError(400, "Pick someone other than yourself");
  }
  if (!USER_REPORT_REASONS.includes(reason as (typeof USER_REPORT_REASONS)[number])) {
    throw new ApiError(400, "Pick a reason for the report");
  }
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) throw new ApiError(404, "Reader not found");

  await db.userReport.upsert({
    where: { reporterId_targetId: { reporterId: userId, targetId } },
    create: { reporterId: userId, targetId, reason, note: note || null, blocked },
    update: { reason, note: note || null, blocked },
  });

  if (blocked) {
    await db.$transaction([
      db.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: targetId },
            { requesterId: targetId, addresseeId: userId },
          ],
        },
      }),
      db.recommendation.deleteMany({
        where: {
          OR: [
            { senderId: userId, recipientId: targetId },
            { senderId: targetId, recipientId: userId },
          ],
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true, blocked });
});

/** Unblock — lifts the block but keeps the report on file for moderators. */
export const DELETE = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  const targetId = req.nextUrl.searchParams.get("targetId") ?? "";
  await db.userReport.updateMany({
    where: { reporterId: userId, targetId },
    data: { blocked: false },
  });
  return NextResponse.json({ ok: true });
});
