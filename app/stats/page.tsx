"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { BarChart } from "@/components/BarChart";
import { ShareStats } from "@/components/ShareStats";
import {
  averageReadingDayMinutes,
  averageSessionMinutes,
  bestDay,
  booksFinishedThisYear,
  dailyTotals,
  daysRead,
  favoriteAuthor,
  longestStreak,
  minutesByFormat,
  minutesThisMonth,
  minutesThisWeek,
  minutesThisYear,
  minutesToday,
  monthlyTotalsThisYear,
  pagesThisYear,
  pagesTotal,
  topBooksByMinutes,
  wordsRead,
} from "@/lib/stats";
import { formatMinutes, monthLabel, shortDateLabel } from "@/lib/dates";
import { FORMAT_LABELS, type BookFormat } from "@/lib/types";

const FORMAT_DOT: Record<BookFormat, string> = {
  physical: "bg-chart-physical",
  ebook: "bg-chart-ebook",
  audiobook: "bg-chart-audiobook",
};

export default function StatsPage() {
  const { ready, data, updateSettings } = useStore();
  if (!ready) return null;

  const { sessions, settings } = data;
  const last30 = dailyTotals(sessions, 30);
  const months = monthlyTotalsThisYear(sessions);
  const byFormat = minutesByFormat(data);
  const formatTotal = Object.values(byFormat).reduce((a, b) => a + b, 0);
  const top = topBooksByMinutes(data, 5);
  const bookById = new Map(data.books.map((b) => [b.id, b]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Stats</h1>
        <Link
          href="/wrapped"
          className="rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent"
        >
          🎁 Reading Wrapped
        </Link>
      </div>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Today" value={formatMinutes(minutesToday(sessions))} dot="bg-chart-physical" />
        <Tile label="This week" value={formatMinutes(minutesThisWeek(sessions))} dot="bg-foliage" />
        <Tile label="This month" value={formatMinutes(minutesThisMonth(sessions))} dot="bg-chart-ebook" />
        <Tile label="This year" value={formatMinutes(minutesThisYear(sessions))} dot="bg-chart-audiobook" />
      </section>

      {/* Last 30 days */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Last 30 days</h2>
        <BarChart
          data={last30.map((d, i) => ({
            // Label every 5th day, and always the most recent one
            label:
              i === last30.length - 1 || i % 5 === 0
                ? shortDateLabel(d.date)
                : "",
            tooltip: shortDateLabel(d.date),
            minutes: d.minutes,
          }))}
          goalMinutes={settings.dailyGoalMinutes}
        />
      </section>

      {/* This year by month */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">This year</h2>
        <BarChart
          data={months.map((m) => ({
            label: monthLabel(m.month),
            tooltip: monthLabel(m.month),
            minutes: m.minutes,
          }))}
        />
      </section>

      {/* Records */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 font-display text-xl font-semibold">Your records</h2>
        <p className="mb-4 text-sm text-ink-muted">
          All-time numbers. Log a “stopped on page” with your sessions and the
          page &amp; word counts fill in (words ≈ 275 per page).
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Tile
            label="Longest streak"
            value={`${longestStreak(sessions)} day${longestStreak(sessions) === 1 ? "" : "s"}`}
          />
          <Tile label="Days read" value={String(daysRead(sessions))} />
          <Tile
            label="Best day"
            value={
              bestDay(sessions)
                ? formatMinutes(bestDay(sessions)!.minutes)
                : "—"
            }
            hint={bestDay(sessions) ? shortDateLabel(bestDay(sessions)!.date) : undefined}
          />
          <Tile
            label="Avg session"
            value={formatMinutes(averageSessionMinutes(sessions))}
          />
          <Tile
            label="Pages this year"
            value={pagesThisYear(sessions).toLocaleString()}
          />
          {(() => {
            const year = new Date().getFullYear().toString();
            const w = wordsRead(data, (d) => d.startsWith(year));
            return (
              <Tile
                label="Words this year"
                value={`${w.anyExact ? "" : "≈"}${w.words.toLocaleString()}`}
                hint={w.anyExact ? "using your exact counts" : undefined}
              />
            );
          })()}
          <Tile
            label="Pages all-time"
            value={pagesTotal(sessions).toLocaleString()}
          />
          <Tile
            label="Avg reading day"
            value={formatMinutes(averageReadingDayMinutes(sessions))}
          />
        </div>
        {(() => {
          const fav = favoriteAuthor(data);
          if (!fav) return null;
          return (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft/40 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Favorite author
                </p>
                <p className="font-display text-lg font-semibold">{fav.author}</p>
              </div>
              <p className="text-right text-sm text-ink-muted">
                {fav.books > 0
                  ? `${fav.books} book${fav.books === 1 ? "" : "s"} finished · `
                  : ""}
                {formatMinutes(fav.minutes)}
              </p>
            </div>
          );
        })()}
      </section>

      {/* Read vs listened */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">
          How you read
        </h2>
        {formatTotal === 0 ? (
          <p className="text-sm text-ink-muted">Log some time to see the split.</p>
        ) : (
          <>
            <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full">
              {(Object.keys(byFormat) as BookFormat[])
                .filter((f) => byFormat[f] > 0)
                .map((f) => (
                  <div
                    key={f}
                    className={FORMAT_DOT[f]}
                    style={{ width: `${(byFormat[f] / formatTotal) * 100}%` }}
                    title={`${FORMAT_LABELS[f]}: ${formatMinutes(byFormat[f])}`}
                  />
                ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {(Object.keys(byFormat) as BookFormat[]).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${FORMAT_DOT[f]}`} />
                  <span className="text-ink-muted">{FORMAT_LABELS[f]}</span>
                  <span className="font-medium">{formatMinutes(byFormat[f])}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Top books */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Most-read books</h2>
        {top.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing logged yet.</p>
        ) : (
          <ol className="space-y-2.5">
            {top.map(({ bookId, minutes }, i) => {
              const b = bookById.get(bookId);
              if (!b) return null;
              const max = top[0].minutes;
              return (
                <li key={bookId}>
                  <Link href={`/book/${bookId}`} className="group block">
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium group-hover:text-accent">
                        {i + 1}. {b.title}
                      </span>
                      <span className="shrink-0 text-ink-muted">
                        {formatMinutes(minutes)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-chart-track">
                      <div
                        className="h-full rounded-full bg-accent/80"
                        style={{ width: `${(minutes / max) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Goals */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 font-display text-xl font-semibold">Goals</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Books finished this year: {booksFinishedThisYear(data)} of{" "}
          {settings.yearlyBookGoal}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">
              Daily minutes
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={settings.dailyGoalMinutes}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0)
                  updateSettings({ dailyGoalMinutes: Math.round(v) });
              }}
              className="w-full rounded-lg border border-line bg-background px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">
              Books per year
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={settings.yearlyBookGoal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0)
                  updateSettings({ yearlyBookGoal: Math.round(v) });
              }}
              className="w-full rounded-lg border border-line bg-background px-3 py-2"
            />
          </label>
        </div>
      </section>

      {/* Share */}
      <section className="rounded-2xl border border-accent/40 bg-accent-soft/40 p-5 text-center">
        <h2 className="font-display text-xl font-semibold">
          Show off your reading
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          Get a shareable image of your stats — perfect for your book group.
        </p>
        <ShareStats />
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  dot,
}: {
  label: string;
  value: string;
  hint?: string;
  dot?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
