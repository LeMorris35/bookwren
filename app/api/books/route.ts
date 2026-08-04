import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  ApiError,
  ensureProfile,
  handler,
  requireUserId,
} from "@/lib/server/helpers";

/** Cover data URIs are capped so the shared catalog stays small and fast. */
const MAX_COVER_CHARS = 90_000; // ~65KB of image

export function slugFor(title: string, author: string): string {
  return `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`
    .replace(/\s+/g, " ")
    .slice(0, 400);
}

/**
 * Search the reader-built catalog. This is what makes indie and
 * self-published books findable — they'll never be in Open Library.
 */
export const GET = handler(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ books: [] });

  const books = await db.communityBook.findMany({
    where: {
      hidden: false,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ addedCount: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      author: true,
      coverData: true,
      totalPages: true,
      addedCount: true,
    },
  });

  return NextResponse.json({ books });
});

/**
 * Contribute a hand-added book to the shared catalog. Sign-in required so
 * every entry has an owner — keeps the shared space accountable.
 */
export const POST = handler(async (req: NextRequest) => {
  const userId = await requireUserId();
  await ensureProfile(userId);

  const body = await req.json();
  const title = String(body.title ?? "").trim().slice(0, 300);
  const author = String(body.author ?? "").trim().slice(0, 200);
  if (!title || !author) throw new ApiError(400, "Title and author are required");

  const coverData = String(body.coverData ?? "");
  if (coverData && !coverData.startsWith("data:image/")) {
    throw new ApiError(400, "Cover must be an uploaded image");
  }
  if (coverData.length > MAX_COVER_CHARS) {
    throw new ApiError(400, "That cover photo is too large");
  }

  const totalPages = Number(body.totalPages);
  const slug = slugFor(title, author);

  // Already in the catalog? Just count another reader.
  const existing = await db.communityBook.findUnique({ where: { slug } });
  if (existing) {
    const updated = await db.communityBook.update({
      where: { slug },
      data: {
        addedCount: { increment: 1 },
        // Fill in a cover if the original entry lacked one
        coverData: existing.coverData ?? (coverData || null),
        totalPages: existing.totalPages ?? (Number.isFinite(totalPages) && totalPages > 0 ? Math.round(totalPages) : null),
      },
    });
    return NextResponse.json({ book: updated, contributed: false });
  }

  const book = await db.communityBook.create({
    data: {
      title,
      author,
      slug,
      coverData: coverData || null,
      totalPages: Number.isFinite(totalPages) && totalPages > 0 ? Math.round(totalPages) : null,
      addedBy: userId,
    },
  });
  return NextResponse.json({ book, contributed: true });
});
