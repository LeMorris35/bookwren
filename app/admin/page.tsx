"use client";

// Admin hub — the landing page behind the Admin tab. Only moderators
// (ADMIN_USER_IDS) ever see the tab, and every tool behind it re-checks
// server-side, so this page is a menu, not a security boundary.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignInGate } from "@/components/SignInGate";
import { getJson } from "@/lib/api";

interface Me {
  isAdmin: boolean;
  profile: { displayName: string };
}

export default function AdminHubPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    getJson<Me>("/api/me")
      .then(setMe)
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [isSignedIn]);

  useEffect(() => {
    if (!me?.isAdmin) return;
    getJson<{ bookReports: unknown[]; userReports: unknown[] }>(
      "/api/admin/reports"
    )
      .then((r) => setOpenReports(r.bookReports.length + r.userReports.length))
      .catch(() => {});
  }, [me]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignInGate feature="Admin" />;
  if (!checked) return null;
  if (!me?.isAdmin) {
    return <p className="py-16 text-center text-ink-muted">Nothing here.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hey {me.profile.displayName.split(" ")[0]} — the keys to the nest.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/reports"
          className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
        >
          <p className="text-2xl">⚑</p>
          <p className="mt-2 font-display text-lg font-semibold">Moderation</p>
          <p className="mt-1 text-sm text-ink-muted">
            Reported books and readers. Hide, restore, delete, or dismiss.
          </p>
          {openReports !== null && (
            <p
              className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                openReports > 0
                  ? "bg-accent text-accent-ink"
                  : "bg-chart-track text-ink-muted"
              }`}
            >
              {openReports === 0
                ? "All clear"
                : `${openReports} waiting`}
            </p>
          )}
        </Link>

        <Link
          href="/brand"
          className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
        >
          <p className="text-2xl">🎨</p>
          <p className="mt-2 font-display text-lg font-semibold">Brand kit</p>
          <p className="mt-1 text-sm text-ink-muted">
            Logos, colors, fonts, voice, and ready-to-paste copy for posts.
          </p>
          <p className="mt-2 inline-block rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Downloads + copy
          </p>
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-muted">
        <p className="font-display text-base font-semibold text-ink">
          Good to know
        </p>
        <ul className="mt-2 space-y-1.5">
          <li>
            • Catalog entries auto-hide once <strong>2 readers</strong>{" "}
            report them — you don&apos;t have to catch everything live.
          </li>
          <li>
            • Blocking is personal and instant: it removes the friendship and
            stops all contact between those two readers.
          </li>
          <li>
            • This tab only appears for moderator accounts. Everyone else gets
            &ldquo;Nothing here.&rdquo;
          </li>
        </ul>
      </div>
    </div>
  );
}
