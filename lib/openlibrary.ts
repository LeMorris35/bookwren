// Open Library search — a free, no-API-key book database with cover images.
// Docs: https://openlibrary.org/dev/docs/api/search

export interface BookSearchResult {
  /** Open Library work key, e.g. "/works/OL17930368W". */
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  firstPublishYear?: number;
  pages?: number;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
}

export function coverUrlFromId(coverId: number, size: "S" | "M" | "L" = "M"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export async function searchBooks(
  query: string,
  signal?: AbortSignal
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "12",
    fields:
      "key,title,author_name,cover_i,first_publish_year,number_of_pages_median",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const data: { docs: OpenLibraryDoc[] } = await res.json();
  return data.docs.map((doc) => ({
    key: doc.key,
    title: doc.title,
    author: doc.author_name?.join(", ") ?? "Unknown author",
    coverUrl: doc.cover_i ? coverUrlFromId(doc.cover_i) : undefined,
    firstPublishYear: doc.first_publish_year,
    pages: doc.number_of_pages_median,
  }));
}
