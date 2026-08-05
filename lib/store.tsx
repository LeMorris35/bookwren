"use client";

// App-wide store. Data lives in localStorage so the app works with no account
// and no server. The provider hydrates after mount (localStorage doesn't exist
// during server rendering), so consumers check `ready` before trusting data.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  EMPTY_DATA,
  type AppData,
  type Book,
  type Deletion,
  type ReadingSession,
  type Settings,
} from "./types";
import { bookKey } from "./title-clean";

export type SyncState = "idle" | "syncing" | "synced" | "error";

const STORAGE_KEY = "shelfmark-data-v1";

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1) return EMPTY_DATA;
    return {
      ...EMPTY_DATA,
      ...parsed,
      // Ratings briefly ran 1–10; fold those back onto the 5-star scale
      books: parsed.books.map((b) =>
        b.rating && b.rating > 5 ? { ...b, rating: Math.round(b.rating / 2) } : b
      ),
      settings: { ...EMPTY_DATA.settings, ...parsed.settings },
    };
  } catch {
    return EMPTY_DATA;
  }
}

interface StoreValue {
  ready: boolean;
  data: AppData;
  addBook: (book: Omit<Book, "id" | "addedAt">) => Book;
  updateBook: (id: string, patch: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  addSession: (session: Omit<ReadingSession, "id" | "createdAt">) => void;
  deleteSession: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Set (or clear, with undefined count) a series' planned book total. */
  setSeriesPlanned: (name: string, plannedCount?: number) => void;
  /** Replace everything with a restored backup. */
  importData: (data: AppData) => void;
  /** Update many books at once, by id. Used by re-import/merge. */
  updateBooks: (patches: { id: string; patch: Partial<Book> }[]) => void;
  /** Bulk-add books from a Goodreads/StoryGraph import; returns them with ids. */
  importBooks: (
    books: (Omit<Book, "id" | "addedAt"> & { addedAt?: string })[]
  ) => Book[];
  /** Where this device stands with the server. */
  syncState: SyncState;
  /** Force a merge now (used by the Settings button). */
  syncNow: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  // Always-current snapshot, so sync() never sends a stale closure's data
  const latest = useRef<AppData>(EMPTY_DATA);
  latest.current = data;

  useEffect(() => {
    setData(loadData());
    hydrated.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked — data stays in memory for this visit.
    }
  }, [data]);

  /**
   * Two-way sync. Every signed-in device sends its whole library and adopts
   * the merged answer, so a phone and a laptop converge instead of one
   * overwriting the other.
   */
  const { isSignedIn } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const syncing = useRef(false);
  const adopting = useRef(false);

  const sync = useCallback(async (): Promise<void> => {
    if (!isSignedIn || !hydrated.current || syncing.current) return;
    syncing.current = true;
    setSyncState("syncing");
    try {
      const snapshot = latest.current;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: snapshot.books.map((b) => ({
            clientId: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl,
            format: b.format,
            status: b.status,
            finishedAt: b.finishedAt,
            rating: b.rating,
            review: b.review,
            totalPages: b.totalPages,
            seriesName: b.seriesName,
            seriesNumber: b.seriesNumber,
            tags: b.tags,
            addedAt: b.addedAt,
            updatedAt: b.updatedAt ?? b.addedAt,
          })),
          sessions: snapshot.sessions.map((s) => ({
            clientId: s.id,
            bookClientId: s.bookId,
            date: s.date,
            minutes: s.minutes,
            pagesRead: s.pagesRead ?? 0,
            endPage: s.endPage,
            updatedAt: s.updatedAt ?? s.createdAt,
          })),
          deletions: snapshot.deletions ?? [],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const merged = await res.json();

      // Adopt the merged snapshot. The flag stops this write from being
      // mistaken for a local edit and kicking off another sync.
      adopting.current = true;
      setData((d) => ({
        ...d,
        books: merged.books,
        sessions: merged.sessions,
        deletions: merged.deletions,
        lastSyncedAt: merged.syncedAt,
      }));
      setSyncState("synced");
    } catch {
      setSyncState("error");
    } finally {
      syncing.current = false;
    }
  }, [isSignedIn]);

