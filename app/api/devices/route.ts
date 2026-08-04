import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";

/**
 * Register this iPhone for push. Called after the reader grants permission;
 * Apple reissues tokens on reinstall, so this upserts.
 */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const token = String(body.token ?? "").trim();
  const platform = body.platform === "android" ? "android" : "ios";
  if (!token || token.length > 400) throw new ApiError(400, "Bad device token");

  await db.deviceToken.upsert({
    where: { token },
    create: { userId, token, platform },
    // A shared phone can change hands — always point the token at whoever
    // is signed in now, so pushes never go to the wrong person.
    update: { userId, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
});

/** Unregister — called on sign-out. */
export const DELETE = handler(async (req: NextRequest) => {
  await requireUserId();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token) await db.deviceToken.deleteMany({ where: { token } });
  return NextResponse.json({ ok: true });
});
