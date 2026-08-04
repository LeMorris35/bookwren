import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  areFriends,
  assertNotBlocked,
  ensureProfile,
  handler,
  publicUser,
  requireUserId,
} from "@/lib/server/helpers";

/** Books friends have sent me. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const recs = await db.recommendation.findMany({
    where: { recipientId: userId },
    include: { sender: { select: publicUser } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ recommendations: recs });
});

/** Send a book to a friend. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const toUserId = String(body.toUserId ?? "");
  const title = String(body.title ?? "").trim().slice(0, 300);
  if (!toUserId || !title) throw new ApiError(400, "Missing book or friend");
  await assertNotBlocked(userId, toUserId);
  if (!(await areFriends(userId, toUserId)))
    throw new ApiError(403, "You can only send books to accepted friends");

  const coverUrl = String(body.coverUrl ?? "");
  const rec = await db.recommendation.create({
    data: {
      senderId: userId,
      recipientId: toUserId,
      title,
      author: String(body.author ?? "").trim().slice(0, 200),
      coverUrl: coverUrl && !coverUrl.startsWith("data:") ? coverUrl.slice(0, 500) : null,
      note: String(body.note ?? "").trim().slice(0, 280) || null,
    },
  });
  return NextResponse.json({ recommendation: rec });
});
