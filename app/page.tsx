"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { SITE } from "@/lib/site";
import { BookCover } from "@/components/BookCover";
import { RavenOnTwig, WrenOnTwig } from "@/components/WrenArt";
import { useTheme } from "@/lib/theme";
import { getJson, type ChallengeSummary, type LeaderboardRow } from "@/lib/api";
import { CHALLENGE_METRICS } from "@/lib/challenge-metrics";
import { ProgressRing } from "@/components/ProgressRing";
import { BarChart } from "@/components/BarChart";
import {
  booksFinishedThisYear,
  currentStreak,
  dailyTotals,
  minutesToday,
  minutesThisWeek,
} from "@/lib/stats";
import { dayLabel, formatMinutes, shortDateLabel, todayKey } from "@/lib/dates";

export default function HomePage() {
  const { ready, data, addSession } = useStore();
  const { theme } = useTheme();

  if (!ready) return null;

  const reading = data.books.filter((b) => b.status === "reading");
  const today = minutesToday(data.sessions);
  const goal = data.settings.dailyGoalMinutes;
  const streak = currentStreak(data.sessions);
  const week = dailyTotals(data.sessions, 7);
  const finished = booksFinishedThisYear(data);

  // Brand-new visitor → a calm, centered welcome — an app screen, not a webpage
  if (data.books.length === 0 && data.sessions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-16rem)] max-w-md flex-col items-center justify-center text-center">
        {theme === "raven" ? (
          <RavenOnTwig className="h-40 w-auto" />
        ) : (
          <WrenOnTwig className="h-40 w-auto" />
        )}
        <p className="mt-6 font-display text-4xl font-semibold leading-tight">
          Every minute you read counts.
          <span className="text-accent"> Start counting them.</span>
        </p>
        <p className="mt-3 text-ink-muted">
          Add the book you&apos;re reading, press the timer, and watch your
          streak grow.
        </p>
        <Link
          href="/library/add"
          className="mt-7 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-accent-ink"
        >
          Add your first book
        </Link>
        <p className="mt-6 whitespace-nowrap font-display text-sm italic text-ink-faint">
          {theme === "raven"
            ? "“…curious volume of forgotten lore.” — Poe"
            : "“Small, like the wren.” — Emily Dickinson"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Today */}
      <section className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center rounded-2xl border border-line bg-surface p-6">
          <ProgressRing progress={goal > 0 ? today / goal : 0} size={140}>
            <span className="font-display text-2xl font-semibold">
              {formatMinutes(today)}
            </span>
            <span className="text-xs text-ink-muted">of {formatMinutes(goal)} today</span>
          </ProgressRing>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatTile
            label="Streak"
            value={`${streak} day${streak === 1 ? "" : "s"}`}
            hint={streak > 0 ? "Keep it alive!" : "Read today to start one"}
            dot="bg-berry"
          />
          <StatTile
            label="This week"
            value={formatMinutes(minutesThisWeek(data.sessions))}
            dot="bg-foliage"
          />
          <StatTile
            label="Books this year"
            value={`${finished} of ${data.settings.yearlyBookGoal}`}
            dot="bg-chart-ebook"
          />
          <StatTile
            label="Books in library"
            value={String(data.books.length)}
            dot="bg-chart-audiobook"
          />
        </div>
      </section>

      <ActiveChallengeCard />

      {/* Currently reading */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Currently reading</h2>
          <Link href="/library" className="text-sm font-medium text-accent">
            Library →
          </Link>
        </div>
        {reading.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            Nothing on the go.{" "}
            <Link href="/library" className="font-medium text-accent">
              Pick your next book
            </Link>{" "}
            from your library.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reading.map((book) => (
              <div
                key={book.id}
                className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
              >
                <Link href={`/book/${book.id}`} className="w-16 shrink-0">
                  <BookCover book={book} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/book/${book.id}`}>
                    <p className="truncate font-semibold">{book.title}</p>
                    <p className="truncate text-sm text-ink-muted">{book.author}</p>
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[15, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          addSession({ bookId: book.id, date: todayKey(), minutes: m })
                        }
                        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        +{m}m
                      </button>
                    ))}
                    <Link
                      href={`/book/${book.id}`}
                      className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      More…
                    </Link>
                    <Link
                      href={`/timer?book=${book.id}`}
                      className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
                    >
                      ▶ Timer
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* This week */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Last 7 days</h2>
        <BarChart
          data={week.map((d) => ({
            label: dayLabel(d.date),
            tooltip: shortDateLabel(d.date),
            minutes: d.minutes,
          }))}
          goalMinutes={goal}
        />
        <p className="mt-3 text-xs text-ink-faint">
          Dashed line = your {formatMinutes(goal)} daily goal · change it in{" "}
          <Link href="/stats" className="text-accent">
            Stats
          </Link>
        </p>
      </section>

      <p className="text-center text-xs text-ink-faint">
        Enjoying {SITE.name}? Share it with your book club 📚
      </p>
    </div>
  );
}

/**
 * Your top active challenge, right on the home screen — the race should be
 * the first thing a signed-in reader sees after today's progress.
 */
function ActiveChallengeCard() {
  const { isSignedIn } = useAuth();
  const [card, setCard] = useState<{
    challenge: ChallengeSummary;
    progress: number;
    rank: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const { challenges } = await getJson<{ challenges: ChallengeSummary[] }>(
          "/api/challenges"
        );
        const today = new Date().toISOString().slice(0, 10);
        const active = challenges.find(
          (c) => c.startDate <= today && today <= c.endDate
        );
        if (!active) return;
        const detail = await getJson<{ leaderboard: LeaderboardRow[] }>(
          `/api/challenges/${active.id}`
        );
        const idx = detail.leaderboard.findIndex((r) => r.isYou);
        if (idx === -1) return;
        setCard({
          challenge: active,
          progress: detail.leaderboard[idx].progress,
          rank: idx + 1,
          total: detail.leaderboard.length,
        });
      } catch {
        // quiet — the dashboard shouldn't nag about network hiccups
      }
    })();
  }, [isSignedIn]);

  if (!card) return null;
  const { challenge, progress, rank, total } = card;
  const metric = CHALLENGE_METRICS[challenge.metric];
  const pct = Math.min(100, (progress / challenge.target) * 100);

  return (
    <section>
      <Link
        href={`/challenges/${challenge.id}`}
        className="block rounded-2xl border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:border-accent"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-display text-lg font-semibold">
            🏆 {challenge.name}
          </p>
          <span className="shrink-0 text-sm font-semibold text-accent">
            #{rank} of {total}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-chart-track">
          <div
            className="h-full rounded-full bg-accent/85"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          {metric.format(progress)} of {metric.format(challenge.target)} —{" "}
          {total > 1 && rank === 1
            ? "you're leading!"
            : total > 1
              ? "keep reading, they're ahead"
              : "invite friends to race you"}
        </p>
      </Link>
    </section>
  );
}

function StatTile({
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
