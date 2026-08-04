"use client";

import { useState } from "react";
import type { Book, BookFormat } from "@/lib/types";

const FORMAT_COLOR: Record<BookFormat, string> = {
  physical: "bg-chart-physical",
  ebook: "bg-chart-ebook",
  audiobook: "bg-chart-audiobook",
};

/**
 * Book cover image, or a generated "spine" placeholder when there's no cover.
 * Imported books point at Open Library's ISBN cover endpoint, which 404s for
 * anything it doesn't have — so a failed load quietly becomes the spine.
 */
export function BookCover({
  book,
  className = "",
}: {
  book: Pick<Book, "title" | "author" | "coverUrl" | "format">;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (book.coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- covers come from
      // openlibrary.org or data: URIs; next/image can't optimize either.
      <img
        src={book.coverUrl}
        alt={`Cover of ${book.title}`}
        onError={() => setFailed(true)}
        className={`aspect-[2/3] w-full rounded-lg border border-line object-cover shadow-sm ${className}`}
      />
    );
  }
  return (
    <div
      className={`aspect-[2/3] w-full overflow-hidden rounded-lg border border-line shadow-sm ${FORMAT_COLOR[book.format]} ${className}`}
      role="img"
      aria-label={`Cover of ${book.title}`}
    >
      <div className="flex h-full flex-col justify-between p-3">
        <div className="h-1.5 w-8 rounded-full bg-white/40" />
        <div>
          <p className="font-display text-sm font-semibold leading-snug text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
            {book.title}
          </p>
          <p className="mt-1 text-xs text-white/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] overflow-hidden">
            {book.author}
          </p>
        </div>
      </div>
    </div>
  );
}
