"use client";

// Moderation queue. Access is granted by the ADMIN_USER_IDS env var and
// enforced server-side — non-moderators just get "not found".

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { getJson, sendJson } from "@/lib/api";

interface BookReportRow {
  id: string;
  reason: string;
  note: string | null;
  createdAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverData: string | null;
    hidden: boolean;
    addedCount: number;
  };
}

interface UserReportRow {
  id: string;
  reason: string;
  note: string | null;
  blocked: boolean;
  createdAt: string;
  reporter: { username: string; displayName: string } | null;
  target: { id: string; username: string; displayName: string } | null;
}

export default function AdminReportsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [bookReports, setBookReports] = useState<BookReportRow[]>([]);
  const [userReports, setUserReports] = useState<UserReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getJson<{
        bookReports: BookReportRow[];
        userReports: UserReportRow[];
      }>("/api/admin/reports");
      setBookReports(res.bookReports);
      setUserReports(res.userReports);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports");
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) refresh();
  }, [isSignedIn, refresh]);

  async function act(action: string, payload: Record<string, string>) {
    await sendJson("/api/admin/reports", "POST", { action, ...payload });
    await refresh();
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Moderation" />;

  if (error) {
    return (
      <p className="py-16 text-center text-ink-muted">
        {error === "Not found" ? "Nothing here." : error}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Moderation</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {bookReports.length} book report{bookReports.length === 1 ? "" : "s"} ·{" "}
          {userReports.length} reader report{userReports.length === 1 ? "" : "s"}
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">
          Catalog entries
        </h2>
        {bookReports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            Nothing reported. The catalog is clean.
          </p>
        ) : (
          <ul className="space-y-3">
            {bookReports.map((r) => (
              <li
                key={r.id}
                className="flex gap-3 rounded-2xl border border-line bg-surface p-3"
              >
                {r.book.coverData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.book.coverData}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-chart-track text-xl">
                    📕
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {r.book.title}
                    {r.book.hidden && (
                      <span className="ml-2 rounded-full bg-chart-track px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                        hidden
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {r.book.author} · {r.book.addedCount} reader
                    {r.book.addedCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs">
                    <span className="font-medium text-danger">{r.reason}</span>
                    {r.note ? ` — “${r.note}”` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.book.hidden ? (
                      <button
                        type="button"
                        onClick={() => act("restore-book", { bookId: r.book.id })}
                        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act("hide-book", { bookId: r.book.id })}
                        className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink"
                      >
                        Hide
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => act("delete-book", { bookId: r.book.id })}
                      className="rounded-full border border-danger/50 px-3 py-1 text-xs font-medium text-danger"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        act("resolve-book-report", { reportId: r.id })
                      }
                      className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Readers</h2>
        {userReports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            No reader reports.
          </p>
        ) : (
          <ul className="space-y-3">
            {userReports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-3">
                <p className="text-sm">
                  <span className="font-semibold">
                    @{r.reporter?.username ?? "someone"}
                  </span>{" "}
                  reported{" "}
                  <span className="font-semibold">
                    @{r.target?.username ?? "someone"}
                  </span>
                  {r.blocked && (
                    <span className="ml-2 rounded-full bg-chart-track px-2 py-0.5 text-[11px] text-ink-muted">
                      blocked
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs">
                  <span className="font-medium text-danger">{r.reason}</span>
                  {r.note ? ` — “${r.note}”` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => act("resolve-user-report", { reportId: r.id })}
                  className="mt-2 rounded-full border border-line px-3 py-1 text-xs text-ink-muted"
                >
                  Mark handled
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
