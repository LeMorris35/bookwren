// Cover art for imported books.
//
// Goodreads/StoryGraph exports carry no images. The obvious fix — pointing at
// covers.openlibrary.org/b/isbn/… — is rate-limited to 100 requests per IP per
// 5 minutes, so a 500-book import would stall out half-covered.
//
// Instead we resolve ISBNs in batches through the Books API, which returns
// *cover-ID* URLs. Those are explicitly exempt from that limit, so once
// resolved the images always load.

const BATCH_SIZE = 50;
const PAUSE_MS = 400; // stay well under the documented request ceiling

export interface CoverTarget {
  id: string;
  isbn: string;
}

interface BooksApiEntry {
  cover?: { small?: string; medium?: string; large?: string };
}

/**
 * Resolve covers in batches, reporting each one as it arrives so the UI can
 * fill them in progressively. Failures are silently skipped — a missing cover
 * just means the generated spine placeholder stays.
 */
export async function backfillCovers(
  targets: CoverTarget[],
  onCover: (bookId: string, coverUrl: string) => void,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const withIsbn = targets.filter((t) => t.isbn && t.isbn.length >= 10);
  let done = 0;

  for (let i = 0; i < withIsbn.length; i += BATCH_SIZE) {
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
          if (cover) onCover(t.id, cover);
        }
      }
    } catch {
      // Offline or blocked — covers stay as placeholders, books are still fine
    }
    done += batch.length;
    onProgress?.(done, withIsbn.length);
    if (i + BATCH_SIZE < withIsbn.length) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }
}
