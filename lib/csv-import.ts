// Import a library from Goodreads / StoryGraph / similar CSV exports.
//
// Everything here runs in the browser — the file never leaves the device.
// Column names are matched case-insensitively by *meaning*, so a new export
// format usually works without code changes.

import type { Book, BookFormat, BookStatus } from "./types";
import { parseTitle } from "./title-clean";

/** RFC4180-ish parser: handles quoted fields, embedded commas and newlines. */
export function parseCsv(text: string): string[][] {
  // Strip the UTF-8 BOM Excel loves to add
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // handled by the \n branch
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Goodreads wraps ISBNs as ="0439023483" to stop Excel eating leading zeros. */
function cleanIsbn(raw: string): string {
  return raw.replace(/^="?/, "").replace(/"?$/, "").trim();
}

/**
 * Dates arrive as 2023/07/14, 2023-07-14, or 14/07/2023. Returns a local
 * YYYY-MM-DD key, or undefined when the cell is empty/unparseable.
 */
function parseDate(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;

  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // "Jul 14, 2023" and similar
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return undefined;
}

/**
 * StoryGraph packs re-reads into one cell as ranges
 * ("2022/01/01-2022/01/10, 2023/05/02-2023/05/20"), so splitting on commas or
 * dashes gets the wrong end. Pull out every date and take the latest — that's
 * the most recent finish.
 */
function lastDateOf(raw: string): string | undefined {
  const found = raw.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/g);
  if (!found) return undefined;
  const dates = found.map(parseDate).filter(Boolean) as string[];
  if (dates.length === 0) return undefined;
  return dates.sort()[dates.length - 1];
}

const STATUS_WORDS: Record<string, BookStatus> = {
  read: "finished",
  finished: "finished",
  "currently-reading": "reading",
  "currently reading": "reading",
  reading: "reading",
  "to-read": "want",
  "to read": "want",
  "want to read": "want",
  "did-not-finish": "dnf",
  "did not finish": "dnf",
  dnf: "dnf",
  abandoned: "dnf",
};

const FORMAT_WORDS: Record<string, BookFormat> = {
  audiobook: "audiobook",
  audio: "audiobook",
  audible: "audiobook",
  ebook: "ebook",
  kindle: "ebook",
  "kindle edition": "ebook",
  "e-book": "ebook",
  digital: "ebook",
};

export interface ImportedBook {
  /** addedAt comes from the export's "Date Added" so shelf order matches. */
  book: Omit<Book, "id" | "addedAt"> & { addedAt?: string };
  isbn?: string;
  /** True when we could not tell when they finished it. */
  missingDate: boolean;
}

export interface ImportSummary {
  source: string;
  books: ImportedBook[];
  skipped: number;
  /** Header names we found but had no use for — surfaced for transparency. */
  unusedColumns: string[];
}

/** Find a column index by trying several header names in order. */
function pick(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex((h) => h === name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseLibraryCsv(text: string): ImportSummary {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error("That file looks empty — is it the exported CSV?");
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const source = headers.includes("exclusive shelf")
    ? "Goodreads"
    : headers.includes("read status")
      ? "The StoryGraph"
      : "CSV";

  const col = {
    title: pick(headers, "title", "book title", "name"),
    author: pick(headers, "author", "authors", "primary author", "author l-f"),
    pages: pick(headers, "number of pages", "pages", "page count"),
    rating: pick(headers, "my rating", "star rating", "rating"),
    status: pick(headers, "exclusive shelf", "read status", "status", "shelf"),
    shelves: pick(headers, "bookshelves", "tags", "collections"),
    dateRead: pick(headers, "date read", "last date read", "date finished"),
    // StoryGraph's re-read ranges — the fallback when "Last Date Read" is blank
    datesRead: pick(headers, "dates read"),
    dateAdded: pick(headers, "date added", "date_added"),
    isbn: pick(headers, "isbn13", "isbn", "isbn/uid"),
    format: pick(headers, "binding", "format", "edition format"),
    review: pick(headers, "my review", "review"),
  };

  if (col.title === -1) {
    throw new Error("No “Title” column found — is this a library export?");
  }

  const used = new Set(Object.values(col).filter((i) => i >= 0));
  const unusedColumns = headers.filter((_, i) => !used.has(i));

  const books: ImportedBook[] = [];
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const get = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : "");
    const title = get(col.title);
    if (!title) {
      skipped++;
      continue;
    }

    // Status: explicit column, else "has a finish date" means finished
    const statusRaw = get(col.status).toLowerCase();
    const dateRead =
      lastDateOf(get(col.dateRead)) ??
      parseDate(get(col.dateRead)) ??
      lastDateOf(get(col.datesRead));
    let status: BookStatus =
      STATUS_WORDS[statusRaw] ?? (dateRead ? "finished" : "want");

    // Goodreads keeps "read" books with no date; still finished, date unknown
    const missingDate = status === "finished" && !dateRead;

    // Rating: Goodreads 0–5 (0 = unrated), StoryGraph allows halves
    const ratingNum = Number(get(col.rating));
    const rating =
      Number.isFinite(ratingNum) && ratingNum > 0
        ? Math.max(1, Math.min(5, Math.round(ratingNum)))
        : undefined;

    const pagesNum = Number(get(col.pages).replace(/[^\d]/g, ""));
    const totalPages =
      Number.isFinite(pagesNum) && pagesNum > 0 ? pagesNum : undefined;

    const formatRaw = get(col.format).toLowerCase();
    const format: BookFormat = FORMAT_WORDS[formatRaw] ?? "physical";

    // Custom shelves become categories; drop the ones that duplicate status
    const tags = get(col.shelves)
      .split(",")
      .map((t) => t.trim())
      .filter(
        (t) =>
          t &&
          !["read", "currently-reading", "to-read", "owned"].includes(
            t.toLowerCase()
          )
      )
      .slice(0, 8);

    // A DNF with no date shouldn't claim a finish date
    const finishedAt =
      status === "finished" && dateRead
        ? new Date(`${dateRead}T12:00:00`).toISOString()
        : undefined;
    if (status === "finished" && !finishedAt) status = "finished";

    // Keep the shelf in the same order it had on Goodreads/StoryGraph.
    // Without this every book lands with today's timestamp and the whole
    // library sorts by CSV row order instead.
    const addedOn = parseDate(get(col.dateAdded));

    // "Fourth Wing (The Empyrean, #1)" → title + series, which both fixes
    // cover lookup and fills the Series shelf in one go.
    const parsed = parseTitle(title);

    books.push({
      book: {
        title: parsed.title.slice(0, 300),
        seriesName: parsed.seriesName,
        seriesNumber: parsed.seriesNumber,
        author: get(col.author).slice(0, 200) || "Unknown author",
        totalPages,
        format,
        status,
        rating,
        tags: tags.length > 0 ? tags : undefined,
        finishedAt,
        addedAt: addedOn
          ? new Date(`${addedOn}T12:00:00`).toISOString()
          : undefined,
      },
      isbn: cleanIsbn(get(col.isbn)) || undefined,
      missingDate,
    });
  }

  return { source, books, skipped, unusedColumns };
}
