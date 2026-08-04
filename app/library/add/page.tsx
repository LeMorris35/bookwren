"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { searchAllBooks, type UnifiedResult } from "@/lib/book-search";
import { ReportDialog } from "@/components/ReportDialog";
import { fileToCompressedDataUri } from "@/lib/image";
import { todayKey } from "@/lib/dates";
import {
  FORMAT_LABELS,
  type BookFormat,
  type BookStatus,
} from "@/lib/types";

/** What the add form is working with, whether searched or typed by hand. */
interface Draft {
  title: string;
  author: string;
  coverUrl?: string;
  pages: string;
  /** True when the reader typed it in themselves (candidate for the catalog). */
  manual: boolean;
}

export default function AddBookPage() {
  const [draft, setDraft] = useState<Draft | null>(null);

  return (
    <div className="mx-auto max-w-xl">
      {draft ? (
        <AddForm draft={draft} onBack={() => setDraft(null)} />
      ) : (
        <SearchStep onPick={setDraft} />
      )}
    </div>
  );
}

/* ── Step 1: find the book ─────────────────────────────────── */

function SearchStep({ onPick }: { onPick: (draft: Draft) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [reporting, setReporting] = useState<{ id: string; label: string } | null>(
    null
  );
  const [reported, setReported] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(false);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { results, openLibraryFailed } = await searchAllBooks(
          query.trim(),
          controller.signal
        );
        setResults(results);
        setSearchError(openLibraryFailed && results.length === 0);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setSearchError(true);
        }
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Add a book</h1>
        <Link href="/import" className="text-sm font-medium text-accent">
          Import a library →
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title or author…"
        className="w-full rounded-full border border-line bg-surface px-5 py-3 text-base shadow-sm outline-none focus:border-accent"
        autoFocus
      />

      {searching && (
        <p className="mt-4 text-center text-sm text-ink-muted">Searching…</p>
      )}
      {searchError && (
        <p className="mt-4 text-center text-sm text-danger">
          Search isn&apos;t reachable right now — you can still add the book by
          hand below.
        </p>
      )}

      {reported && (
        <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">
          {reported}
        </p>
      )}

      {reporting && (
        <ReportDialog
          kind="book"
          targetId={reporting.id}
          targetLabel={reporting.label}
          onClose={() => setReporting(null)}
          onDone={setReported}
        />
      )}

      {results.length > 0 && (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {results.map((r) => (
            <li key={r.key} className="flex items-stretch">
              <button
                type="button"
                onClick={() =>
                  onPick({
                    title: r.title,
                    author: r.author,
                    coverUrl: r.coverUrl,
                    pages: r.pages ? String(r.pages) : "",
                    manual: false,
                  })
                }
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent-soft/50"
              >
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.coverUrl}
                    alt=""
                    className="h-16 w-11 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-chart-track text-lg">
                    📕
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {r.author}
                    {r.firstPublishYear ? ` · ${r.firstPublishYear}` : ""}
                  </span>
                </span>
                {r.source === "community" && (
                  <span
                    className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent"
                    title="Added by a BookWren reader"
                  >
                    🐦 {r.readers}
                  </span>
                )}
              </button>
              {/* Reader-contributed entries can be flagged by anyone */}
              {r.source === "community" && (
                <button
                  type="button"
                  onClick={() =>
                    setReporting({
                      id: r.key.replace("community:", ""),
                      label: `${r.title} — ${r.author}`,
                    })
                  }
                  title="Report this entry"
                  aria-label={`Report ${r.title}`}
                  className="shrink-0 px-3 text-ink-faint transition-colors hover:text-danger"
                >
                  ⚑
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() =>
          onPick({ title: query.trim(), author: "", pages: "", manual: true })
        }
        className="mt-5 w-full rounded-full border border-line py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        {query.trim()
          ? `Can't find "${query.trim().slice(0, 28)}"? Add it yourself`
          : "Indie or self-published? Add it yourself"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        Books you add by hand join BookWren&apos;s shared catalog, so the next
        reader can find them too.
      </p>
    </>
  );
}

/* ── Step 2: shelve it (with real dates for past reads) ────── */

const QUICK_HOURS = [1, 2, 3, 5, 8, 12];

function AddForm({ draft, onBack }: { draft: Draft; onBack: () => void }) {
  const { addBook, addSession } = useStore();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(draft.title);
  const [author, setAuthor] = useState(draft.author);
  const [pages, setPages] = useState(draft.pages);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(draft.coverUrl);
  const [format, setFormat] = useState<BookFormat>("physical");
  const [status, setStatus] = useState<BookStatus>("reading");

  // Back-log details — only shown for a book they've already finished
  const [finishedOn, setFinishedOn] = useState<string>(todayKey());
  const [dateUnknown, setDateUnknown] = useState(false);
  const [rating, setRating] = useState(0);
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setCoverUrl(await fileToCompressedDataUri(file));
    } catch {
      // ignore unreadable image
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);

    const finishedAt =
      status === "finished" && !dateUnknown
        ? new Date(`${finishedOn}T12:00:00`).toISOString()
        : undefined;

    const book = addBook({
      title: title.trim(),
      author: author.trim() || "Unknown author",
      totalPages: pages ? Number(pages) : undefined,
      coverUrl,
      format,
      status,
      finishedAt,
      rating: status === "finished" && rating > 0 ? rating : undefined,
    });

    // Optional: record the time this past read took, on its finish date
    const h = Number(hours);
    if (status === "finished" && Number.isFinite(h) && h > 0) {
      addSession({
        bookId: book.id,
        date: dateUnknown ? todayKey() : finishedOn,
        minutes: Math.round(h * 60),
        pagesRead: pages ? Number(pages) : undefined,
        endPage: pages ? Number(pages) : undefined,
      });
    }

    // Hand-typed books join the shared catalog (signed-in readers only, so
    // every entry has an owner)
    if (draft.manual && isSignedIn) {
      fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          coverData: coverUrl?.startsWith("data:") ? coverUrl : undefined,
          totalPages: pages ? Number(pages) : undefined,
        }),
      }).catch(() => {});
    }

    router.push(`/book/${book.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-ink-muted hover:text-accent"
      >
        ← Back to search
      </button>

      {/* Identity */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-24 shrink-0"
          aria-label="Add cover photo"
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Book cover"
              className="aspect-[2/3] w-full rounded-lg border border-line object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-center text-xs text-ink-muted">
              <span className="text-xl">📷</span>
              Add cover
            </div>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        <div className="flex-1 space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title *"
            required
            autoFocus={draft.manual && !draft.title}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-medium"
          />
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="Pages (optional)"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Shelf */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-muted">
          Where does it go?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["reading", "📖", "Reading now"],
              ["want", "🔖", "Want to read"],
              ["finished", "✓", "Already read"],
            ] as [BookStatus, string, string][]
          ).map(([value, icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                status === value
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:border-accent"
              }`}
            >
              <span className="block text-lg">{icon}</span>
              <span
                className={`mt-0.5 block text-xs font-medium ${
                  status === value ? "text-accent" : "text-ink-muted"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Back-log panel — the whole point: put old reads on the right date */}
      {status === "finished" && (
        <div className="space-y-4 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-muted">
              When did you finish it?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["Today", 0],
                  ["Yesterday", -1],
                  ["Last week", -7],
                ] as [string, number][]
              ).map(([label, offset]) => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const active = !dateUnknown && finishedOn === key;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setFinishedOn(key);
                      setDateUnknown(false);
                    }}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line bg-surface text-ink-muted hover:border-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <input
                type="date"
                value={finishedOn}
                max={todayKey()}
                onChange={(e) => {
                  setFinishedOn(e.target.value);
                  setDateUnknown(false);
                }}
                className={`rounded-lg border bg-surface px-3 py-1.5 text-sm ${
                  dateUnknown ? "border-line opacity-60" : "border-accent"
                }`}
                aria-label="Finish date"
              />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={dateUnknown}
                onChange={(e) => setDateUnknown(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              I don&apos;t remember — just put it in my library
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-muted">
              Rate it? (optional)
            </p>
            <div className="flex items-center gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? 0 : star)}
                  aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  className={rating >= star ? "text-accent" : "text-line"}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-muted">
              Roughly how long did it take? (optional)
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(hours === String(h) ? "" : String(h))}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    hours === String(h)
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface text-ink-muted hover:border-accent"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              Adds those hours to your reading stats on that date.
            </p>
          </div>
        </div>
      )}

      {/* Format */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-muted">
          How {status === "finished" ? "did" : "are"} you read
          {status === "finished" ? " it" : "ing it"}?
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FORMAT_LABELS) as BookFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                format === f
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-ink-muted hover:border-accent"
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {draft.manual && !isSignedIn && (
        <p className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs text-ink-muted">
          Sign in and your hand-added books join the shared catalog, so other
          readers can find them too.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-accent py-3 font-semibold text-accent-ink disabled:opacity-60"
      >
        Add to library
      </button>
    </form>
  );
}
