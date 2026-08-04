"use client";

// Conversation list. Book recommendations live here too — a rec is just a
// message with a book attached.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { getJson, type PublicUser } from "@/lib/api";

interface Thread {
  user: PublicUser;
  unread: number;
  lastMessage: {
    body: string | null;
    bookTitle: string | null;
    fromMe: boolean;
    createdAt: string;
  };
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0)
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    getJson<{ threads: Thread[] }>("/api/messages")
      .then((r) => setThreads(r.threads))
      .catch(() => setThreads([]));
  }, [isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Messages" />;
  if (!threads) return null;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold">Messages</h1>
        <Link href="/friends" className="text-sm font-medium text-accent">
          Friends →
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          <p className="text-3xl">💬</p>
          <p className="mt-2 font-medium">No messages yet.</p>
          <p className="mt-1 text-sm">
            Open a friend from your{" "}
            <Link href="/friends" className="font-medium text-accent">
              Friends list
            </Link>{" "}
            to start chatting — or send them a book from any book&apos;s page.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {threads.map((t) => (
            <li key={t.user.id}>
              <Link
                href={`/messages/${t.user.id}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-accent-soft/40"
              >
                {t.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.user.avatarUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                    {t.user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">
                      {t.user.displayName}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {whenLabel(t.lastMessage.createdAt)}
                    </span>
                  </span>
                  <span
                    className={`block truncate text-sm ${
                      t.unread > 0 ? "font-medium text-ink" : "text-ink-muted"
                    }`}
                  >
                    {t.lastMessage.fromMe && "You: "}
                    {t.lastMessage.bookTitle
                      ? `📖 ${t.lastMessage.bookTitle}`
                      : t.lastMessage.body}
                  </span>
                </span>
                {t.unread > 0 && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">
                    {t.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
