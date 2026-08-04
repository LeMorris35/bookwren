import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { notify } from "@/lib/server/apns";

/**
 * Evening streak nudges. Vercel Cron hits this hourly; we send only to the
 * readers whose chosen hour it currently is, who have a live streak, and who
 * haven't read yet today. Anything else would just be nagging.
 */
export const GET = handler;
export const POST = handler;

async function handler(req: NextRequest) {
  // Vercel signs cron requests; refuse anything else in production
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const nowUtcMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  const candidates = await db.notificationPrefs.findMany({
    where: { streak: true },
  });

  let sent = 0;
  for (const p of candidates) {
    // Is it their chosen hour, in their timezone?
    const localMinutes = (nowUtcMinutes + p.utcOffsetMinutes + 1440) % 1440;
    if (Math.floor(localMinutes / 60) !== p.streakHour) continue;

    // Their local calendar dates
    const localNow = new Date(Date.now() + p.utcOffsetMinutes * 60000);
    const key = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const today = key(localNow);
    const yesterday = key(new Date(localNow.getTime() - 86400000));

    const [readToday, readYesterday] = await Promise.all([
      db.syncedSession.findFirst({
        where: { userId: p.userId, date: today, minutes: { gt: 0 } },
      }),
      db.syncedSession.findFirst({
        where: { userId: p.userId, date: yesterday, minutes: { gt: 0 } },
      }),
    ]);

    // Already read today → nothing to save. No streak yesterday → nothing at risk.
    if (readToday || !readYesterday) continue;

    // How long is the streak they're about to lose?
    const recent = await db.syncedSession.findMany({
      where: { userId: p.userId, minutes: { gt: 0 } },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
      take: 400,
    });
    const days = new Set(recent.map((s) => s.date));
    let streak = 0;
    const cursor = new Date(localNow.getTime() - 86400000);
    while (days.has(key(cursor))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    if (streak === 0) continue;

    await notify(p.userId, "streak", {
      title: `Your ${streak}-day streak is waiting 🐦`,
      body:
        streak >= 7
          ? `${streak} days straight. A few minutes keeps it alive.`
          : "A few minutes of reading keeps it going.",
      path: "/timer",
    });
    sent++;
  }

  return NextResponse.json({ ok: true, checked: candidates.length, sent });
}
