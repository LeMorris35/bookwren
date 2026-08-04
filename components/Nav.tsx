"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { SITE } from "@/lib/site";
import { useTheme } from "@/lib/theme";
import { RavenBookMark, RavenMark, WrenMark } from "@/components/WrenArt";

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/library", label: "Library", icon: BookIcon },
  { href: "/timer", label: "Timer", icon: TimerIcon },
  { href: "/stats", label: "Stats", icon: ChartIcon },
  { href: "/friends", label: "Friends", icon: FriendsIcon },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Moderators get an extra tab. The server decides — this only shows the link.
  useEffect(() => {
    if (!isSignedIn) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
    // Unread count for the mail badge — refreshed on every navigation
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.totalUnread === "number") {
          setUnread(data.totalUnread);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // pathname is a dependency so the badge clears after reading a thread
  }, [isSignedIn, pathname]);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {theme === "raven" ? (
              <RavenBookMark className="h-7 w-7 text-accent" />
            ) : (
              <WrenMark className="h-7 w-7 text-accent" />
            )}
            <span className="font-display text-2xl font-semibold tracking-tight">
              {SITE.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Admin
              </Link>
            )}
            <Link
              href="/library/add"
              className="ml-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink"
            >
              + Add book
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* Messages — where book recommendations land */}
            <Show when="signed-in">
              <Link
                href="/messages"
                title="Messages"
                aria-label={
                  unread > 0 ? `Messages, ${unread} unread` : "Messages"
                }
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  isActive("/messages")
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-muted hover:border-accent hover:text-accent"
                }`}
              >
                <MailIcon className="h-4.5 w-4.5" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Show>
            {/* Admin tab — also reachable on mobile, where the tab bar is full */}
            {isAdmin && (
              <Link
                href="/admin"
                title="Admin"
                aria-label="Admin"
                className={`flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors sm:hidden ${
                  isActive("/admin")
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-muted"
                }`}
              >
                🛠
              </Link>
            )}
            {/* Wren mode / Raven mode. The wren sings all day; the raven keeps the night watch. */}
            <button
              type="button"
              onClick={toggle}
              title={theme === "wren" ? "Switch to Raven mode" : "Switch to Wren mode"}
              aria-label={theme === "wren" ? "Switch to Raven mode" : "Switch to Wren mode"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {theme === "wren" ? (
                <RavenMark className="h-5 w-5" />
              ) : (
                <WrenMark className="h-5 w-5" />
              )}
            </button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
            <Link
              href="/settings"
              title="Settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              <GearIcon className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
        {/* feather barring under the header */}
        <div className="barred h-1" aria-hidden />
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive(href) ? "text-accent" : "text-ink-faint"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </svg>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <circle cx="17.5" cy="9.5" r="2.8" />
      <path d="M16.5 15.2c2.6.3 4.4 1.9 5 4.3" />
    </svg>
  );
}
