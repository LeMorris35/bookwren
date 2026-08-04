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
import { notify } from "@/lib/server/apns";

/** Conversation list: one row per friend, newest activity first. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const messages = await db.message.findMany({
    where: { OR: [{ fromId: userId }, { toId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Fold the flat list into per-friend threads
  const threads = new Map<
    string,
    { lastMessage: (typeof messages)[number]; unread: number }
  >();
  for (const m of messages) {
    const other = m.fromId === userId ? m.toId : m.fromId;
    const entry = threads.get(other);
    const isUnread = m.toId === userId && m.readAt === null;
    if (!entry) {
      threads.set(other, { lastMessage: m, unread: isUnread ? 1 : 0 });
    } else if (isUnread) {
      entry.unread++;
    }
  }

  const users = await db.user.findMany({
    where: { id: { in: [...threads.keys()] } },
    select: publicUser,
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    threads: [...threads.entries()]
      .map(([otherId, t]) => ({
        user: byId.get(otherId) ?? null,
        unread: t.unread,
        lastMessage: {
          body: t.lastMessage.body,
          bookTitle: t.lastMessage.bookTitle,
          fromMe: t.lastMessage.fromId === userId,
          createdAt: t.lastMessage.createdAt,
        },
      }))
      .filter((t) => t.user !== null),
    totalUnread: [...threads.values()].reduce((sum, t) => sum + t.unread, 0),
  });
});

const MAX_BODY = 2000;

/** Send a message — with or without a book attached. */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const toUserId = String(body.toUserId ?? "");
  const text = String(body.body ?? "").trim().slice(0, MAX_BODY);
  const book = body.book as
    | {
        title?: string;
        author?: string;
        coverUrl?: string;
        rating?: number;
        review?: string;
      }
    | undefined;

  if (!toUserId) throw new ApiError(400, "Pick someone to message");
  if (!text && !book?.title) throw new ApiError(400, "Write something first");

  await assertNotBlocked(userId, toUserId);
  if (!(await areFriends(userId, toUserId))) {
    throw new ApiError(403, "You can only message accepted friends");
  }

  const cover = String(book?.coverUrl ?? "");
  const rating = Number(book?.rating);

  const message = await db.message.create({
    data: {
      fromId: userId,
      toId: toUserId,
      body: text || null,
      bookTitle: book?.title ? String(book.title).slice(0, 300) : null,
      bookAuthor: book?.author ? String(book.author).slice(0, 200) : null,
      // Photo covers are data: URIs — too big to copy into every message
      bookCover: cover && !cover.startsWith("data:") ? cover.slice(0, 500) : null,
      bookRating:
        Number.isFinite(rating) && rating >= 1 && rating <= 5
          ? Math.round(rating)
          : null,
      bookReview: book?.review ? String(book.review).slice(0, 2000) : null,
    },
  });

  // Tell them, if they're on a phone and haven't muted this
  const me = await db.user.findUnique({ where: { id: userId } });
  const name = me?.displayName.split(" ")[0] ?? "A friend";
  const unread = await db.message.count({
    where: { toId: toUserId, readAt: null },
  });
  await notify(toUserId, "social", {
    title: book?.title ? `${name} sent you a book 📖` : name,
    body: book?.title
      ? `${book.title}${text ? ` — “${text}”` : ""}`
      : text.slice(0, 140),
    path: `/messages/${userId}`,
    badge: unread,
    threadId: userId,
  });

  return NextResponse.json({ message });
});
