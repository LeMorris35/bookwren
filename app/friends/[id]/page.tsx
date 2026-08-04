"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { ReportDialog } from "@/components/ReportDialog";
import { getJson, type PublicUser } from "@/lib/api";
import { formatMinutes, todayKey } from "@/lib/dates";

interface ShelfBook {
  title: string;
  author: string;
  coverUrl?: string | null;
  format: string;
}

interface FriendStats {
  user: PublicUser;
  stats: {
    streak: number;
    minutesToday: number;
    minutesThisWeek: number;
    minutesThisMonth: number;
    minutesThisYear: number;
    totalMinutes: number;
    pagesThisYear: number;
    booksFinishedThisYear: number;
  };
  favoriteAuthor: { author: string; books: number } | null;
  currentlyReading: ShelfBook[];
  recentlyFinished: ShelfBook[];
}

export default function FriendStatsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<FriendStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    getJson<FriendStats>(`/api/users/${id}/stats?today=${todayKey()}`)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load stats")
      );
  }, [id, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Read together" />;

  if (error) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p>{error}</p>
        <Link href="/friends" className="mt-2 inline-block font-medium text-accent">
          ← Back to friends
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { user, stats } = data;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold">{user.displayName}</h1>
          <p className="text-sm text-ink-muted">@{user.username}</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Tile label="Streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
        <Tile label="This week" value={formatMinutes(stats.minutesThisWeek)} />
        <Tile label="This month" value={formatMinutes(stats.minutesThisMonth)} />
        <Tile label="This year" value={formatMinutes(stats.minutesThisYear)} />
        <Tile label="All time" value={formatMinutes(stats.totalMinutes)} />
        <Tile label="Books this year" value={String(stats.booksFinishedThisYear)} />
        <Tile label="Pages this year" value={stats.pagesThisYear.toLocaleString()} />
        {data.favoriteAuthor && (
          <div className="col-span-2 rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Favorite author
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {data.favoriteAuthor.author}
            </p>
          </div>
        )}
      </section>

      <Shelf title="Currently reading" books={data.currentlyReading} empty="Nothing on the go right now." />
      <Shelf title="Recently finished" books={data.recentlyFinished} empty="No finished books yet." />

      <div className="flex items-center justify-between border-t border-line pt-4">
        <Link href="/friends" className="text-sm font-medium text-accent">
          ← Back to friends
        </Link>
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="text-sm text-ink-faint transition-colors hover:text-danger"
        >
          ⚑ Report or block
        </button>
      </div>

      {reporting && (
        <ReportDialog
          kind="user"
          targetId={user.id}
          targetLabel={`${user.displayName} (@${user.username})`}
          onClose={() => setReporting(false)}
          onDone={(msg) => {
            setNotice(msg);
            router.push("/friends");
          }}
        />
      )}
      {notice && <p className="text-center text-sm text-ink-muted">{notice}</p>}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Shelf({
  title,
  books,
  empty,
}: {
  title: string;
  books: ShelfBook[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold">{title}</h2>
      {books.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-ink-muted">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {books.map((b, i) => (
            <div key={i} title={`${b.title} — ${b.author}`}>
              {b.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.coverUrl}
                  alt={`Cover of ${b.title}`}
                  className="aspect-[2/3] w-full rounded-lg border border-line object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border border-line bg-chart-track p-2 text-center text-[10px] font-medium text-ink-muted">
                  {b.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
