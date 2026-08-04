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
import { notify } from "@/lib/server/apns";

/**
 * Who can I invite? Returns my friends, each tagged with whether they're
 * already racing, already invited, or free to invite.
 */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    await ensureProfile(userId);
    const { id: challengeId } = await ctx.params;

    const participant = await db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (!participant) throw new ApiError(403, "Join this challenge first");

    const friendships = await db.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: publicUser },
        addressee: { select: publicUser },
      },
    });
    const friends = friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester
    );

    const [participants, invites] = await Promise.all([
      db.challengeParticipant.findMany({
        where: { challengeId },
        select: { userId: true },
      }),
      db.challengeInvite.findMany({
        where: { challengeId },
        select: { toId: true, status: true },
      }),
    ]);
    const joined = new Set(participants.map((p) => p.userId));
    const invited = new Map(invites.map((i) => [i.toId, i.status]));

    return NextResponse.json({
      friends: friends.map((f) => ({
        ...f,
        state: joined.has(f.id)
          ? "joined"
          : invited.get(f.id) === "pending"
            ? "invited"
            : invited.get(f.id) === "declined"
              ? "declined"
              : "none",
      })),
    });
  }
);

/** Invite a friend straight into the challenge. */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    await ensureProfile(userId);
    const { id: challengeId } = await ctx.params;

    const body = await req.json();
    const toUserId = String(body.toUserId ?? "");
    if (!toUserId) throw new ApiError(400, "Pick a friend to invite");

    const participant = await db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (!participant) throw new ApiError(403, "Join this challenge first");

    await assertNotBlocked(userId, toUserId);
    if (!(await areFriends(userId, toUserId))) {
      throw new ApiError(403, "You can only invite accepted friends");
    }

    const already = await db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId: toUserId } },
    });
    if (already) throw new ApiError(409, "They're already in this challenge");

    // Re-inviting someone who declined puts it back in their queue
    await db.challengeInvite.upsert({
      where: { challengeId_toId: { challengeId, toId: toUserId } },
      create: { challengeId, fromId: userId, toId: toUserId },
      update: { status: "pending", fromId: userId },
    });

    const [me, challenge] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.challenge.findUnique({ where: { id: challengeId } }),
    ]);
    await notify(toUserId, "challenges", {
      title: "You're invited to a challenge 🏆",
      body: `${me?.displayName.split(" ")[0] ?? "A friend"} invited you to ${challenge?.name ?? "a reading challenge"}`,
      path: "/challenges",
    });

    return NextResponse.json({ ok: true });
  }
);
