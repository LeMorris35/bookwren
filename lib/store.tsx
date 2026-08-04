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
  type ReadingSession,
  type Settings,
} from "./types";

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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

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

  // Signed in? Mirror the library to the server (debounced) so friends can
  // see stats and challenges can count progress. Local data stays the source
  // of truth; a failed sync just retries on the next change.
  const { isSignedIn } = useAuth();
  useEffect(() => {
    if (!isSignedIn || !hydrated.current) return;
    const t = setTimeout(() => {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: data.books.map((b) => ({
            clientId: b.id,
            title: b.title,
            author: b.author,
            coverUrl: b.coverUrl,
            format: b.format,
            status: b.status,
            finishedAt: b.finishedAt,
          })),
          sessions: data.sessions.map((s) => ({
            clientId: s.id,
            bookClientId: s.bookId,
            date: s.date,
            minutes: s.minutes,
            pagesRead: s.pagesRead ?? 0,
          })),
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [data, isSignedIn]);

  const addBook = useCallback((book: Omit<Book, "id" | "addedAt">): Book => {
    const full: Book = { ...book, id: newId(), addedAt: new Date().toISOString() };
    setData((d) => ({ ...d, books: [full, ...d.books] }));
    return full;
  }, []);

  const updateBooks = useCallback(
    (patches: { id: string; patch: Partial<Book> }[]) => {
      if (patches.length === 0) return;
      const byId = new Map(patches.map((p) => [p.id, p.patch]));
      setData((d) => ({
        ...d,
        books: d.books.map((b) =>
          byId.has(b.id) ? { ...b, ...byId.get(b.id)! } : b
        ),
      }));
    },
    []
  );

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    setData((d) => ({
      ...d,
      books: d.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }, []);

  const deleteBook = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      books: d.books.filter((b) => b.id !== id),
      sessions: d.sessions.filter((s) => s.bookId !== id),
    }));
  }, []);

  const addSession = useCallback(
    (session: Omit<ReadingSession, "id" | "createdAt">) => {
      const full: ReadingSession = {
        ...session,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, sessions: [full, ...d.sessions] }));
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
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
