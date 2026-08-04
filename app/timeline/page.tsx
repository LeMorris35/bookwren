"use client";

// Reading timeline — every finished book, newest month first, so you can
// scroll back through your reading life. Covers link to the book page
// (rating, sessions, notes live there).

import Link from "next/link";
import { useStore } from "@/lib/store";
import { BookCover } from "@/components/BookCover";
import type { Book } from "@/lib/types";

function monthTitle(prefix: string): string {
  const [y, m] = prefix.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TimelinePage() {
  const { ready, data } = useStore();
  if (!ready) return null;

  const finished = data.books
    .filter((b) => b.status === "finished")
    .map((b) => ({ book: b, when: b.finishedAt ?? b.addedAt }))
    .sort((a, b) => (a.when < b.when ? 1 : -1));

  if (finished.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-ink-muted">
        <p className="text-4xl">🕰️</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Your timeline starts with book one
        </h1>
        <p className="mt-2">
          Finish a book and it lands here — a scrollable history of everything
          you&apos;ve read, month by month.
        </p>
        <Link href="/library" className="mt-4 inline-block font-medium text-accent">
          To the library →
        </Link>
      </div>
    );
  }

  // Group by YYYY-MM of the finish date
  const byMonth = new Map<string, { book: Book; when: string }[]>();
  for (const entry of finished) {
    const key = entry.when.slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(entry);
    byMonth.set(key, list);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold">Timeline</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {finished.length} book{finished.length === 1 ? "" : "s"} finished — your
        reading life, month by month.
      </p>

      <div className="mt-6 space-y-2">
        {[...byMonth.entries()].map(([month, entries]) => (
          <section key={month} className="relative border-l-2 border-line pb-8 pl-6">
            {/* Timeline dot */}
            <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-background bg-accent" />
            <h2 className="font-display text-lg font-semibold">
              {monthTitle(month)}
              <span className="ml-2 text-sm font-normal text-ink-muted">
                {entries.length} book{entries.length === 1 ? "" : "s"}
              </span>
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-4">
              {entries.map(({ book, when }) => (
                <Link key={book.id} href={`/book/${book.id}`} className="group">
                  <div className="relative">
                    <BookCover
                      book={book}
                      className="transition-transform group-hover:-translate-y-1"
                    />
                    {book.rating && (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink shadow">
                        ★{Math.min(5, book.rating)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium">{book.title}</p>
                  <p className="text-[11px] text-ink-faint">{dayLabel(when)}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
