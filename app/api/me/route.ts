import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
  validateUsername,
} from "@/lib/server/helpers";
import { isAdmin } from "@/lib/server/admin";

/** Current user's profile (created on first call) plus notification counts. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  const profile = await ensureProfile(userId);
  const [pendingRequests, recommendations] = await Promise.all([
    db.friendship.count({ where: { addresseeId: userId, status: "pending" } }),
    db.recommendation.count({ where: { recipientId: userId } }),
  ]);
  // Drives the Admin tab in the nav. The API routes enforce this again
  // server-side, so this flag is only for showing/hiding the link.
  return NextResponse.json({
    profile,
    pendingRequests,
    recommendations,
    isAdmin: isAdmin(userId),
  });
});

/** Update username / display name. */
export const PATCH = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);
  const body = await req.json();

  const data: { username?: string; displayName?: string } = {};
  if (typeof body.username === "string") {
    const username = validateUsername(body.username);
    const taken = await db.user.findUnique({ where: { username } });
    if (taken && taken.id !== userId)
      throw new ApiError(409, "That username is taken");
    data.username = username;
  }
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim().slice(0, 40);
  }

  const profile = await db.user.update({ where: { id: userId }, data });
  return NextResponse.json({ profile });
});
