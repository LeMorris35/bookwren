// Date helpers. All calendar math is done in the user's LOCAL timezone —
// a session logged at 11pm belongs to that day, not to tomorrow's UTC date.

/** Local calendar date as YYYY-MM-DD. */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toLocalDateKey(new Date());
}

/** Parse a YYYY-MM-DD key back into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

/** The last `n` date keys ending at (and including) today, oldest first. */
export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = todayKey();
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

/** Monday-start week key range containing the given date. */
export function weekRange(key: string): { start: string; end: string } {
  const d = fromDateKey(key);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const start = addDays(key, -dow);
  return { start, end: addDays(start, 6) };
}

export function monthPrefix(key: string): string {
  return key.slice(0, 7); // YYYY-MM
}

export function yearPrefix(key: string): string {
  return key.slice(0, 4); // YYYY
}

/** "2h 15m" / "45m" style label. */
export function formatMinutes(min: number): string {
  const rounded = Math.round(min);
  if (rounded < 60) return `${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "Mon", "Tue"… label for a date key. */
export function dayLabel(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: "short" });
}

/** "Jul 29" style label. */
export function shortDateLabel(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** "Jan", "Feb"… label for a YYYY-MM prefix. */
export function monthLabel(prefix: string): string {
  const [y, m] = prefix.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}
