"use client";

// Reporting UI shared by the shared-catalog entries and reader profiles.
// Deliberately low-friction: a reason, an optional note, done.

import { useState } from "react";
import { sendJson } from "@/lib/api";

const BOOK_REASONS: [string, string][] = [
  ["wrong-cover", "Wrong or bad cover"],
  ["wrong-details", "Wrong title or author"],
  ["duplicate", "Duplicate of another book"],
  ["inappropriate", "Inappropriate content"],
  ["spam", "Spam or junk"],
  ["other", "Something else"],
];

const USER_REASONS: [string, string][] = [
  ["harassment", "Harassment or bullying"],
  ["inappropriate-content", "Inappropriate content"],
  ["spam", "Spam"],
  ["fake-account", "Fake account"],
  ["other", "Something else"],
];

export function ReportDialog({
  kind,
  targetId,
  targetLabel,
  onClose,
  onDone,
}: {
  kind: "book" | "user";
  targetId: string;
  targetLabel: string;
  onClose: () => void;
  onDone?: (message: string) => void;
}) {
  const reasons = kind === "book" ? BOOK_REASONS : USER_REASONS;
  const [reason, setReason] = useState(reasons[0][0]);
  const [note, setNote] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (kind === "book") {
        await sendJson("/api/books/report", "POST", {
          bookId: targetId,
          reason,
          note,
        });
        onDone?.("Thanks — a moderator will take a look.");
      } else {
        await sendJson("/api/users/report", "POST", {
          targetId,
          reason,
          note,
          blocked: alsoBlock,
        });
        onDone?.(
          alsoBlock
            ? "Reported and blocked. They can no longer contact you."
            : "Thanks — a moderator will take a look."
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <div>
          <h2 className="font-display text-xl font-semibold">
            Report {kind === "book" ? "this book" : "this reader"}
          </h2>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{targetLabel}</p>
        </div>

        <div className="space-y-1.5">
          {reasons.map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                reason === value
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-[var(--accent)]"
              />
              {label}
            </label>
          ))}
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Anything else we should know? (optional)"
          className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />

        {kind === "user" && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Also block them — removes the friendship and stops all contact
          </label>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send report"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
