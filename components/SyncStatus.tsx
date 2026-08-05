"use client";

// Sync across devices. Signed-out readers keep everything on one device;
// signing in merges the phone and the laptop into one library.

import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useStore } from "@/lib/store";

function agoLabel(iso?: string): string {
  if (!iso) return "not yet";
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString();
}

export function SyncStatus() {
  const { isSignedIn } = useAuth();
  const { data, syncState, syncNow } = useStore();

  if (!isSignedIn) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-semibold">
          Sync across devices
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Right now this library lives only on this device. Sign in and your
          phone, tablet and computer all keep the same books, streaks and
          stats — and it doubles as a backup.
        </p>
        <SignInButton mode="modal">
          <button className="mt-3 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            Sign in to sync
          </button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">
            Sync across devices
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {syncState === "syncing"
              ? "Merging with your other devices…"
              : syncState === "error"
                ? "Couldn't reach the server — your books are safe here and it'll try again."
                : `Last synced ${agoLabel(data.lastSyncedAt)}.`}
          </p>
        </div>
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            syncState === "error"
              ? "bg-danger"
              : syncState === "syncing"
                ? "bg-buff"
                : "bg-chart-ebook"
          }`}
          aria-hidden
        />
      </div>
      <button
        type="button"
        onClick={() => syncNow()}
        disabled={syncState === "syncing"}
        className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {syncState === "syncing" ? "Syncing…" : "Sync now"}
      </button>
      <p className="mt-2 text-xs text-ink-faint">
        Books are matched by title and author, so the same book added on two
        devices stays one book. The most recent edit wins.
      </p>
    </section>
  );
}
