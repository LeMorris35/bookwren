"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { BookCover } from "@/components/BookCover";
import { LogSessionForm } from "@/components/LogSessionForm";
import { SendToFriend } from "@/components/SendToFriend";
import { tagDot } from "@/lib/tag-colors";
import { formatMinutes, shortDateLabel, todayKey } from "@/lib/dates";
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  type BookStatus,
} from "@/lib/types";

/**
 * Collapsible editor for page count, exact word count, and series placement.
 * Word count is optional — when set, word stats use the book's real
 * words-per-page instead of the 275/page estimate.
 */
function BookDetailsEditor({ bookId }: { bookId: string }) {
  const { data, updateBook } = useStore();
  const [open, setOpen] = useState(false);
  const book = data.books.find((b) => b.id === bookId);
  const [pages, setPages] = useState(book?.totalPages?.toString() ?? "");
  const [words, setWords] = useState(book?.wordCount?.toString() ?? "");
  const [seriesName, setSeriesName] = useState(book?.seriesName ?? "");
  const [seriesNumber, setSeriesNumber] = useState(
    book?.seriesNumber?.toString() ?? ""
  );
  const [tags, setTags] = useState<string[]>(book?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);

  if (!book) return null;
  const allSeries = [
    ...new Set(data.books.map((b) => b.seriesName).filter(Boolean)),
  ] as string[];
  const allTags = [...new Set(data.books.flatMap((b) => b.tags ?? []))].filter(
    (t) => !tags.includes(t)
  );

  function addTag(raw: string) {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const name = seriesName.trim();
    // Anything still typed in the tag box counts too
    const finalTags = tagInput.trim() && !tags.includes(tagInput.trim())
      ? [...tags, tagInput.trim()]
      : tags;
    if (tagInput.trim()) setTags(finalTags);
    setTagInput("");
    updateBook(bookId, {
      totalPages: pages ? Number(pages) : undefined,
      wordCount: words ? Number(words) : undefined,
      seriesName: name || undefined,
      seriesNumber: name && seriesNumber ? Number(seriesNumber) : undefined,
      tags: finalTags.length > 0 ? finalTags : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Details &amp; series</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {!open && (book.seriesName || book.wordCount) && (
        <p className="mt-2 text-sm text-ink-muted">
          {book.seriesName
            ? `${book.seriesName}${book.seriesNumber ? ` · Book ${book.seriesNumber}` : ""}`
            : ""}
          {book.seriesName && book.wordCount ? " · " : ""}
          {book.wordCount ? `${book.wordCount.toLocaleString()} words` : ""}
        </p>
      )}
      {open && (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Total pages
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Exact word count
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="optional"
                value={words}
                onChange={(e) => setWords(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Series
              </span>
              <input
                type="text"
                list="series-names"
                placeholder="e.g. Throne of Glass"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
              <datalist id="series-names">
                {allSeries.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="block w-24">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Book #
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={seriesNumber}
                onChange={(e) => setSeriesNumber(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-muted">
              Categories — genres, moods, anything
            </span>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                  >
                    <span className={`h-2 w-2 rounded-full ${tagDot(t)}`} aria-hidden />
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove ${t}`}
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-accent/60 hover:text-accent"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                list="all-tags"
                placeholder='e.g. "romantasy", "scary love story"'
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                className="flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
              <datalist id="all-tags">
                {allTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-accent hover:text-accent"
              >
                Add
              </button>
            </div>
          </div>
          <p className="text-xs text-ink-faint">
            Tip: sites like readinglength.com list exact word counts — paste one
            in and your word stats use it instead of the estimate.
          </p>
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink"
          >
            {saved ? "Saved ✓" : "Save details"}
          </button>
        </form>
      )}
    </section>
  );
}

/** Your own review. Private by default — sending it is an explicit choice. */
function ReviewEditor({ bookId }: { bookId: string }) {
  const { data, updateBook } = useStore();
  const book = data.books.find((b) => b.id === bookId);
  const [draft, setDraft] = useState(book?.review ?? "");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!book) return null;

  function save() {
    updateBook(bookId, { review: draft.trim() || undefined });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Your review</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(book.review ?? "");
              setEditing(true);
            }}
            className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent"
          >
            {book.review ? "Edit" : "Write one"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="What did you think? Nobody sees this unless you send it to a friend."
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-accent-ink"
            >
              Save review
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : book.review ? (
        <p className="mt-2 whitespace-pre-wrap text-sm">{book.review}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          {saved ? "Saved ✓" : "No review yet — jot down what you thought."}
        </p>
      )}
    </section>
  );
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, data, updateBook, deleteBook, deleteSession } = useStore();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!ready) return null;

  const book = data.books.find((b) => b.id === id);
  if (!book) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p>That book isn&apos;t in your library.</p>
        <Link href="/library" className="mt-2 inline-block font-medium text-accent">
          Back to library →
        </Link>
      </div>
    );
  }

  // Newest first. Same-day sessions tie-break on when they were logged —
  // a comparator that never returns 0 gives unstable, arbitrary order.
  const sessions = data.sessions
    .filter((s) => s.bookId === book.id)
    .sort((a, b) =>
      a.date === b.date
        ? b.createdAt.localeCompare(a.createdAt)
        : b.date.localeCompare(a.date)
    );
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  // Furthest page reached, not merely the latest logged — never walks backwards
  const lastPage = sessions.reduce<number | undefined>(
    (max, s) => (s.endPage != null ? Math.max(max ?? 0, s.endPage) : max),
    undefined
  );
  const pct =
    book.totalPages && lastPage
      ? Math.min(100, Math.round((lastPage / book.totalPages) * 100))
      : null;

  function setStatus(status: BookStatus) {
    updateBook(book!.id, {
      status,
      finishedAt:
        status === "finished"
          ? book!.finishedAt ?? new Date().toISOString()
          : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex gap-5">
        <div className="w-28 shrink-0 sm:w-32">
          <BookCover book={book} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight">
            {book.title}
          </h1>
          <p className="mt-1 text-ink-muted">{book.author}</p>
          <p className="mt-1 text-sm text-ink-faint">
            {FORMAT_LABELS[book.format]}
            {book.totalPages ? ` · ${book.totalPages} pages` : ""}
          </p>
          <p className="mt-3 font-display text-lg font-semibold text-accent">
            {formatMinutes(totalMinutes)}{" "}
            <span className="text-sm font-normal text-ink-muted">
              {book.format === "audiobook" ? "listened" : "read"}
            </span>
          </p>
          {pct !== null && (
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-chart-track">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Page {lastPage} of {book.totalPages} · {pct}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              book.status === s
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-ink-muted hover:border-accent"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Rating + finish date when finished */}
      {book.status === "finished" && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-ink-muted">Your rating</p>
            <div className="flex items-center gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateBook(book.id, { rating: star })}
                  aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  className={`transition-transform hover:-translate-y-0.5 ${
                    (book.rating ?? 0) >= star ? "text-accent" : "text-line"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink-muted">
              Finished on
            </span>
            <input
              type="date"
              max={todayKey()}
              value={book.finishedAt ? book.finishedAt.slice(0, 10) : ""}
              onChange={(e) =>
                updateBook(book.id, {
                  finishedAt: e.target.value
                    ? new Date(`${e.target.value}T12:00:00`).toISOString()
                    : undefined,
                })
              }
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            {!book.finishedAt && (
              <span className="mt-1 block text-xs text-ink-faint">
                Set a date to place it on your timeline
              </span>
            )}
          </label>
        </div>
      )}

      {book.status === "finished" && <ReviewEditor bookId={book.id} />}

      <BookDetailsEditor bookId={book.id} />

      {/* Log time */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Log time</h2>
          <Link
            href={`/timer?book=${book.id}`}
            className="rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent"
          >
            ▶ Use timer
          </Link>
        </div>
        <LogSessionForm book={book} />
      </section>

      <SendToFriend book={book} />

      {/* History */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          History · {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No sessions yet — log your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-16 shrink-0 text-sm text-ink-muted">
                  {shortDateLabel(s.date)}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {formatMinutes(s.minutes)}
                  {s.endPage ? (
                    <span className="font-normal text-ink-muted">
                      {" "}
                      · to p.{s.endPage}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => deleteSession(s.id)}
                  className="text-xs text-ink-faint hover:text-danger"
                  aria-label="Delete session"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Danger zone */}
      <div className="pt-2 text-center">
        {confirmingDelete ? (
          <div className="space-x-3 text-sm">
            <span className="text-ink-muted">Delete this book and its history?</span>
            <button
              type="button"
              onClick={() => {
                deleteBook(book.id);
                router.push("/library");
              }}
              className="font-semibold text-danger"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="font-medium text-ink-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-ink-faint hover:text-danger"
          >
            Remove from library
          </button>
        )}
      </div>
    </div>
  );
}
