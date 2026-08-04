import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";

/** Join a challenge with its invite code. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) throw new ApiError(400, "Enter an invite code");

  const challenge = await db.challenge.findUnique({
    where: { inviteCode: code },
  });
  if (!challenge)
    throw new ApiError(404, "No challenge with that code — double-check it");

  await db.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: challenge.id, userId } },
    create: { challengeId: challenge.id, userId },
    update: {},
  });

  return NextResponse.json({ challengeId: challenge.id });
});
