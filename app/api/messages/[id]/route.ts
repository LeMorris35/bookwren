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

/**
 * One conversation. Opening it marks their messages read, which is what
 * clears the unread badge in the header.
 */
export const GET = handler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const userId = await requireUserId();
    await ensureProfile(userId);
    const { id: friendId } = await ctx.params;

    await assertNotBlocked(userId, friendId);
    if (!(await areFriends(userId, friendId))) {
      throw new ApiError(403, "You can only message accepted friends");
    }

    const friend = await db.user.findUnique({
      where: { id: friendId },
      select: publicUser,
    });
    if (!friend) throw new ApiError(404, "Reader not found");

    const messages = await db.message.findMany({
      where: {
        OR: [
          { fromId: userId, toId: friendId },
          { fromId: friendId, toId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    });

    await db.message.updateMany({
      where: { fromId: friendId, toId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      friend,
      messages: messages.map((m) => ({
        id: m.id,
        fromMe: m.fromId === userId,
        body: m.body,
        book: m.bookTitle
          ? {
              title: m.bookTitle,
              author: m.bookAuthor,
              coverUrl: m.bookCover,
              rating: m.bookRating,
              review: m.bookReview,
            }
          : null,
        createdAt: m.createdAt,
      })),
    });
  }
);
