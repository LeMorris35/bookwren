import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ensureProfile, handler, requireUserId } from "@/lib/server/helpers";

const DEFAULTS = {
  social: true,
  challenges: true,
  streak: false,
  streakHour: 20,
  utcOffsetMinutes: 0,
};

export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);
  const prefs = await db.notificationPrefs.findUnique({ where: { userId } });
  return NextResponse.json({ prefs: prefs ?? { userId, ...DEFAULTS } });
});

export const PATCH = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);
  const body = await req.json();

  const data: Record<string, boolean | number> = {};
  for (const key of ["social", "challenges", "streak"] as const) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }
  if (Number.isFinite(body.streakHour)) {
    data.streakHour = Math.max(0, Math.min(23, Math.round(body.streakHour)));
  }
  // The phone tells us its offset so "8pm" means their 8pm, not UTC's
  if (Number.isFinite(body.utcOffsetMinutes)) {
    data.utcOffsetMinutes = Math.max(-840, Math.min(840, Math.round(body.utcOffsetMinutes)));
  }

  const prefs = await db.notificationPrefs.upsert({
    where: { userId },
    create: { userId, ...DEFAULTS, ...data },
    update: data,
  });
  return NextResponse.json({ prefs });
});
