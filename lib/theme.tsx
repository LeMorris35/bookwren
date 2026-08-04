"use client";

// Wren mode / Raven mode with three preferences:
//   auto  — Wren by day, Raven from 7 PM to 7 AM (the default)
//   wren  — always daylight
//   raven — always midnight
// The resolved theme lives on <html data-theme> (stamped pre-paint by an
// inline script, so there's no flash). Changing it crossfades like a sunset.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "wren" | "raven";
export type ThemePref = "auto" | Theme;

const PREF_KEY = "bookwren-theme-pref";
const LEGACY_KEY = "bookwren-theme";
const VISITED_KEY = "bookwren-visited";
const FIRST_VISIT_KEY = "bookwren-first-visit";
const NIGHT_START = 19; // 7 PM
const NIGHT_END = 7; // 7 AM

export function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "auto") return pref;
  // A brand-new visitor always lands in daylight — the wren makes the first
  // impression. Auto night mode starts on their next session.
  try {
    if (sessionStorage.getItem(FIRST_VISIT_KEY)) return "wren";
  } catch {}
  const h = new Date().getHours();
  return h >= NIGHT_START || h < NIGHT_END ? "raven" : "wren";
}

const ThemeContext = createContext<{
  theme: Theme;
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
  toggle: () => void;
}>({ theme: "wren", pref: "auto", setPref: () => {}, toggle: () => {} });

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  root.classList.add("theme-shifting");
  root.dataset.theme = theme;
  window.setTimeout(() => root.classList.remove("theme-shifting"), 800);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("auto");
  const [theme, setTheme] = useState<Theme>("wren");

  // Adopt what the pre-paint script decided
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(PREF_KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (stored === "wren" || stored === "raven" || stored === "auto") {
        setPrefState(stored);
      }
    } catch {}
    const current = document.documentElement.dataset.theme;
    if (current === "raven") setTheme("raven");
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    try {
      localStorage.setItem(PREF_KEY, next);
      // They've touched the theme controls — the first-visit override is over
      sessionStorage.removeItem(FIRST_VISIT_KEY);
    } catch {}
    const resolved = resolveTheme(next);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  // In auto mode, cross the 7 PM / 7 AM line while the app is open
  useEffect(() => {
    if (pref !== "auto") return;
    const t = setInterval(() => {
      const resolved = resolveTheme("auto");
      setTheme((prev) => {
        if (prev !== resolved) applyTheme(resolved);
        return resolved;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [pref]);

  // Quick toggle pins an explicit mode; Settings can hand it back to auto
  const toggle = useCallback(() => {
    setPref(theme === "wren" ? "raven" : "wren");
  }, [theme, setPref]);

  return (
    <ThemeContext.Provider value={{ theme, pref, setPref, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Inline script source — runs before paint, no theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${PREF_KEY}");if(!p){var o=localStorage.getItem("${LEGACY_KEY}");p=(o==="raven"||o==="wren")?o:"auto";}var t=p;if(p==="auto"){if(!localStorage.getItem("${VISITED_KEY}")){localStorage.setItem("${VISITED_KEY}","1");sessionStorage.setItem("${FIRST_VISIT_KEY}","1");t="wren";}else if(sessionStorage.getItem("${FIRST_VISIT_KEY}")){t="wren";}else{var h=new Date().getHours();t=(h>=${NIGHT_START}||h<${NIGHT_END})?"raven":"wren";}}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="wren";}})();`;
