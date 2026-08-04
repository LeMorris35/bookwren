"use client";

// Reading Wrapped — a Spotify-Wrapped-style year in books, rendered as a
// 1080×1350 portrait image (ideal for Facebook/Instagram posts). The whole
// point: users post it in book groups, and the card carries the app's name.

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { SITE } from "@/lib/site";
import {
  daysRead,
  longestStreak,
  pagesTotal,
  topBooksByMinutes,
  wordsRead,
} from "@/lib/stats";
import { formatMinutes } from "@/lib/dates";
import { displayFontFamily } from "@/lib/canvas-art";
import type { AppData } from "@/lib/types";

const W = 1080;
const H = 1350;

const SPINE_COLORS = ["#b45309", "#0d9488", "#7c3aed", "#b91c1c", "#1d4ed8", "#a16207"];

function yearStats(data: AppData) {
  const year = String(new Date().getFullYear());
  const inYear = (d: string) => d.startsWith(year);
  const yearSessions = data.sessions.filter((s) => inYear(s.date));
  const minutes = yearSessions.reduce((sum, s) => sum + s.minutes, 0);
  const finishedBooks = data.books.filter(
    (b) => b.status === "finished" && b.finishedAt?.startsWith(year)
  );

  // Year-scoped favorite author: finished-this-year books + this-year minutes
  const minutesByBook = new Map<string, number>();
  for (const s of yearSessions) {
    minutesByBook.set(s.bookId, (minutesByBook.get(s.bookId) ?? 0) + s.minutes);
  }
  const byAuthor = new Map<string, { books: number; minutes: number }>();
  for (const b of data.books) {
    if (!b.author || b.author === "Unknown author") continue;
    const entry = byAuthor.get(b.author) ?? { books: 0, minutes: 0 };
    if (finishedBooks.includes(b)) entry.books++;
    entry.minutes += minutesByBook.get(b.id) ?? 0;
    byAuthor.set(b.author, entry);
  }
  let favorite: string | null = null;
  let favBest = { books: 0, minutes: 0 };
  for (const [author, v] of byAuthor) {
    if (v.books === 0 && v.minutes === 0) continue;
    if (
      v.books > favBest.books ||
      (v.books === favBest.books && v.minutes > favBest.minutes)
    ) {
      favBest = v;
      favorite = author;
    }
  }

  const top = topBooksByMinutes({ ...data, sessions: yearSessions }, 1)[0];
  const topBook = top ? data.books.find((b) => b.id === top.bookId) : undefined;
  const words = wordsRead(data, inYear);

  return {
    year,
    minutes,
    finishedBooks,
    pages: pagesTotal(data.sessions, inYear),
    words,
    streak: longestStreak(yearSessions),
    days: daysRead(yearSessions),
    favorite,
    topBook,
  };
}

