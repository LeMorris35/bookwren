import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ApiError, handler, requireUserId } from "@/lib/server/helpers";

/** Accept or decline an incoming friend request. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  const body = await req.json();
  const friendshipId = String(body.friendshipId ?? "");
  const accept = Boolean(body.accept);

  const friendship = await db.friendship.findUnique({
    where: { id: friendshipId },
  });
  if (!friendship || friendship.addresseeId !== userId)
    throw new ApiError(404, "Request not found");
  if (friendship.status !== "pending")
    throw new ApiError(409, "Already handled");

  if (accept) {
    await db.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted" },
    });
  } else {
    await db.friendship.delete({ where: { id: friendshipId } });
  }
  return NextResponse.json({ ok: true });
});
