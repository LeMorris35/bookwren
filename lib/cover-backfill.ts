// Cover art for imported books.
//
// Goodreads/StoryGraph exports carry no images. The obvious fix — pointing at
// covers.openlibrary.org/b/isbn/… — is rate-limited to 100 requests per IP per
// 5 minutes, so a 500-book import would stall out half-covered.
//
// Instead we resolve ISBNs in batches through the Books API, which returns
// *cover-ID* URLs. Those are explicitly exempt from that limit, so once
// resolved the images always load. Books with no usable ISBN (very common in
// Goodreads exports — audiobooks, old editions, indie titles) fall back to a
// title + author search.

const BATCH_SIZE = 50;
const PAUSE_MS = 400; // stay well under the documented request ceiling
const SEARCH_PAUSE_MS = 1100; // search API asks for ~1 req/sec unidentified

export interface CoverTarget {
  id: string;
  isbn?: string;
  title?: string;
  author?: string;
}

interface BooksApiEntry {
  cover?: { small?: string; medium?: string; large?: string };
}

interface SearchDoc {
  cover_i?: number;
  title?: string;
  author_name?: string[];
}

/**
 * Resolve covers, reporting each one as it arrives so the UI can fill them in
 * progressively. Failures are skipped silently — a missing cover just means
 * the generated spine placeholder stays.
 */
export async function backfillCovers(
  targets: CoverTarget[],
  onCover: (bookId: string, coverUrl: string) => void,
  onProgress?: (done: number, total: number) => void,
  shouldStop?: () => boolean
): Promise<{ found: number; searched: number }> {
  let done = 0;
  let found = 0;
  const total = targets.length;
  const stillMissing: CoverTarget[] = [];

  // Pass 1 — batched ISBN lookups (fast, no meaningful rate limit)
  const withIsbn = targets.filter((t) => t.isbn && t.isbn.length >= 10);
  const withoutIsbn = targets.filter((t) => !t.isbn || t.isbn.length < 10);

  for (let i = 0; i < withIsbn.length; i += BATCH_SIZE) {
    if (shouldStop?.()) return { found, searched: 0 };
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

  // Pass 2 — title + author search for everything still bare. One request
  // each, so it's slow; that's why it runs second and can be stopped.
  const searchQueue = [...withoutIsbn, ...stillMissing];
  let searched = 0;

  for (const t of searchQueue) {
    if (shouldStop?.()) break;
    if (!t.title) {
      done++;
      continue;
    }
    try {
      const params = new URLSearchParams({
        title: t.title,
        limit: "1",
        fields: "cover_i,title,author_name",
      });
      if (t.author && t.author !== "Unknown author") {
        params.set("author", t.author);
      }
      const res = await fetch(`https://openlibrary.org/search.json?${params}`);
      if (res.ok) {
        const data: { docs?: SearchDoc[] } = await res.json();
        const coverId = data.docs?.[0]?.cover_i;
        if (coverId) {
          onCover(t.id, `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
          found++;
        }
      }
    } catch {
      // offline or blocked — leave the placeholder
    }
    searched++;
    done++;
    onProgress?.(done, total);
    await new Promise((r) => setTimeout(r, SEARCH_PAUSE_MS));
  }

  return { found, searched };
}