export default function WrappedPage() {
  const { ready, data } = useStore();
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  const s = yearStats(data);

  if (s.minutes === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-ink-muted">
        <p className="text-4xl">🎁</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Your {s.year} Wrapped is waiting
        </h1>
        <p className="mt-2">
          Log some reading first — then come back for your year-in-books card.
        </p>
        <Link href="/" className="mt-4 inline-block font-medium text-accent">
          Start reading →
        </Link>
      </div>
    );
  }

  async function download() {
    setBusy(true);
    try {
      await document.fonts.ready;
      const display = displayFontFamily();
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cream = "#faf6ee";
      const ink = "#241c15";
      const muted = "#6b5f52";
      const accent = "#b45309";

      ctx.fillStyle = cream;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e7ddcc";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      ctx.fillStyle = muted;
      ctx.font = "500 40px system-ui, sans-serif";
      ctx.fillText("My year in books · so far", 92, 150);
      ctx.fillStyle = ink;
      ctx.font = `600 110px ${display}`;
      ctx.fillText(`${s.year} Wrapped`, 92, 265);

      // Stat grid (2 columns × 3 rows)
      const stats: [string, string][] = [
        [formatMinutes(s.minutes), "spent reading"],
        [String(s.finishedBooks.length), "books finished"],
        [s.pages.toLocaleString(), "pages turned"],
        [
          `${s.words.anyExact ? "" : "≈"}${s.words.words.toLocaleString()}`,
          "words read",
        ],
        [`${s.streak} days`, "longest streak"],
        [`${s.days} days`, "spent with a book"],
      ];
      stats.forEach(([big, small], i) => {
        const x = 92 + (i % 2) * 480;
        const y = 420 + Math.floor(i / 2) * 165;
        ctx.fillStyle = accent;
        ctx.font = `600 72px ${display}`;
        ctx.fillText(big, x, y);
        ctx.fillStyle = muted;
        ctx.font = "400 34px system-ui, sans-serif";
        ctx.fillText(small, x, y + 44);
      });

      // Book spines for this year's finished books
      const spines = s.finishedBooks.slice(0, 8);
      if (spines.length > 0) {
        const baseY = 1120;
        let x = 92;
        spines.forEach((book, i) => {
          const h = 200 + ((i * 37) % 45);
          const w = 74 + ((i * 23) % 26);
          ctx.fillStyle = SPINE_COLORS[i % SPINE_COLORS.length];
          ctx.beginPath();
          ctx.roundRect(x, baseY - h, w, h, 6);
          ctx.fill();
          ctx.save();
          ctx.translate(x + w / 2 + 9, baseY - 14);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.font = "600 26px system-ui, sans-serif";
          const title =
            book.title.length > 18 ? `${book.title.slice(0, 17)}…` : book.title;
          ctx.fillText(title, 0, 0);
          ctx.restore();
          x += w + 14;
        });
      }

      // Favorite author / top book
      ctx.fillStyle = ink;
      ctx.font = "600 36px system-ui, sans-serif";
      let footY = 1190;
      if (s.favorite) {
        ctx.fillText(`Author of my year: ${s.favorite}`, 92, footY);
        footY += 52;
      }
      if (s.topBook) {
        ctx.fillText(`Most time in: ${s.topBook.title}`, 92, footY);
      }

      ctx.fillStyle = muted;
      ctx.font = "400 30px system-ui, sans-serif";
      ctx.fillText(
        `${SITE.name} · track yours free at ${SITE.url.replace("https://", "")} · by ${SITE.brand.name}`,
        92,
        1282
      );

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;
      const file = new File([blob], `my-${s.year}-wrapped.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `My ${s.year} Wrapped` });
          return;
        } catch {
          // fall through to download
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-${s.year}-wrapped.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div>
        <p className="text-4xl">🎁</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Your {s.year} Wrapped
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          A year of reading, one shareable card.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left">
        <WrapTile big={formatMinutes(s.minutes)} label="spent reading" color="text-accent" />
        <WrapTile big={String(s.finishedBooks.length)} label="books finished" color="text-chart-ebook" />
        <WrapTile big={s.pages.toLocaleString()} label="pages turned" color="text-chart-audiobook" />
        <WrapTile
          big={`${s.words.anyExact ? "" : "≈"}${s.words.words.toLocaleString()}`}
          label="words read"
          color="text-berry"
        />
        <WrapTile big={`${s.streak} days`} label="longest streak" color="text-cinnamon" />
        <WrapTile big={`${s.days} days`} label="with a book" color="text-chart-physical" />
      </div>

      {(s.favorite || s.topBook) && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-left text-sm">
          {s.favorite && (
            <p>
              <span className="text-ink-muted">Author of your year:</span>{" "}
              <span className="font-semibold">{s.favorite}</span>
            </p>
          )}
          {s.topBook && (
            <p className={s.favorite ? "mt-1" : ""}>
              <span className="text-ink-muted">Most time in:</span>{" "}
              <span className="font-semibold">{s.topBook.title}</span>
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="w-full rounded-full bg-accent py-3 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Wrapping…" : "🎁 Get my Wrapped card"}
      </button>
      <p className="text-xs text-ink-faint">
        1080×1350 image — perfect for your book group or story.
      </p>
    </div>
  );
}

function WrapTile({
  big,
  label,
  color = "text-accent",
}: {
  big: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className={`font-display text-2xl font-semibold ${color}`}>{big}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
