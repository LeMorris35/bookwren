"use client";

// Bring a library over from Goodreads, The StoryGraph, or any CSV export.
// The file is parsed in the browser — it never leaves the device.

import { useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { parseLibraryCsv, type ImportSummary } from "@/lib/csv-import";
import { backfillCovers } from "@/lib/cover-backfill";
import { STATUS_LABELS, type BookStatus } from "@/lib/types";

export default function ImportPage() {
  const { ready, data, importBooks, updateBook } = useStore();
  const [covers, setCovers] = useState<{ done: number; total: number } | null>(
    null
  );
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!ready) return null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDone(null);
    try {
      setSummary(parseLibraryCsv(await file.text()));
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Could not read that file");
    }
  }

  async function runImport() {
    if (!summary) return;
    const existing = new Set(
      data.books.map((b) => `${b.title.toLowerCase()}|${b.author.toLowerCase()}`)
    );

    const chosen = summary.books.filter((entry) => {
      if (!skipDuplicates) return true;
      const key = `${entry.book.title.toLowerCase()}|${entry.book.author.toLowerCase()}`;
      return !existing.has(key);
    });

    // Books land instantly; covers stream in afterwards
    const added = importBooks(chosen.map((e) => e.book));
    setDone(added.length);
    setSummary(null);

    // Every book gets a shot at a cover: by ISBN where we have one, by title
    // and author for the many Goodreads rows that carry no ISBN at all.
    const targets = added.map((book, i) => ({
      id: book.id,
      isbn: chosen[i]?.isbn,
      title: book.title,
      author: book.author,
    }));
    if (targets.length === 0) return;

    setCovers({ done: 0, total: targets.length });
    await backfillCovers(
      targets,
      (bookId, coverUrl) => updateBook(bookId, { coverUrl }),
      (doneCount, total) => setCovers({ done: doneCount, total })
    );
    setCovers(null);
  }

  const counts = summary
    ? summary.books.reduce<Record<string, number>>((acc, b) => {
        acc[b.book.status] = (acc[b.book.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};
  const undated = summary?.books.filter((b) => b.missingDate).length ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Import your library</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Already track your reading somewhere else? Bring it all over — your
          shelves, ratings, and finish dates land on your timeline.
        </p>
      </div>

      {done !== null ? (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/40 p-6 text-center">
          <p className="text-4xl">📚</p>
          <p className="mt-2 font-display text-xl font-semibold">
            {done} book{done === 1 ? "" : "s"} imported!
          </p>
          {covers ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                Finding covers… {covers.done} of {covers.total}. Leave this open
                — you can browse in another tab.
              </p>
              <div className="mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-chart-track">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${(covers.done / covers.total) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              Covers filled in where we could find them.
            </p>
          )}
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/library"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink"
            >
              See my library
            </Link>
            <Link
              href="/timeline"
              className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-muted"
            >
              See my timeline
            </Link>
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <p className="font-display text-lg font-semibold">
              Found {summary.books.length} books
              {summary.source !== "CSV" ? ` from ${summary.source}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(counts) as BookStatus[]).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                >
                  {counts[s]} {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>

          {undated > 0 && (
            <p className="text-xs text-ink-muted">
              {undated === 1
                ? "1 finished book has no recorded date."
                : `${undated} finished books have no recorded date.`}{" "}
              They&apos;ll be in your library, and you can add a finish date any
              time to place them on the timeline.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Skip books already in my library
          </label>

          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {summary.books.slice(0, 40).map((entry, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm">
                  {entry.book.title}
                  <span className="text-ink-faint"> · {entry.book.author}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {entry.book.rating ? "★".repeat(entry.book.rating) : ""}
                  {entry.book.finishedAt
                    ? ` ${entry.book.finishedAt.slice(0, 7)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          {summary.books.length > 40 && (
            <p className="text-center text-xs text-ink-faint">
              …and {summary.books.length - 40} more
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={runImport}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink"
            >
              Import {summary.books.length} books
            </button>
            <button
              type="button"
              onClick={() => setSummary(null)}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-line p-8 text-center transition-colors hover:border-accent"
          >
            <span className="block text-3xl">📄</span>
            <span className="mt-2 block font-display text-lg font-semibold">
              Choose your export file
            </span>
            <span className="mt-1 block text-sm text-ink-muted">
              Goodreads or StoryGraph .csv
            </span>
          </button>
          {/* Deliberately permissive: iOS greys out CSVs picked from Files
              when the accept list is narrow. */}
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt,text/csv,text/plain,text/comma-separated-values,application/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={onFile}
          />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setPasteMode((v) => !v)}
              className="text-sm font-medium text-accent"
            >
              {pasteMode ? "← Back to file picker" : "Can't pick the file? Paste it instead"}
            </button>
          </div>

          {pasteMode && (
            <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm text-ink-muted">
                Open the CSV (in Files, Mail, or your downloads), select all,
                copy, and paste it here.
              </p>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={5}
                placeholder="Title,Author,My Rating,…"
                className="w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  try {
                    setSummary(parseLibraryCsv(pasted));
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Could not read that"
                    );
                  }
                }}
                disabled={pasted.trim().length < 20}
                className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
              >
                Read pasted data
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 text-sm">
            <div className="rounded-xl bg-accent-soft/50 p-3">
              <p className="font-display text-base font-semibold">
                📱 Doing this on your phone?
              </p>
              <p className="mt-1 text-ink-muted">
                Both sites hide their export button on mobile — but you can
                still get it. In Safari tap{" "}
                <span className="font-medium">aA → Request Desktop Website</span>{" "}
                (Chrome: <span className="font-medium">⋮ → Desktop site</span>),
                then follow the steps below. The file saves to your{" "}
                <span className="font-medium">Files app → Downloads</span>, and
                you pick it right here.
              </p>
            </div>
            <div>
              <p className="font-display text-base font-semibold">
                Goodreads
              </p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-muted">
                <li>
                  Go to{" "}
                  <a
                    href="https://www.goodreads.com/review/import"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    goodreads.com/review/import
                  </a>{" "}
                  (desktop mode on phones)
                </li>
                <li>Tap <span className="font-medium">Export Library</span></li>
                <li>
                  Wait a few seconds, then tap the export file link that appears
                  at the top
                </li>
                <li>Save it, then come back and choose it above</li>
              </ol>
            </div>
            <div>
              <p className="font-display text-base font-semibold">
                The StoryGraph
              </p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-muted">
                <li>
                  Go to{" "}
                  <a
                    href="https://app.thestorygraph.com/user-export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    app.thestorygraph.com/user-export
                  </a>
                </li>
                <li>
                  Tap <span className="font-medium">Generate export</span>, wait
                  for the email or refresh
                </li>
                <li>Download the CSV, then choose it above</li>
              </ol>
            </div>
            <p className="text-xs text-ink-faint">
              Your file is read on your own device — it&apos;s never uploaded
              anywhere. Reading <em>time</em> can&apos;t come across (no app
              exports it), so your minutes and streaks start fresh here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
