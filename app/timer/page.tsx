"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { BookCover } from "@/components/BookCover";
import { todayKey } from "@/lib/dates";
import { successFeedback, tapFeedback } from "@/lib/native";

// Timer state survives page refreshes / closed tabs.
const TIMER_KEY = "shelfmark-timer-v1";

interface TimerState {
  bookId: string;
  /** Epoch ms when the running stretch started; null while paused. */
  startedAt: number | null;
  /** Ms accumulated from previous stretches. */
  accumulatedMs: number;
}

function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

function saveTimer(t: TimerState | null) {
  if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t));
  else localStorage.removeItem(TIMER_KEY);
}

export default function TimerPage() {
  return (
    <Suspense>
      <TimerInner />
    </Suspense>
  );
}

function TimerInner() {
  const { ready, data, addSession } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, forceTick] = useState(0);

  // Restore a persisted timer, or start fresh for ?book=<id>
  useEffect(() => {
    const persisted = loadTimer();
    if (persisted) {
      setTimer(persisted);
    } else {
      const bookId = params.get("book");
      if (bookId) setTimer({ bookId, startedAt: Date.now(), accumulatedMs: 0 });
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change
  useEffect(() => {
    if (hydrated) saveTimer(timer);
  }, [timer, hydrated]);

  // Tick once a second while running
  const running = timer?.startedAt != null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!ready || !hydrated) return null;

  const readingBooks = data.books.filter((b) => b.status === "reading");
  const book = timer ? data.books.find((b) => b.id === timer.bookId) : undefined;

  // No timer yet → book picker
  if (!timer || !book) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Reading timer</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick a book, hit start, and just read. We&apos;ll do the counting.
        </p>
        {readingBooks.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-ink-muted">
            <p>No books marked “Reading” yet.</p>
            <Link href="/library/add" className="mt-2 inline-block font-medium text-accent">
              Add a book →
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {readingBooks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  setTimer({ bookId: b.id, startedAt: Date.now(), accumulatedMs: 0 })
                }
                className="group text-left"
              >
                <BookCover
                  book={b}
                  className="transition-transform group-hover:-translate-y-1"
                />
                <p className="mt-2 truncate text-sm font-medium">{b.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const elapsedMs =
    timer.accumulatedMs +
    (timer.startedAt != null ? Date.now() - timer.startedAt : 0);
  const totalSec = Math.floor(elapsedMs / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const display = `${hh > 0 ? `${hh}:` : ""}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  function pause() {
    tapFeedback();
    setTimer((t) =>
      t && t.startedAt != null
        ? { ...t, accumulatedMs: t.accumulatedMs + (Date.now() - t.startedAt), startedAt: null }
        : t
    );
  }

  function resume() {
    tapFeedback();
    setTimer((t) => (t ? { ...t, startedAt: Date.now() } : t));
  }

  function finish() {
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    addSession({ bookId: book!.id, date: todayKey(), minutes });
    successFeedback();
    saveTimer(null);
    setTimer(null);
    router.push(`/book/${book!.id}`);
  }

  function discard() {
    saveTimer(null);
    setTimer(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-6 text-center">
      <div className="w-32">
        <BookCover book={book} />
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold">{book.title}</h1>
      <p className="text-sm text-ink-muted">{book.author}</p>

      <p
        className={`mt-8 font-display text-7xl font-semibold tabular-nums tracking-tight ${
          running ? "" : "opacity-50"
        }`}
      >
        {display}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {running ? "Reading…" : "Paused"}
      </p>

      <div className="mt-8 flex items-center gap-3">
        {running ? (
          <button
            type="button"
            onClick={pause}
            className="rounded-full border border-line px-8 py-3 font-semibold text-ink-muted"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={resume}
            className="rounded-full border border-accent px-8 py-3 font-semibold text-accent"
          >
            Resume
          </button>
        )}
        <button
          type="button"
          onClick={finish}
          className="rounded-full bg-accent px-8 py-3 font-semibold text-accent-ink"
        >
          Finish &amp; save
        </button>
      </div>
      <button
        type="button"
        onClick={discard}
        className="mt-6 text-sm text-ink-faint hover:text-danger"
      >
        Discard session
      </button>
    </div>
  );
}