  // Sync on sign-in, when the tab regains focus, and shortly after any edit
  useEffect(() => {
    if (!isSignedIn || !ready) return;
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isSignedIn, ready, sync]);

  useEffect(() => {
    if (!isSignedIn || !hydrated.current) return;
    if (adopting.current) {
      adopting.current = false;
      return;
    }
    const t = setTimeout(() => sync(), 1500);
    return () => clearTimeout(t);
  }, [data, isSignedIn, sync]);

  const addBook = useCallback((book: Omit<Book, "id" | "addedAt">): Book => {
    const now = new Date().toISOString();
    const full: Book = { ...book, id: newId(), addedAt: now, updatedAt: now };
    setData((d) => ({ ...d, books: [full, ...d.books] }));
    return full;
  }, []);

  const updateBooks = useCallback(
    (patches: { id: string; patch: Partial<Book> }[]) => {
      if (patches.length === 0) return;
      const now = new Date().toISOString();
      const byId = new Map(patches.map((p) => [p.id, p.patch]));
      setData((d) => ({
        ...d,
        books: d.books.map((b) =>
          byId.has(b.id) ? { ...b, ...byId.get(b.id)!, updatedAt: now } : b
        ),
      }));
    },
    []
  );

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    const now = new Date().toISOString();
    setData((d) => ({
      ...d,
      books: d.books.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: now } : b
      ),
    }));
  }, []);

  const deleteBook = useCallback((id: string) => {
    const now = new Date().toISOString();
    setData((d) => {
      const book = d.books.find((b) => b.id === id);
      const goneSessions = d.sessions.filter((s) => s.bookId === id);
      // Tombstones, so another device can't sync this book back to life
      const deletions: Deletion[] = [
        ...(d.deletions ?? []),
        ...(book
          ? [
              {
                kind: "book" as const,
                key: bookKey(book.title, book.author),
                deletedAt: now,
              },
            ]
          : []),
        ...goneSessions.map((s) => ({
          kind: "session" as const,
          key: s.id,
          deletedAt: now,
        })),
      ];
      return {
        ...d,
        books: d.books.filter((b) => b.id !== id),
        sessions: d.sessions.filter((s) => s.bookId !== id),
        deletions,
      };
    });
  }, []);

  const addSession = useCallback(
    (session: Omit<ReadingSession, "id" | "createdAt">) => {
      const now = new Date().toISOString();
      const full: ReadingSession = {
        ...session,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      setData((d) => ({ ...d, sessions: [full, ...d.sessions] }));
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    const now = new Date().toISOString();
    setData((d) => ({
      ...d,
      sessions: d.sessions.filter((s) => s.id !== id),
      deletions: [
        ...(d.deletions ?? []),
        { kind: "session" as const, key: id, deletedAt: now },
      ],
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const setSeriesPlanned = useCallback((name: string, plannedCount?: number) => {
    setData((d) => {
      const series = (d.series ?? []).filter((s) => s.name !== name);
      series.push({ name, plannedCount });
      return { ...d, series };
    });
  }, []);

  const importData = useCallback((restored: AppData) => {
    setData(restored);
  }, []);

  const importBooks = useCallback(
    (
      incoming: (Omit<Book, "id" | "addedAt"> & { addedAt?: string })[]
    ): Book[] => {
      const now = new Date().toISOString();
      const full: Book[] = incoming.map((b) => ({
        ...b,
        id: newId(),
        // Imports carry their original "date added" so the shelf keeps the
        // order it had in the other app.
        addedAt: b.addedAt ?? now,
      }));
      setData((d) => ({ ...d, books: [...full, ...d.books] }));
      return full;
    },
    []
  );

  return (
    <StoreContext.Provider
      value={{
        ready,
        data,
        addBook,
        updateBook,
        deleteBook,
        addSession,
        deleteSession,
        updateSettings,
        setSeriesPlanned,
        importData,
        importBooks,
        updateBooks,
        syncState,
        syncNow: sync,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
