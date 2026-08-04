import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ApiError, handler, requireUserId } from "@/lib/server/helpers";

/** Unfriend, or cancel an outgoing request. `id` is the friendship id. */
export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const friendship = await db.friendship.findUnique({ where: { id } });
    if (
      !friendship ||
      (friendship.requesterId !== userId && friendship.addresseeId !== userId)
    )
      throw new ApiError(404, "Not found");

    await db.friendship.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
);
