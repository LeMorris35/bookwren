"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { BookCover } from "@/components/BookCover";
import { STATUS_LABELS, type Book, type BookStatus } from "@/lib/types";
import { formatMinutes } from "@/lib/dates";
import { tagDot } from "@/lib/tag-colors";

type SortKey = "added" | "title" | "author" | "rating" | "finished";

const SORTS: [SortKey, string][] = [
  ["added", "Recently added"],
  ["title", "Title A–Z"],
  ["author", "Author A–Z"],
  ["rating", "Highest rated"],
  ["finished", "Recently finished"],
];

const TABS: (BookStatus | "all" | "series")[] = [
  "reading",
  "want",
  "finished",
  "dnf",
  "all",
  "series",
];

export default function LibraryPage() {
  const { ready, data } = useStore();
  const [tab, setTab] = useState<BookStatus | "all" | "series">("reading");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("added");
  const [search, setSearch] = useState("");

  if (!ready) return null;

  const minutesByBook = new Map<string, number>();
  for (const s of data.sessions) {
    minutesByBook.set(s.bookId, (minutesByBook.get(s.bookId) ?? 0) + s.minutes);
  }

  const seriesCount = new Set(
    data.books.map((b) => b.seriesName).filter(Boolean)
  ).size;
  const allTags = [...new Set(data.books.flatMap((b) => b.tags ?? []))].sort();
  const byStatus =
    tab === "all" || tab === "series"
      ? data.books
      : data.books.filter((b) => b.status === tab);
  const tagged = tagFilter
    ? byStatus.filter((b) => b.tags?.includes(tagFilter))
    : byStatus;

  // Title/author search — essential once a library runs to four figures
  const needle = search.trim().toLowerCase();
  const matched = needle
    ? tagged.filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle)
      )
    : tagged;

  const books = [...matched].sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title);
      case "author":
        return a.author.localeCompare(b.author) || a.title.localeCompare(b.title);
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "finished":
        return (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "");
      case "added":
      default:
        // Newest first, matching how the other apps show a shelf
        return (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
    }
  });
  const count = (t: BookStatus | "all" | "series") =>
    t === "all"
      ? data.books.length
      : t === "series"
        ? seriesCount
        : data.books.filter((b) => b.status === t).length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">Library</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/timeline"
            className="rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent"
          >
            🕰️ Timeline
          </Link>
          <Link
            href="/library/add"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
          >
            + Add book
          </Link>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-muted hover:border-accent"
            }`}
          >
            {t === "all" ? "All" : t === "series" ? "Series" : STATUS_LABELS[t]}{" "}
            · {count(t)}
          </button>
        ))}
      </div>

      {/* Search + sort — earns its place once a shelf gets big */}
      {tab !== "series" && data.books.length > 12 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library…"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort books"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-2 text-sm"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category filter — appears once any book has categories */}
      {allTags.length > 0 && tab !== "series" && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Categories:
          </span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tagFilter === null
                ? "bg-accent text-accent-ink"
                : "bg-accent-soft/60 text-ink-muted hover:text-accent"
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tagFilter === t
                  ? "bg-accent text-accent-ink"
                  : "bg-accent-soft/60 text-ink-muted hover:text-accent"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${tagDot(t)}`} aria-hidden />
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "series" ? (
        <SeriesView />
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">
          <p>No books here yet.</p>
          <Link href="/library/add" className="mt-2 inline-block font-medium text-accent">
            Add one →
          </Link>
          {data.books.length === 0 && (
            <p className="mt-3 text-sm">
              Coming from Goodreads or StoryGraph?{" "}
              <Link href="/import" className="font-medium text-accent">
                Import your library
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {books.map((book) => (
            <Link key={book.id} href={`/book/${book.id}`} className="group">
              <BookCover
                book={book}
                className="transition-transform group-hover:-translate-y-1"
              />
              <p className="mt-2 truncate text-sm font-medium">{book.title}</p>
              <p className="truncate text-xs text-ink-muted">
                {formatMinutes(minutesByBook.get(book.id) ?? 0)}
                {book.status === "finished" && book.rating
                  ? ` · ${"★".repeat(Math.min(5, book.rating))}`
                  : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Series shelf: each reader-named series shows its books as numbered slots,
 * with dashed "holes" for books you haven't added yet — so you can see at a
 * glance which book of the series you're missing.
 */
function SeriesView() {
  const { data, setSeriesPlanned } = useStore();

  const bySeries = new Map<string, Book[]>();
  for (const b of data.books) {
    if (!b.seriesName) continue;
    const list = bySeries.get(b.seriesName) ?? [];
    list.push(b);
    bySeries.set(b.seriesName, list);
  }

  if (bySeries.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">
        <p className="font-medium">No series yet.</p>
        <p className="mt-1 text-sm">
          Open any book and use <span className="font-medium">Details &amp; series</span>{" "}
          to name a series and give the book its number — the series shows up
          here with its missing books marked.
        </p>
      </div>
    );
  }

  const plannedFor = (name: string) =>
    data.series?.find((s) => s.name === name)?.plannedCount;

  return (
    <div className="space-y-4">
      {[...bySeries.entries()].map(([name, books]) => {
        const maxNumber = Math.max(
          0,
          ...books.map((b) => b.seriesNumber ?? 0)
        );
        const planned = plannedFor(name);
        const slots = Math.max(planned ?? 0, maxNumber, books.length);
        const finished = books.filter((b) => b.status === "finished").length;
        const byNumber = new Map(
          books.filter((b) => b.seriesNumber).map((b) => [b.seriesNumber!, b])
        );
        const unnumbered = books.filter((b) => !b.seriesNumber);

        return (
          <div key={name} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">{name}</h3>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Books in series:
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={planned ?? ""}
                  placeholder="?"
                  onChange={(e) =>
                    setSeriesPlanned(
                      name,
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-14 rounded-lg border border-line bg-background px-2 py-1 text-center text-sm"
                />
              </label>
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {finished} of {planned ?? slots} read
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: slots }, (_, i) => i + 1).map((n) => {
                const book = byNumber.get(n);
                if (!book) {
                  return (
                    <div
                      key={n}
                      title={`Book ${n} — not in your library yet`}
                      className="flex h-16 w-11 items-center justify-center rounded-lg border-2 border-dashed border-line text-sm font-semibold text-ink-faint"
                    >
                      {n}
                    </div>
                  );
                }
                return (
                  <Link
                    key={n}
                    href={`/book/${book.id}`}
                    title={`${book.title} (${STATUS_LABELS[book.status]})`}
                    className={`relative flex h-16 w-11 items-center justify-center overflow-hidden rounded-lg border text-sm font-semibold ${
                      book.status === "finished"
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-accent/50 bg-accent-soft text-accent"
                    }`}
                  >
                    {book.status === "finished" ? "✓" : n}
                  </Link>
                );
              })}
              {unnumbered.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  title={`${book.title} — give it a book # in Details & series`}
                  className="flex h-16 w-11 items-center justify-center rounded-lg border border-line bg-background text-lg"
                >
                  ?
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
