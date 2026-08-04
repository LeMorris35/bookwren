import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  handler,
  publicUser,
  requireUserId,
} from "@/lib/server/helpers";

/** Challenge details + live leaderboard. Participants only. */
export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const challenge = await db.challenge.findUnique({
      where: { id },
      include: { participants: { include: { user: { select: publicUser } } } },
    });
    if (!challenge) throw new ApiError(404, "Challenge not found");
    if (!challenge.participants.some((p) => p.userId === userId))
      throw new ApiError(403, "Join this challenge to see the leaderboard");

    const ids = challenge.participants.map((p) => p.userId);
    const inRange = { gte: challenge.startDate, lte: challenge.endDate };

    // Words are pages × 275 — see lib/challenge-metrics.ts for why.
    const WORDS_PER_PAGE = 275;
    const progressById = new Map<string, number>();

    if (challenge.metric === "books") {
      // Count finished books whose finish date falls in the window
      const finished = await db.syncedBook.findMany({
        where: { userId: { in: ids }, status: "finished" },
        select: { userId: true, finishedAt: true },
      });
      for (const b of finished) {
        const day = b.finishedAt?.slice(0, 10);
        if (day && day >= challenge.startDate && day <= challenge.endDate) {
          progressById.set(b.userId, (progressById.get(b.userId) ?? 0) + 1);
        }
      }
    } else if (challenge.metric === "days") {
      // Distinct days with any reading in the window
      const sessions = await db.syncedSession.findMany({
        where: { userId: { in: ids }, date: inRange, minutes: { gt: 0 } },
        select: { userId: true, date: true },
        distinct: ["userId", "date"],
      });
      for (const s of sessions) {
        progressById.set(s.userId, (progressById.get(s.userId) ?? 0) + 1);
      }
    } else {
      // minutes / pages / words all come from session sums
      const grouped = await db.syncedSession.groupBy({
        by: ["userId"],
        where: { userId: { in: ids }, date: inRange },
        _sum: { minutes: true, pagesRead: true },
      });
      for (const g of grouped) {
        const value =
          challenge.metric === "minutes"
            ? g._sum.minutes ?? 0
            : challenge.metric === "pages"
              ? g._sum.pagesRead ?? 0
              : (g._sum.pagesRead ?? 0) * WORDS_PER_PAGE;
        progressById.set(g.userId, value);
      }
    }

    const leaderboard = challenge.participants
      .map((p) => ({
        user: p.user,
        progress: progressById.get(p.userId) ?? 0,
        isYou: p.userId === userId,
      }))
      .sort((a, b) => b.progress - a.progress);

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        name: challenge.name,
        metric: challenge.metric,
        target: challenge.target,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        inviteCode: challenge.inviteCode,
        creatorId: challenge.creatorId,
      },
      leaderboard,
    });
  }
);

/** Leave a challenge. The last one out turns off the lights. */
export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    await db.challengeParticipant.deleteMany({
      where: { challengeId: id, userId },
    });
    const remaining = await db.challengeParticipant.count({
      where: { challengeId: id },
    });
    if (remaining === 0) {
      await db.challenge.delete({ where: { id } }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }
);
