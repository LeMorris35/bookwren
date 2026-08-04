"use client";

// "Recommend to a friend" — sends the book as a chat message carrying your
// stars and your review, so the whole recommendation arrives in one bubble.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { getJson, sendJson, type FriendEntry } from "@/lib/api";
import type { Book } from "@/lib/types";

export function SendToFriend({ book }: { book: Book }) {
  const { isSignedIn } = useAuth();
  const [friends, setFriends] = useState<FriendEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [note, setNote] = useState("");
  const [includeRating, setIncludeRating] = useState(true);
  const [includeReview, setIncludeReview] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    getJson<{ friends: FriendEntry[] }>("/api/friends")
      .then((res) => {
        setFriends(res.friends);
        if (res.friends.length > 0) setToUserId(res.friends[0].user.id);
      })
      .catch(() => setFriends([]));
  }, [isSignedIn]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      await sendJson("/api/messages", "POST", {
        toUserId,
        body: note.trim() || undefined,
        book: {
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          rating: includeRating ? book.rating : undefined,
          review: includeReview ? book.review : undefined,
        },
      });
      setStatus("Sent! 📬");
      setNote("");
      setOpen(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  // Always visible so the feature is discoverable — the panel explains
  // itself when there's no one to send to yet.
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Recommend this book
          </h2>
          <p className="text-sm text-ink-muted">
            Send it to a friend with your rating and review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          {open ? "Close" : "📤 Recommend"}
        </button>
      </div>

      {status && <p className="mt-2 text-sm text-ink-muted">{status}</p>}

      {open && (
        <>
          {!isSignedIn ? (
            <p className="mt-4 rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink-muted">
              Sign in to send books to friends — it&apos;s free, and it&apos;s
              how the reading-together part works.
            </p>
          ) : friends === null ? null : friends.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink-muted">
              No friends on BookWren yet.{" "}
              <Link href="/friends" className="font-medium text-accent">
                Add a friend
              </Link>{" "}
              and you can send them books.
            </p>
          ) : (
            <form onSubmit={send} className="mt-4 space-y-3">
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                aria-label="Send to"
              >
                {friends.map((f) => (
                  <option key={f.user.id} value={f.user.id}>
                    {f.user.displayName} (@{f.user.username})
                  </option>
                ))}
              </select>

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="Add a note — “you HAVE to read this”"
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
              />

              {(book.rating || book.review) && (
                <div className="space-y-1.5 rounded-xl border border-line bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Include with it
                  </p>
                  {book.rating ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeRating}
                        onChange={(e) => setIncludeRating(e.target.checked)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      My rating{" "}
                      <span className="text-accent">
                        {"★".repeat(book.rating)}
                      </span>
                    </label>
                  ) : null}
                  {book.review ? (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeReview}
                        onChange={(e) => setIncludeReview(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0">
                        My review —{" "}
                        <span className="italic text-ink-muted">
                          “{book.review.slice(0, 60)}
                          {book.review.length > 60 ? "…" : ""}”
                        </span>
                      </span>
                    </label>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send book"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
