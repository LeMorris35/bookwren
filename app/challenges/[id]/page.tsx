"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { getJson, sendJson, type LeaderboardRow } from "@/lib/api";
import {
  CHALLENGE_METRICS,
  type ChallengeMetric,
} from "@/lib/challenge-metrics";
import { fromDateKey, todayKey } from "@/lib/dates";
import { SITE } from "@/lib/site";
import { InviteFriends } from "@/components/InviteFriends";

interface ChallengeDetail {
  challenge: {
    id: string;
    name: string;
    metric: ChallengeMetric;
    target: number;
    startDate: string;
    endDate: string;
    inviteCode: string;
    creatorId: string;
  };
  leaderboard: LeaderboardRow[];
}

export default function ChallengePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const refresh = useCallback(() => {
    getJson<ChallengeDetail>(`/api/challenges/${id}`)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load")
      );
  }, [id]);

  useEffect(() => {
    if (isSignedIn) refresh();
  }, [isSignedIn, refresh]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Reading challenges" />;

  if (error) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p>{error}</p>
        <Link href="/challenges" className="mt-2 inline-block font-medium text-accent">
          ← All challenges
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { challenge, leaderboard } = data;
  const today = todayKey();
  const over = today > challenge.endDate;
  const daysLeft = Math.max(
    0,
    Math.round(
      (fromDateKey(challenge.endDate).getTime() - fromDateKey(today).getTime()) /
        86400000
    )
  );
  const metricDef = CHALLENGE_METRICS[challenge.metric];
  const fmt = metricDef.format;

  async function copyInvite() {
    const text = `Join my ${challenge.name} reading challenge on ${SITE.name}! Go to ${window.location.origin}/challenges?code=${challenge.inviteCode} — code: ${challenge.inviteCode}`;
    // Native share sheet on phones — the invite goes straight into iMessage
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${challenge.name}`, text });
        return;
      } catch {
        // cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — show the code, it's on screen anyway
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold">{challenge.name}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              over ? "bg-chart-track text-ink-muted" : "bg-accent-soft text-accent"
            }`}
          >
            {over ? "Ended" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Goal: {fmt(challenge.target)} · {challenge.startDate} →{" "}
          {challenge.endDate}
        </p>
      </div>

      {/* Friends already on BookWren — one tap, no code */}
      <InviteFriends challengeId={challenge.id} />

      {/* Invite code, for people who aren't on BookWren yet */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft/40 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Invite code — for anyone not on BookWren
          </p>
          <p className="font-display text-2xl font-semibold tracking-[0.2em]">
            {challenge.inviteCode}
          </p>
        </div>
        <button
          type="button"
          onClick={copyInvite}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          {copied ? "Copied ✓" : "Copy invite"}
        </button>
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Leaderboard</h2>
        <ol className="space-y-2.5">
          {leaderboard.map((row, i) => {
            const pct = Math.min(100, (row.progress / challenge.target) * 100);
            const done = row.progress >= challenge.target;
            return (
              <li
                key={row.user.id}
                className={`rounded-2xl border p-3.5 ${
                  row.isYou ? "border-accent bg-accent-soft/30" : "border-line bg-surface"
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className="w-6 text-center font-display text-lg font-semibold text-ink-muted">
                    {i === 0 && row.progress > 0 ? "🏆" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.user.displayName}
                    {row.isYou && <span className="text-accent"> (you)</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {fmt(row.progress)}
                    {done && " 🎉"}
                  </span>
                </div>
                <div className="ml-8 h-2 overflow-hidden rounded-full bg-chart-track">
                  <div
                    className={`h-full rounded-full ${done ? "bg-chart-ebook" : "bg-accent/80"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-ink-faint">
          Progress counts {metricDef.label.toLowerCase()} logged between the
          start and end dates by signed-in readers.
        </p>
      </section>

      <div className="flex items-center justify-between pt-2">
        <Link href="/challenges" className="text-sm font-medium text-accent">
          ← All challenges
        </Link>
        {confirmLeave ? (
          <span className="space-x-3 text-sm">
            <button
              type="button"
              onClick={async () => {
                await sendJson(`/api/challenges/${challenge.id}`, "DELETE");
                router.push("/challenges");
              }}
              className="font-semibold text-danger"
            >
              Yes, leave
            </button>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="text-ink-muted"
            >
              Stay
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="text-sm text-ink-faint hover:text-danger"
          >
            Leave challenge
          </button>
        )}
      </div>
    </div>
  );
}
