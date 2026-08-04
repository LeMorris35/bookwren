// Goodreads bakes the series into the title:
//   "Fourth Wing (The Empyrean, #1)"
// Searching that exact string finds nothing, which is why imported series
// books came back without covers. Splitting it also fills in the Series
// shelf for free.

export interface ParsedTitle {
  title: string;
  seriesName?: string;
  seriesNumber?: number;
}

/**
 * Pull the trailing "(Series, #3)" off a title.
 * Handles: "(Series, #3)", "(Series #3)", "(Series, Book 3)", "(Series)".
 */
export function parseTitle(raw: string): ParsedTitle {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!m) return { title: trimmed };

  const [, base, inside] = m;
  if (!base) return { title: trimmed };

  // "The Empyrean, #1" / "The Empyrean #1" / "The Empyrean, Book 1"
  const numbered = inside.match(/^(.*?)[,\s]+(?:#|book\s*|no\.?\s*)(\d+(?:\.\d+)?)$/i);
  if (numbered) {
    const [, seriesName, num] = numbered;
    return {
      title: base.trim(),
      seriesName: seriesName.trim() || undefined,
      seriesNumber: Number(num),
    };
  }

  // A bare parenthetical is usually an edition note ("Illustrated Edition"),
  // not a series — only treat it as a series when it says so.
  if (/\bseries\b/i.test(inside)) {
    return { title: base.trim(), seriesName: inside.replace(/\s*series\s*/i, "").trim() };
  }

  return { title: trimmed };
}

/** Search-friendly forms of a title, best guess first. */
export function titleCandidates(raw: string): string[] {
  const out: string[] = [];
  const parsed = parseTitle(raw);
  const push = (s: string) => {
    const v = s.trim();
    if (v && !out.includes(v)) out.push(v);
  };

  push(parsed.title);
  // "Title: A Novel" → "Title"
  const beforeColon = parsed.title.split(":")[0];
  if (beforeColon.length >= 4) push(beforeColon);
  // Last resort: whatever they actually typed
  push(raw);
  return out;
}

/** Normalised key for matching a book across an import and the library. */
export function bookKey(title: string, author: string): string {
  return `${parseTitle(title).title.toLowerCase()}|${author.trim().toLowerCase()}`
    .replace(/[^a-z0-9|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
