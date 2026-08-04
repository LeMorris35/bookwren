"use client";

// A conversation. Book recommendations render as cards inside the thread,
// with the sender's stars and review — and a one-tap "Add to my library".

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { useStore } from "@/lib/store";
import { getJson, sendJson, type PublicUser } from "@/lib/api";

interface MessageBook {
  title: string;
  author: string | null;
  coverUrl: string | null;
  rating: number | null;
  review: string | null;
}

interface Message {
  id: string;
  fromMe: boolean;
  body: string | null;
  book: MessageBook | null;
  createdAt: string;
}

export default function ThreadPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { id: friendId } = useParams<{ id: string }>();
  const { data, addBook } = useStore();
  const [friend, setFriend] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ friend: PublicUser; messages: Message[] }>(
        `/api/messages/${friendId}`
      );
      setFriend(res.friend);
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    }
  }, [friendId]);

  useEffect(() => {
    if (isSignedIn) load();
  }, [isSignedIn, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await sendJson("/api/messages", "POST", { toUserId: friendId, body: text });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
      setDraft(text);
    }
  }

  function addToLibrary(book: MessageBook) {
    const exists = data.books.some(
      (b) =>
        b.title.toLowerCase() === book.title.toLowerCase() &&
        b.author.toLowerCase() === (book.author ?? "").toLowerCase()
    );
    if (exists) {
      setAdded(`“${book.title}” is already in your library`);
      return;
    }
    addBook({
      title: book.title,
      author: book.author ?? "Unknown author",
      coverUrl: book.coverUrl ?? undefined,
      format: "physical",
      status: "want",
    });
    setAdded(`Added “${book.title}” to Want to read`);
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Messages" />;

  if (error) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p>{error}</p>
        <Link href="/messages" className="mt-2 inline-block font-medium text-accent">
          ← All messages
        </Link>
      </div>
    );
  }
  if (!friend) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/messages" className="text-accent" aria-label="Back">
          ←
        </Link>
        {friend.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
            {friend.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">
            {friend.displayName}
          </p>
          <p className="truncate text-xs text-ink-muted">@{friend.username}</p>
        </div>
        <Link
          href={`/friends/${friend.id}`}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted"
        >
          Stats
        </Link>
      </div>

      {added && (
        <p className="mb-3 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink-muted">
          {added}
        </p>
      )}

      {/* Thread */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            Say hello — or send {friend.displayName.split(" ")[0]} a book from
            its page.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[85%] space-y-2">
              {m.book && (
                <div
                  className={`overflow-hidden rounded-2xl border ${
                    m.fromMe ? "border-accent/40 bg-accent-soft/40" : "border-line bg-surface"
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    {m.book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.book.coverUrl}
                        alt=""
                        className="h-24 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-chart-track text-xl">
                        📕
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold leading-snug">
                        {m.book.title}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {m.book.author}
                      </p>
                      {m.book.rating ? (
                        <p className="mt-1 text-sm text-accent">
                          {"★".repeat(m.book.rating)}
                          <span className="text-line">
                            {"★".repeat(5 - m.book.rating)}
                          </span>
                        </p>
                      ) : null}
                      {m.book.review && (
                        <p className="mt-1 text-xs italic text-ink-muted">
                          “{m.book.review}”
                        </p>
                      )}
                      {!m.fromMe && (
                        <button
                          type="button"
                          onClick={() => addToLibrary(m.book!)}
                          className="mt-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink"
                        >
                          + Add to my library
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {m.body && (
                <p
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    m.fromMe
                      ? "bg-accent text-accent-ink"
                      : "border border-line bg-surface"
                  }`}
                >
                  {m.body}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="sticky bottom-20 mt-4 flex gap-2 sm:bottom-4">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${friend.displayName.split(" ")[0]}…`}
          maxLength={2000}
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm shadow-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
