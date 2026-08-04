"use client";

// Tap-to-invite panel: your friends list, each with one button. No codes,
// no copying — the invite lands in their Challenges tab.

import { useCallback, useEffect, useState } from "react";
import { getJson, sendJson, type PublicUser } from "@/lib/api";

type InviteState = "none" | "invited" | "joined" | "declined";

interface FriendRow extends PublicUser {
  state: InviteState;
}

export function InviteFriends({ challengeId }: { challengeId: string }) {
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getJson<{ friends: FriendRow[] }>(
        `/api/challenges/${challengeId}/invite`
      );
      setFriends(res.friends);
    } catch {
      setFriends([]);
    }
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function invite(friend: FriendRow) {
    setBusyId(friend.id);
    setError(null);
    try {
      await sendJson(`/api/challenges/${challengeId}/invite`, "POST", {
        toUserId: friend.id,
      });
      setFriends((list) =>
        list?.map((f) => (f.id === friend.id ? { ...f, state: "invited" } : f)) ??
        null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setBusyId(null);
    }
  }

  if (!friends) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Invite your friends</h2>
      {friends.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          No friends on BookWren yet — add some on the{" "}
          <a href="/friends" className="font-medium text-accent">
            Friends page
          </a>
          , or share the invite code below with anyone.
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-sm text-ink-muted">
            One tap — it shows up in their Challenges tab.
          </p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <ul className="mt-3 divide-y divide-line">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                {f.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {f.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {f.displayName}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    @{f.username}
                  </span>
                </span>
                {f.state === "joined" ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    Racing you 🏆
                  </span>
                ) : f.state === "invited" ? (
                  <span className="shrink-0 rounded-full bg-chart-track px-3 py-1 text-xs font-medium text-ink-muted">
                    Invited ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => invite(f)}
                    disabled={busyId === f.id}
                    className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-60"
                  >
                    {busyId === f.id
                      ? "…"
                      : f.state === "declined"
                        ? "Ask again"
                        : "Invite"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
