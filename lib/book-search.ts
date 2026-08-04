// Unified book search: Open Library (millions of mainstream titles) plus
// BookWren's own reader-built catalog (indie and self-published books that
// no API carries). Both run in parallel; community hits rank first because
// a real reader put them there.

import { searchBooks as searchOpenLibrary } from "./openlibrary";

export interface UnifiedResult {
  key: string;
  title: string;
  author: string;
  /** Open Library URL, or a data: URI for reader-uploaded covers. */
  coverUrl?: string;
  pages?: number;
  firstPublishYear?: number;
  source: "openlibrary" | "community";
  /** How many BookWren readers have this (community results only). */
  readers?: number;
}

interface CommunityBook {
  id: string;
  title: string;
  author: string;
  coverData?: string | null;
  totalPages?: number | null;
  addedCount: number;
}

function dedupeKey(title: string, author: string): string {
  return `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`.replace(
    /\s+/g,
    " "
  );
}

export async function searchAllBooks(
  query: string,
  signal?: AbortSignal
): Promise<{ results: UnifiedResult[]; openLibraryFailed: boolean }> {
  const [community, openLibrary] = await Promise.allSettled([
    fetch(`/api/books?q=${encodeURIComponent(query)}`, { signal }).then((r) =>
      r.ok ? r.json() : { books: [] }
    ) as Promise<{ books: CommunityBook[] }>,
    searchOpenLibrary(query, signal),
  ]);

  const results: UnifiedResult[] = [];
  const seen = new Set<string>();

  if (community.status === "fulfilled") {
    for (const b of community.value.books ?? []) {
      seen.add(dedupeKey(b.title, b.author));
      results.push({
        key: `community:${b.id}`,
        title: b.title,
        author: b.author,
        coverUrl: b.coverData ?? undefined,
        pages: b.totalPages ?? undefined,
        source: "community",
        readers: b.addedCount,
      });
    }
  }

  if (openLibrary.status === "fulfilled") {
    for (const r of openLibrary.value) {
      if (seen.has(dedupeKey(r.title, r.author))) continue;
      results.push({
        key: r.key,
        title: r.title,
        author: r.author,
        coverUrl: r.coverUrl,
        pages: r.pages,
        firstPublishYear: r.firstPublishYear,
        source: "openlibrary",
      });
    }
  }

  return {
    results,
    openLibraryFailed: openLibrary.status === "rejected",
  };
}
