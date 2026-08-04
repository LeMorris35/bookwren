"use client";

// The written half of the brand kit: palette, type, voice, and copy blocks
// anyone can paste straight into a post. Everything here is the real thing —
// the hex values are the same variables the app renders with.

import { useState } from "react";
import { SITE } from "@/lib/site";

function Copyable({
  label,
  value,
  block = false,
}: {
  label?: string;
  value: string;
  block?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the text is on screen to select by hand
    }
  }

  if (block) {
    return (
      <div className="rounded-xl border border-line bg-background p-3">
        {label && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {label}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm">{value}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="font-mono text-xs text-ink-muted hover:text-accent"
      title="Copy"
    >
      {copied ? "copied ✓" : value}
    </button>
  );
}

const WREN_COLORS: [string, string, string][] = [
  ["Wren Russet", "#9c5a33", "The brand color — buttons, links, the logo"],
  ["Cinnamon", "#b0703c", "Hovers and secondary fills"],
  ["Buff", "#d9a566", "Accents and progress fills (never text)"],
  ["Cream", "#f6efe0", "Page background"],
  ["Shell", "#fdfaf3", "Cards and panels"],
  ["Ink Brown", "#2e2119", "Headlines and body text"],
  ["Twig", "#8b7b6a", "Muted / secondary text"],
];

const RAVEN_COLORS: [string, string, string][] = [
  ["Raven Black", "#12101c", "Page background (never pure black)"],
  ["Deep Ink", "#1a1727", "Cards and panels"],
  ["Feather Violet", "#a78bfa", "The accent — buttons, links"],
  ["Berry Glow", "#c084fc", "Highlights and berries"],
  ["Moonlight", "#e8e4f4", "Headlines and body text"],
];

const NATURALS: [string, string, string][] = [
  ["Moss", "#7a8b5a", "Leaves in illustrations"],
  ["Hedgerow", "#45543a", "Deep foliage"],
  ["Bark", "#6b5847", "Branches and twigs"],
  ["Bramble Berry", "#8e3b46", "The one saturated pop"],
];

function Swatch({ name, hex, use }: { name: string; hex: string; use: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-lg border border-line"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-ink-muted">{use}</p>
      </div>
      <div className="ml-auto shrink-0">
        <Copyable value={hex} />
      </div>
    </div>
  );
}

export function BrandGuide() {
  return (
    <div className="space-y-8">
      {/* Colors */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Colors</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tap any code to copy it. Every neutral leans warm — no pure black, no
          pure white, no cold grey.
        </p>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Wren (light / daytime)
        </p>
        <div className="mt-2 space-y-2">
          {WREN_COLORS.map(([name, hex, use]) => (
            <Swatch key={hex} name={name} hex={hex} use={use} />
          ))}
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Raven (dark / night)
        </p>
        <div className="mt-2 space-y-2">
          {RAVEN_COLORS.map(([name, hex, use]) => (
            <Swatch key={hex} name={name} hex={hex} use={use} />
          ))}
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Nature accents (illustrations only)
        </p>
        <div className="mt-2 space-y-2">
          {NATURALS.map(([name, hex, use]) => (
            <Swatch key={hex} name={name} hex={hex} use={use} />
          ))}
        </div>
      </section>

      {/* Type */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Type</h2>
        <div className="mt-3 space-y-4">
          <div>
            <p className="font-display text-3xl font-semibold">Fraunces</p>
            <p className="mt-1 text-sm text-ink-muted">
              Headlines and the logo wordmark. Warm, slightly wonky, bookish.
              Free on Google Fonts.
            </p>
            <Copyable value="Fraunces" />
          </div>
          <div>
            <p className="text-2xl">Alegreya Sans</p>
            <p className="mt-1 text-sm text-ink-muted">
              Everything else — body text, buttons, captions. Designed for
              literature, so it reads warm rather than techy. Free on Google
              Fonts.
            </p>
            <Copyable value="Alegreya Sans" />
          </div>
          <p className="text-xs text-ink-faint">
            In Canva: search these names, they&apos;re both free. If Fraunces
            isn&apos;t available, any warm old-style serif works — never a
            geometric or condensed font.
          </p>
        </div>
      </section>

      {/* Voice */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Voice</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Cozy, encouraging, a little clever. Never salesy, never guilt-trippy
          about reading &ldquo;more.&rdquo;
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Sounds like us
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              <li>“Your nook is ready.”</li>
              <li>“Small, like the wren.”</li>
              <li>“Sings every month of the year.”</li>
              <li>“The library is open. It usually is.”</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Never us
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              <li>“Crush your reading goals!”</li>
              <li>“You&apos;re falling behind…”</li>
              <li>“Unlock premium today”</li>
              <li>Anything with hustle in it</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Two birds, two moods: the wren is warm daylight and cottage-garden
          cozy; the raven is midnight library, gothic and a little mysterious.
          Match the bird to the post.
        </p>
      </section>

      {/* Ready-to-paste copy */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Copy &amp; paste</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Written and ready. Tap Copy, paste into Facebook.
        </p>
        <div className="mt-3 space-y-3">
          <Copyable
            block
            label="Short bio (155 characters)"
            value={`A free reading tracker with a little bird on it. Log your books, time your reading, keep your streak, read with friends. ${SITE.url.replace("https://", "")}`}
          />
          <Copyable
            block
            label="About / long description"
            value={`BookWren is a free reading tracker for people who love books.

Track every minute you read, log the books you finish, and watch your streak grow. Add friends, race them in reading challenges, and send each other books you loved.

No ads. No subscription. No account needed to start — your library lives on your own device.

Made with love by LAM Media. ${SITE.url.replace("https://", "")}`}
          />
          <Copyable
            block
            label="Launch post"
            value={`I built something for readers 📚🐦

BookWren is a free reading tracker — log your books, time your reading sessions, and keep a streak going. You can add friends, start reading challenges, and see what everyone's reading.

It's completely free, no account needed to try it, and it works right in your phone's browser.

${SITE.url.replace("https://", "")}`}
          />
          <Copyable
            block
            label="Challenge invite post"
            value={`Who's in for a reading challenge? 🏆

I set one up on BookWren — we each track our minutes (or pages, or books) and there's a live leaderboard. Winner gets bragging rights.

It's free, takes a minute to join: ${SITE.url.replace("https://", "")}`}
          />
          <Copyable
            block
            label="Taglines"
            value={`Track every minute you read.
Your nook is ready.
A small bird with a big memory.
Read together. Even when you're apart.`}
          />
        </div>
      </section>

      {/* The story */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Why a wren?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Useful for captions, comments, and answering &ldquo;where&apos;d the
          name come from?&rdquo;
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <strong>Tiny bird, huge voice.</strong> Pound for pound a wren
            out-sings a rooster about ten to one.
          </li>
          <li>
            <strong>It never stops singing.</strong> Carolina wrens sing every
            month of the year — the streak bird.
          </li>
          <li>
            <strong>King of Birds.</strong> In the old fable the wren wins the
            &ldquo;fly highest&rdquo; contest by hiding in the eagle&apos;s
            feathers and popping out at the top. Cleverness beats size.
          </li>
          <li>
            <strong>It lives in the nooks.</strong> Its scientific family name
            means &ldquo;cave dweller&rdquo; — the bird that nests in the cozy
            corner, like a reader.
          </li>
          <li>
            <strong>Wrens pair for life</strong> and forage together — the
            reading-buddy bird.
          </li>
          <li>
            <strong>Readers already know the name.</strong> Holly Black&apos;s
            <em> The Stolen Heir</em>, <em>The Wren in the Holly Library</em>,{" "}
            <em>The Wren Hunt</em> — &ldquo;Wren&rdquo; reads bookish before it
            reads bird.
          </li>
        </ul>
      </section>

      {/* Rules */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">Do &amp; don&apos;t</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ul className="space-y-1.5 text-sm">
            <li>✅ Keep the bird&apos;s cocked-up tail — it&apos;s the logo</li>
            <li>✅ Warm, low, side-lit photos (a lamp, a window)</li>
            <li>✅ Cozy clutter: blankets, tea, stacked books</li>
            <li>✅ Always include the link, always say free</li>
          </ul>
          <ul className="space-y-1.5 text-sm text-ink-muted">
            <li>🚫 Don&apos;t recolor the wren — russet or nothing</li>
            <li>🚫 Don&apos;t stretch or rotate the logo</li>
            <li>🚫 No cold greys, neon, or pure black backgrounds</li>
            <li>🚫 Don&apos;t crop the tail off the bird</li>
          </ul>
        </div>
      </section>

      {/* Facts */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">The basics</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-medium">
              BookWren <span className="text-ink-faint">(one word, capital W)</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Website</dt>
            <dd className="font-medium">{SITE.url.replace("https://", "")}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Made by</dt>
            <dd className="font-medium">
              {SITE.brand.name} · {SITE.brand.url.replace("https://", "")}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Price</dt>
            <dd className="font-medium">Free — no ads, no subscription</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
