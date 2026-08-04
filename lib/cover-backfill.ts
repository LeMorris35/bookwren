// Cover art for imported books.
//
// Two hard-won lessons live in here:
//
// 1. covers.openlibrary.org/b/isbn/… is rate-limited to 100 requests per IP
//    per 5 minutes, so a big import stalls out half-covered. Resolving ISBNs
//    in batches through the Books API returns *cover-ID* URLs instead, which
//    are exempt from that cap.
// 2. Goodreads writes titles as "Fourth Wing (The Empyrean, #1)". Searching
//    that exact string returns ZERO results — which is why ~800 of one
//    reader's 1,400 books came back bare. Always search the cleaned title.

import { titleCandidates } from "./title-clean";

const BATCH_SIZE = 50;
const PAUSE_MS = 400; // well under the documented ceiling
const SEARCH_PAUSE_MS = 1100; // search API asks ~1 req/sec when unidentified

export interface CoverTarget {
  id: string;
  isbn?: string;
  title?: string;
  author?: string;
}

export interface BackfillStats {
  found: number;
  checked: number;
  /** Requests Apple/OpenLibrary refused — usually rate limiting. */
  throttled: number;
}

interface BooksApiEntry {
  cover?: { small?: string; medium?: string; large?: string };
}

interface SearchDoc {
  cover_i?: number;
}

/** First result that actually has a cover, trying progressively looser queries. */
async function searchForCover(
  title: string,
  author: string | undefined,
  onThrottle: () => void
): Promise<string | null> {
  const cleanAuthor =
    author && author !== "Unknown author" ? author.split(",")[0].trim() : "";

  for (const candidate of titleCandidates(title)) {
    // With the author first (precise), then without (author spellings differ:
    // "J.K. Rowling" vs "J. K. Rowling")
    const attempts: Record<string, string>[] = cleanAuthor
      ? [{ title: candidate, author: cleanAuthor }, { title: candidate }]
      : [{ title: candidate }];

    for (const attempt of attempts) {
      try {
        const params = new URLSearchParams({
          ...attempt,
          limit: "5",
          fields: "cover_i",
        });
        const res = await fetch(`https://openlibrary.org/search.json?${params}`);
        if (res.status === 429 || res.status >= 500) {
          onThrottle();
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        if (!res.ok) continue;
        const data: { docs?: SearchDoc[] } = await res.json();
        // Take the first edition that has art, not just the first edition
        const withCover = data.docs?.find((d) => d.cover_i);
        if (withCover?.cover_i) {
          return `https://covers.openlibrary.org/b/id/${withCover.cover_i}-M.jpg`;
        }
      } catch {
        // offline or blocked — fall through to the next attempt
      }
      await new Promise((r) => setTimeout(r, SEARCH_PAUSE_MS));
    }
  }
  return null;
}

/**
 * Resolve covers, reporting each as it arrives so the UI fills in
 * progressively. Never throws — a missing cover just leaves the placeholder.
 */
export async function backfillCovers(
  targets: CoverTarget[],
  onCover: (bookId: string, coverUrl: string) => void,
  onProgress?: (done: number, total: number) => void,
  shouldStop?: () => boolean
): Promise<BackfillStats> {
  let done = 0;
  let found = 0;
  let throttled = 0;
  const total = targets.length;
  const stillMissing: CoverTarget[] = [];

  // Pass 1 — batched ISBN lookups: fast and effectively unlimited
  const withIsbn = targets.filter((t) => t.isbn && t.isbn.length >= 10);
  const withoutIsbn = targets.filter((t) => !t.isbn || t.isbn.length < 10);

  for (let i = 0; i < withIsbn.length; i += BATCH_SIZE) {
    if (shouldStop?.()) return { found, checked: done, throttled };
    const batch = withIsbn.slice(i, i + BATCH_SIZE);
    const bibkeys = batch.map((t) => `ISBN:${t.isbn}`).join(",");
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkeys)}&format=json&jscmd=data`
      );
      if (res.ok) {
        const data: Record<string, BooksApiEntry> = await res.json();
        for (const t of batch) {
          const cover = data[`ISBN:${t.isbn}`]?.cover?.medium;
          if (cover) {
            onCover(t.id, cover);
            found++;
          } else {
            stillMissing.push(t);
          }
        }
      } else {
        if (res.status === 429) throttled++;
        stillMissing.push(...batch);
      }
    } catch {
      stillMissing.push(...batch);
    }
    done += batch.length;
    onProgress?.(done, total);
    if (i + BATCH_SIZE < withIsbn.length) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }

  // Pass 2 — title search for everything still bare. Slower (one request
  // each), so it runs second and can be stopped.
  for (const t of [...withoutIsbn, ...stillMissing]) {
    if (shouldStop?.()) break;
    if (t.title) {
      const cover = await searchForCover(t.title, t.author, () => throttled++);
      if (cover) {
        onCover(t.id, cover);
        found++;
      }
    }
    done++;
    onProgress?.(done, total);
  }

  return { found, checked: done, throttled };
}
