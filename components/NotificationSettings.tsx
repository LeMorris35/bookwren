"use client";

// Notification controls. Only meaningful inside the iOS app, so on the web
// it explains where to find them rather than pretending they work.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getJson, sendJson } from "@/lib/api";
import { isNative } from "@/lib/native";
import { askForPush } from "@/components/PushRegistration";

interface Prefs {
  social: boolean;
  challenges: boolean;
  streak: boolean;
  streakHour: number;
  utcOffsetMinutes: number;
}

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function NotificationSettings() {
  const { isSignedIn } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [permission, setPermission] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ prefs: Prefs }>("/api/notification-prefs");
      setPrefs(res.prefs);
    } catch {}
  }, []);

  useEffect(() => {
    if (isSignedIn) load();
  }, [isSignedIn, load]);

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    // Send the phone's timezone along so "8 PM" means their 8 PM
    await sendJson("/api/notification-prefs", "PATCH", {
      ...patch,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    }).catch(() => {});
  }

  async function enablePush() {
    setBusy(true);
    const result = await askForPush();
    setPermission(result);
    setBusy(false);
  }

  if (!isSignedIn) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to get notified when a friend sends you a book or invites you
          to a challenge.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">Notifications</h2>

      {!isNative() ? (
        <p className="mt-1 text-sm text-ink-muted">
          Push notifications work in the BookWren iPhone app. Your choices here
          are saved and will apply as soon as you open it on your phone.
        </p>
      ) : (
        <div className="mt-2">
          <button
            type="button"
            onClick={enablePush}
            disabled={busy}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {busy ? "Asking…" : "Turn on notifications"}
          </button>
          {permission === "denied" && (
            <p className="mt-2 text-sm text-danger">
              iOS is blocking them. Open Settings → BookWren → Notifications to
              allow.
            </p>
          )}
          {permission === "granted" && (
            <p className="mt-2 text-sm text-ink-muted">All set ✓</p>
          )}
        </div>
      )}

      {prefs && (
        <div className="mt-4 space-y-3">
          <Toggle
            label="Friends"
            hint="Books sent to you, friend requests, messages"
            checked={prefs.social}
            onChange={(v) => save({ social: v })}
          />
          <Toggle
            label="Challenges"
            hint="Invites, someone passing you, a challenge ending"
            checked={prefs.challenges}
            onChange={(v) => save({ challenges: v })}
          />
          <Toggle
            label="Streak reminder"
            hint="One nudge in the evening, only if you haven't read yet"
            checked={prefs.streak}
            onChange={(v) => save({ streak: v })}
          />
          {prefs.streak && (
            <label className="ml-1 flex items-center gap-2 text-sm text-ink-muted">
              Remind me at
              <select
                value={prefs.streakHour}
                onChange={(e) => save({ streakHour: Number(e.target.value) })}
                className="rounded-lg border border-line bg-background px-2 py-1"
              >
                {[17, 18, 19, 20, 21, 22].map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
