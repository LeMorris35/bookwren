"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayKey } from "@/lib/dates";
import { tapFeedback } from "@/lib/native";
import type { Book } from "@/lib/types";

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60];

/** Form to log a reading session for a book. */
export function LogSessionForm({
  book,
  onDone,
}: {
  book: Book;
  onDone?: () => void;
}) {
  const { data, addSession } = useStore();
  const [minutes, setMinutes] = useState<string>("20");
  const [date, setDate] = useState<string>(todayKey());
  const [endPage, setEndPage] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const isAudio = book.format === "audiobook";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins <= 0) return;

    // "Stopped on page 80" after previously stopping on 45 → 35 pages read.
    // First-ever log counts from page 0.
    const end = endPage ? Number(endPage) : undefined;
    let pagesRead: number | undefined;
    if (end && end > 0) {
      const prevMax = data.sessions
        .filter((s) => s.bookId === book.id && s.endPage != null)
        .reduce((max, s) => Math.max(max, s.endPage!), 0);
      pagesRead = Math.max(0, end - prevMax);
    }

    addSession({
      bookId: book.id,
      date,
      minutes: Math.round(mins),
      endPage: end,
      pagesRead,
    });
    tapFeedback();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-muted">
          {isAudio ? "Minutes listened" : "Minutes read"}
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                minutes === String(m)
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-ink-muted hover:border-accent"
              }`}
            >
              {m}m
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-20 rounded-full border border-line bg-surface px-3.5 py-1.5 text-center text-sm"
            aria-label="Custom minutes"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-ink-muted">
            Date
          </label>
          <input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        {!isAudio && (
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-ink-muted">
              Stopped on page
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="optional"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        {saved ? "Logged ✓" : "Log session"}
      </button>
    </form>
  );
}
