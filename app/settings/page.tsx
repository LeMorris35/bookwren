"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import { SITE } from "@/lib/site";
import { RavenMark, WrenMark } from "@/components/WrenArt";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { NotificationSettings } from "@/components/NotificationSettings";
import { FindCovers } from "@/components/FindCovers";
import { SyncStatus } from "@/components/SyncStatus";

const MODES: { value: ThemePref; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Wren by day, Raven 7 PM – 7 AM" },
  { value: "wren", label: "Wren", hint: "Always daylight" },
  { value: "raven", label: "Raven", hint: "Always midnight" },
];

export default function SettingsPage() {
  const { ready, data, updateSettings, importData } = useStore();
  const { pref, setPref } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!ready) return null;

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookwren-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (parsed.version !== 1 || !Array.isArray(parsed.books)) {
        throw new Error("That doesn't look like a BookWren backup");
      }
      importData({ ...EMPTY_DATA, ...parsed });
      setMessage(
        `Restored ${parsed.books.length} books and ${parsed.sessions?.length ?? 0} sessions ✓`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      {message && (
        <p className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">
          {message}
        </p>
      )}

      {/* Appearance */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-1 flex items-center gap-2">
          <WrenMark className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Appearance</h2>
          <RavenMark className="h-5 w-5 text-ink-faint" />
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          The wren sings all day; the raven keeps the night watch.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setPref(m.value)}
              className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                pref === m.value
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:border-accent"
              }`}
            >
              <span
                className={`block font-display text-lg font-semibold ${
                  pref === m.value ? "text-accent" : ""
                }`}
              >
                {m.label}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">{m.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <NotificationSettings />

      {/* Goals */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Goals</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">
              Daily minutes
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={data.settings.dailyGoalMinutes}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0)
                  updateSettings({ dailyGoalMinutes: Math.round(v) });
              }}
              className="w-full rounded-lg border border-line bg-background px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-muted">
              Books per year
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={data.settings.yearlyBookGoal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0)
                  updateSettings({ yearlyBookGoal: Math.round(v) });
              }}
              className="w-full rounded-lg border border-line bg-background px-3 py-2"
            />
          </label>
        </div>
      </section>

      {/* ── Your library: every book-wrangling tool in one place ── */}
      <div className="pt-2">
        <h2 className="font-display text-xl font-semibold">Your library</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {data.books.length} book{data.books.length === 1 ? "" : "s"} ·{" "}
          {data.sessions.length} reading session
          {data.sessions.length === 1 ? "" : "s"} · stored on this device
        </p>
      </div>

      <SyncStatus />

      {/* Import & repair */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-semibold">
          Import from another app
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Bring your shelves over from Goodreads or The StoryGraph — ratings,
          finish dates and all. Already imported once? Run it again with{" "}
          <span className="font-medium">Repair books I already have</span> to
          fix dates, series and covers without creating duplicates.
        </p>
        <Link
          href="/import"
          className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
        >
          Import or repair books
        </Link>
      </section>

      <FindCovers />

      {/* Backup */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-semibold">Backup</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Your library lives in this browser, so it&apos;s worth keeping a
          copy. Restoring replaces everything currently on this device.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={exportBackup}
            className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink"
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex-1 rounded-full border border-line py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Restore backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importBackup}
          />
        </div>
      </section>

      <p className="text-center text-xs text-ink-faint">
        {SITE.name} · a free tool by {SITE.brand.name}
      </p>
    </div>
  );
}
