"use client";

// Re-checks every book that has no cover and tries to find one. Safe to run
// as often as you like — it only ever touches books that are still bare, and
// it can be stopped mid-run.

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { backfillCovers } from "@/lib/cover-backfill";

export function FindCovers() {
  const { data, updateBook } = useStore();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [result, setResult] = useState<string | null>(null);
  const stopped = useRef(false);

  const missing = data.books.filter((b) => !b.coverUrl);

  async function run() {
    stopped.current = false;
    setResult(null);
    setProgress({ done: 0, total: missing.length });

    const { found } = await backfillCovers(
      missing.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
      })),
      (bookId, coverUrl) => updateBook(bookId, { coverUrl }),
      (done, total) => setProgress({ done, total }),
      () => stopped.current
    );

    setProgress(null);
    setResult(
      stopped.current
        ? `Stopped — found ${found} cover${found === 1 ? "" : "s"} so far.`
        : found === 0
          ? "No new covers found. Those books may not be in Open Library — you can add a photo yourself from each book's page."
          : `Found ${found} cover${found === 1 ? "" : "s"}!`
    );
  }

  if (missing.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Book covers</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every book in your library has a cover. 🎉
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">Book covers</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {missing.length} book{missing.length === 1 ? "" : "s"} still without a
        cover. This searches by title and author, so it can find ones the
        import missed.
      </p>

      {progress ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-chart-track">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">
              Checking {progress.done} of {progress.total}… you can leave this
              page open and keep reading.
            </p>
            <button
              type="button"
              onClick={() => (stopped.current = true)}
              className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted"
            >
              Stop
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          Find missing covers
        </button>
      )}

      {result && <p className="mt-2 text-sm text-ink-muted">{result}</p>}

      {missing.length > 200 && !progress && (
        <p className="mt-2 text-xs text-ink-faint">
          Heads up: with {missing.length} books this takes a while (about a
          second each, to stay polite to Open Library). Leave the tab open.
        </p>
      )}
    </section>
  );
}
