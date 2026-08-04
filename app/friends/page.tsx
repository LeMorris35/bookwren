"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { useStore } from "@/lib/store";
import {
  getJson,
  sendJson,
  type FriendEntry,
  type PublicUser,
} from "@/lib/api";

export default function FriendsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Read together" />;
  return (
    <Suspense>
      <FriendsInner />
    </Suspense>
  );
}

function FriendsInner() {
  const { addBook } = useStore();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [addName, setAddName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([
        getJson<{ profile: PublicUser }>("/api/me"),
        getJson<{
          friends: FriendEntry[];
          incoming: FriendEntry[];
          outgoing: FriendEntry[];
        }>("/api/friends"),
      ]);
      setProfile(me.profile);
      setFriends(list.friends);
      setIncoming(list.incoming);
      setOutgoing(list.outgoing);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load friends");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Arrived via an invite link (/friends?add=username)? Send the request.
  const params = useSearchParams();
  const autoAdded = useRef(false);
  useEffect(() => {
    const add = params.get("add");
    if (!add || autoAdded.current) return;
    autoAdded.current = true;
    sendJson("/api/friends", "POST", { username: add })
      .then(() => {
        setMessage(`Friend request sent to @${add.replace(/^@/, "")}!`);
        refresh();
      })
      .catch((err) =>
        setMessage(err instanceof Error ? err.message : "Could not add friend")
      );
  }, [params, refresh]);

  // Native share sheet on phones, clipboard on desktop
  async function inviteFriends() {
    if (!profile) return;
    const link = `${window.location.origin}/friends?add=${profile.username}`;
    const text = `Add me on BookWren — I'm @${profile.username}. Free reading tracker with streaks, challenges & friends: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add me on BookWren", text });
        return;
      } catch {
        // cancelled — fall through
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Invite copied — paste it anywhere!");
    } catch {
      setMessage(`Share this link: ${link}`);
    }
  }

  async function act(fn: () => Promise<unknown>, successMsg?: string) {
    setMessage(null);
    try {
      await fn();
      if (successMsg) setMessage(successMsg);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="font-display text-2xl font-semibold">Friends</h1>

      <Link
        href="/challenges"
        className="flex items-center justify-between rounded-2xl border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:border-accent"
      >
        <span>
          <span className="block font-display text-lg font-semibold">
            🏆 Reading challenges
          </span>
          <span className="block text-sm text-ink-muted">
            Race your friends to a goal — minutes or books
          </span>
        </span>
        <span className="text-accent">→</span>
      </Link>

      {/* My identity card */}
      {profile && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.displayName}</p>
              {editingName === null ? (
                <p className="text-sm text-ink-muted">
                  @{profile.username}{" "}
                  <button
                    type="button"
                    onClick={() => setEditingName(profile.username)}
                    className="text-accent"
                  >
                    edit
                  </button>
                </p>
              ) : (
                <form
                  className="mt-1 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await sendJson("/api/me", "PATCH", {
                        username: editingName,
                      });
                      setEditingName(null);
                    }, "Username updated");
                  }}
                >
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-40 rounded-lg border border-line bg-background px-2 py-1 text-sm"
                    aria-label="New username"
                  />
                  <button type="submit" className="text-sm font-medium text-accent">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(null)}
                    className="text-sm text-ink-muted"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
            <button
              type="button"
              onClick={inviteFriends}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              📤 Invite friends
            </button>
          </div>
        </section>
      )}

      {message && (
        <p className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">
          {message}
        </p>
      )}

      {/* Add friend */}
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Add a friend</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addName.trim()) return;
            act(async () => {
              await sendJson("/api/friends", "POST", { username: addName });
              setAddName("");
            }, "Request sent!");
          }}
        >
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="@username"
            className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
          >
            Send request
          </button>
        </form>
      </section>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">
            Requests for you
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {incoming.map((f) => (
              <li key={f.friendshipId} className="flex items-center gap-3 p-3">
                <Avatar user={f.user} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {f.user.displayName}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    @{f.user.username}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    act(() =>
                      sendJson("/api/friends/respond", "POST", {
                        friendshipId: f.friendshipId,
                        accept: true,
                      })
                    )
                  }
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-ink"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(() =>
                      sendJson("/api/friends/respond", "POST", {
                        friendshipId: f.friendshipId,
                        accept: false,
                      })
                    )
                  }
                  className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink-muted"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Messages — where books friends send you now land */}
      <Link
        href="/messages"
        className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
      >
        <span>
          <span className="block font-display text-lg font-semibold">
            💬 Messages
          </span>
          <span className="block text-sm text-ink-muted">
            Chat with friends — and the books they send you
          </span>
        </span>
        <span className="text-accent">→</span>
      </Link>

      {/* Friends list */}
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">
          Your friends · {friends.length}
        </h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            No friends yet — send a request above, or share your @username in
            your book group.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {friends.map((f) => (
              <li key={f.friendshipId}>
                <Link
                  href={`/friends/${f.user.id}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-accent-soft/40"
                >
                  <Avatar user={f.user} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {f.user.displayName}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      @{f.user.username}
                    </span>
                  </span>
                  <span className="text-sm text-accent">View stats →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Sent requests</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {outgoing.map((f) => (
              <li key={f.friendshipId} className="flex items-center gap-3 p-3">
                <Avatar user={f.user} />
                <span className="min-w-0 flex-1 text-sm text-ink-muted">
                  @{f.user.username} — waiting
                </span>
                <button
                  type="button"
                  onClick={() =>
                    act(() => sendJson(`/api/friends/${f.friendshipId}`, "DELETE"))
                  }
                  className="text-xs text-ink-faint hover:text-danger"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Avatar({ user }: { user: PublicUser }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
      {user.displayName.charAt(0).toUpperCase()}
    </div>
  );
}
