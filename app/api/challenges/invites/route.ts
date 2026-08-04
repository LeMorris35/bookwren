import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  publicUser,
  requireUserId,
} from "@/lib/server/helpers";

/** Challenge invites waiting for me. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const invites = await db.challengeInvite.findMany({
    where: { toId: userId, status: "pending" },
    include: {
      challenge: { include: { _count: { select: { participants: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Who sent each one
  const senders = await db.user.findMany({
    where: { id: { in: [...new Set(invites.map((i) => i.fromId))] } },
    select: publicUser,
  });
  const byId = new Map(senders.map((s) => [s.id, s]));

  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      from: byId.get(i.fromId) ?? null,
      challenge: {
        id: i.challenge.id,
        name: i.challenge.name,
        metric: i.challenge.metric,
        target: i.challenge.target,
        startDate: i.challenge.startDate,
        endDate: i.challenge.endDate,
        participantCount: i.challenge._count.participants,
      },
    })),
  });
});

/** Accept (join) or decline an invite. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const inviteId = String(body.inviteId ?? "");
  const accept = body.accept === true;

  const invite = await db.challengeInvite.findUnique({
    where: { id: inviteId },
  });
  if (!invite || invite.toId !== userId) throw new ApiError(404, "Not found");

  if (!accept) {
    await db.challengeInvite.update({
      where: { id: inviteId },
      data: { status: "declined" },
    });
    return NextResponse.json({ ok: true, joined: false });
  }

  await db.$transaction([
    db.challengeParticipant.upsert({
      where: {
        challengeId_userId: { challengeId: invite.challengeId, userId },
      },
      create: { challengeId: invite.challengeId, userId },
      update: {},
    }),
    db.challengeInvite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    }),
  ]);

  return NextResponse.json({ ok: true, joined: true, challengeId: invite.challengeId });
});
