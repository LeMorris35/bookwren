import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";
import { isChallengeMetric } from "@/lib/challenge-metrics";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function makeInviteCode(): string {
  // No 0/O/1/I — these get read out loud in book clubs
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

/** Challenges I'm participating in. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const rows = await db.challengeParticipant.findMany({
    where: { userId },
    include: {
      challenge: { include: { _count: { select: { participants: true } } } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({
    challenges: rows.map((r) => ({
      id: r.challenge.id,
      name: r.challenge.name,
      metric: r.challenge.metric,
      target: r.challenge.target,
      startDate: r.challenge.startDate,
      endDate: r.challenge.endDate,
      inviteCode: r.challenge.inviteCode,
      participantCount: r.challenge._count.participants,
      isCreator: r.challenge.creatorId === userId,
    })),
  });
});

/** Create a challenge (creator auto-joins). */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const name = String(body.name ?? "").trim().slice(0, 60);
  const metric = isChallengeMetric(String(body.metric)) ? String(body.metric) : "minutes";
  const target = Math.round(Number(body.target));
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");

  if (!name) throw new ApiError(400, "Give your challenge a name");
  if (!Number.isFinite(target) || target < 1 || target > 1_000_000)
    throw new ApiError(400, "Set a goal number");
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate)
    throw new ApiError(400, "Check the start and end dates");

  // Retry on the (rare) invite-code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const challenge = await db.challenge.create({
        data: {
          creatorId: userId,
          name,
          metric,
          target,
          startDate,
          endDate,
          inviteCode: makeInviteCode(),
          participants: { create: { userId } },
        },
      });
      return NextResponse.json({ challenge });
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
  throw new ApiError(500, "Could not create challenge");
});
