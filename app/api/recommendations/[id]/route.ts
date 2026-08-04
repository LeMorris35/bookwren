import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ApiError, handler, requireUserId } from "@/lib/server/helpers";

/** Dismiss a recommendation (after adding it, or just not interested). */
export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const rec = await db.recommendation.findUnique({ where: { id } });
    if (!rec || rec.recipientId !== userId) throw new ApiError(404, "Not found");

    await db.recommendation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
);
