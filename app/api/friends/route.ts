import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  assertNotBlocked,
  ensureProfile,
  handler,
  publicUser,
  requireUserId,
} from "@/lib/server/helpers";
import { notify } from "@/lib/server/apns";

/** Friend list plus incoming/outgoing requests. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const friendships = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: publicUser },
      addressee: { select: publicUser },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({
      friendshipId: f.id,
      user: f.requesterId === userId ? f.addressee : f.requester,
    }));
  const incoming = friendships
    .filter((f) => f.status === "pending" && f.addresseeId === userId)
    .map((f) => ({ friendshipId: f.id, user: f.requester }));
  const outgoing = friendships
    .filter((f) => f.status === "pending" && f.requesterId === userId)
    .map((f) => ({ friendshipId: f.id, user: f.addressee }));

  return NextResponse.json({ friends, incoming, outgoing });
});

/** Send a friend request by username. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const username = String(body.username ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!username) throw new ApiError(400, "Enter a username");

  const target = await db.user.findUnique({ where: { username } });
  if (!target) throw new ApiError(404, `No reader named @${username} yet`);
  if (target.id === userId)
    throw new ApiError(400, "That's you! Find a friend's username on their Friends page.");
  await assertNotBlocked(userId, target.id);

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted")
      throw new ApiError(409, `You're already friends with @${username}`);
    if (existing.requesterId === userId)
      throw new ApiError(409, "Request already sent — waiting on them");
    // They asked us first — accept instead of double-requesting
    await db.friendship.update({
      where: { id: existing.id },
      data: { status: "accepted" },
    });
    return NextResponse.json({ accepted: true });
  }

  await db.friendship.create({
    data: { requesterId: userId, addresseeId: target.id, status: "pending" },
  });

  const me = await db.user.findUnique({ where: { id: userId } });
  await notify(target.id, "social", {
    title: "New friend request 🐦",
    body: `${me?.displayName ?? "Someone"} (@${me?.username}) wants to read together`,
    path: "/friends",
  });

  return NextResponse.json({ requested: true });
});
