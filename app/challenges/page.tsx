"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import {
  getJson,
  sendJson,
  type ChallengeInvite,
  type ChallengeSummary,
} from "@/lib/api";
import {
  CHALLENGE_METRICS,
  METRIC_KEYS,
  type ChallengeMetric,
} from "@/lib/challenge-metrics";
import { todayKey } from "@/lib/dates";

export default function ChallengesPage() {
  return (
    <Suspense>
      <ChallengesGate />
    </Suspense>
  );
}

function ChallengesGate() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Reading challenges" />;
  return <ChallengesInner />;
}

function endOfMonthKey(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ChallengesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const autoJoined = useRef(false);

  // Create form
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<ChallengeMetric>("minutes");
  const [target, setTarget] = useState("300");
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(endOfMonthKey());

  const refresh = useCallback(async () => {
    try {
      const [list, inv] = await Promise.all([
        getJson<{ challenges: ChallengeSummary[] }>("/api/challenges"),
        getJson<{ invites: ChallengeInvite[] }>("/api/challenges/invites"),
      ]);
      setChallenges(list.challenges);
      setInvites(inv.invites);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load");
    }
  }, []);

  async function respondToInvite(inviteId: string, accept: boolean) {
    setMessage(null);
    try {
      const res = await sendJson<{ joined: boolean; challengeId?: string }>(
        "/api/challenges/invites",
        "POST",
        { inviteId, accept }
      );
      // Clear the card first — navigation can lag, and a stale invite
      // sitting there makes it look like the tap didn't register.
      await refresh();
      if (res.joined && res.challengeId) {
        router.push(`/challenges/${res.challengeId}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not respond");
    }
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Arrived via an invite link (/challenges?code=XXXXXX)? Join automatically.
  useEffect(() => {
    const code = params.get("code");
    if (!code || autoJoined.current) return;
    autoJoined.current = true;
    sendJson<{ challengeId: string }>("/api/challenges/join", "POST", { code })
      .then((res) => router.push(`/challenges/${res.challengeId}`))
      .catch((err) =>
        setMessage(err instanceof Error ? err.message : "Could not join")
      );
  }, [params, router]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await sendJson<{ challengeId: string }>(
        "/api/challenges/join",
        "POST",
        { code: joinCode }
      );
      router.push(`/challenges/${res.challengeId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not join");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await sendJson<{ challenge: { id: string } }>(
        "/api/challenges",
        "POST",
        { name, metric, target: Number(target), startDate, endDate }
      );
      router.push(`/challenges/${res.challenge.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Challenges</h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          {showCreate ? "Close" : "+ New challenge"}
        </button>
      </div>

      {message && (
        <p className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">
          {message}
        </p>
      )}

      {/* Invites from friends — the whole point: no code to type */}
      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">
            You&apos;re invited
          </h2>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-accent bg-accent-soft/40 p-4"
            >
              <p className="font-display text-lg font-semibold">
                🏆 {inv.challenge.name}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                <span className="font-medium">
                  {inv.from?.displayName ?? "A friend"}
                </span>{" "}
                invited you ·{" "}
                {CHALLENGE_METRICS[inv.challenge.metric].format(
                  inv.challenge.target
                )}{" "}
                · {inv.challenge.startDate} → {inv.challenge.endDate}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => respondToInvite(inv.id, true)}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink"
                >
                  Join challenge
                </button>
                <button
                  type="button"
                  onClick={() => respondToInvite(inv.id, false)}
                  className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-muted"
                >
                  No thanks
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {showCreate && (
        <form
          onSubmit={create}
          className="space-y-4 rounded-2xl border border-line bg-surface p-5"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Challenge name — “August Reading Sprint”"
            required
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {METRIC_KEYS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMetric(m);
                  setTarget(String(CHALLENGE_METRICS[m].defaultTarget));
                }}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  metric === m
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line text-ink-muted hover:border-accent"
                }`}
              >
                {CHALLENGE_METRICS[m].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">
                Goal ({CHALLENGE_METRICS[metric].goalHint})
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Starts</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-2 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Ends</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-2 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink"
          >
            Create &amp; get invite code
          </button>
        </form>
      )}

      {/* Join by code */}
      <form onSubmit={join} className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Have an invite code? e.g. K7XQ2M"
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm uppercase tracking-widest outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent"
        >
          Join
        </button>
      </form>

      {/* My challenges */}
      {challenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          <p className="font-medium">No challenges yet.</p>
          <p className="mt-1 text-sm">
            Start one and share the invite code with your book group — first to
            the goal gets bragging rights.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {challenges.map((c) => {
            const over = todayKey() > c.endDate;
            return (
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.id}`}
                  className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">{c.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        over
                          ? "bg-chart-track text-ink-muted"
                          : "bg-accent-soft text-accent"
                      }`}
                    >
                      {over ? "Ended" : "Active"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {CHALLENGE_METRICS[c.metric].format(c.target)} · {c.startDate}{" "}
                    → {c.endDate} · {c.participantCount} reader
                    {c.participantCount === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-xs text-ink-faint">
        Challenges count time you log while signed in — your friends see totals,
        never your individual books unless you share them.
      </p>
    </div>
  );
}
