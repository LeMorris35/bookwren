"use client";

// Brand kit — generates the Facebook/social assets as pixel-perfect PNGs,
// drawn in the real brand fonts. Open /brand, tap Download under each.

import { useEffect, useRef, useState } from "react";
import {
  bodyFontFamily,
  displayFontFamily,
  drawHedgerow,
  drawWrenOnBook,
} from "@/lib/canvas-art";
import { BrandGuide } from "@/components/BrandGuide";

const WREN = {
  bg: "#f6efe0",
  ink: "#2e2119",
  muted: "#6d5b4b",
  accent: "#9c5a33",
  bark: "#6b5847",
  foliage: "#7a8b5a",
  foliageDeep: "#45543a",
  berry: "#8e3b46",
};

const RAVEN = {
  bg: "#12101c",
  ink: "#e8e4f4",
  muted: "#c2bbd8",
  accent: "#a78bfa",
  bark: "#4a4361",
  foliage: "#6d4fd1",
  foliageDeep: "#4c3a99",
  berry: "#c084fc",
};

interface Asset {
  id: string;
  title: string;
  hint: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, display: string, body: string) => void;
}

const ASSETS: Asset[] = [
  {
    id: "profile",
    title: "Profile picture",
    hint: "1080×1080 — Facebook crops it to a circle",
    width: 1080,
    height: 1080,
    draw: (ctx) => {
      ctx.fillStyle = WREN.bg;
      ctx.fillRect(0, 0, 1080, 1080);
      // mark centered, sized to survive the circle crop
      const s = 9.6; // 64 units → ~614px
      drawWrenOnBook(ctx, (1080 - 64 * s) / 2, (1080 - 64 * s) / 2 - 10, s, WREN.accent);
    },
  },
  {
    id: "cover-wren",
    title: "Cover photo — Wren",
    hint: "1640×624 — key content is centered for mobile crop",
    width: 1640,
    height: 624,
    draw: (ctx, display, body) => {
      ctx.fillStyle = WREN.bg;
      ctx.fillRect(0, 0, 1640, 624);
      drawHedgerow(ctx, 60, 588, 1520, WREN);
      drawWrenOnBook(ctx, 330, 130, 4.6, WREN.accent);
      ctx.textAlign = "left";
      ctx.fillStyle = WREN.ink;
      ctx.font = `600 128px ${display}`;
      ctx.fillText("BookWren", 680, 290);
      ctx.fillStyle = WREN.muted;
      ctx.font = `400 42px ${body}`;
      ctx.fillText("Track every minute you read.", 684, 360);
      ctx.fillStyle = WREN.accent;
      ctx.font = `700 44px ${body}`;
      ctx.fillText("bookwren.app", 684, 440);
    },
  },
  {
    id: "cover-raven",
    title: "Cover photo — Raven (night alt)",
    hint: "Same layout in midnight colors — swap in for spooky season",
    width: 1640,
    height: 624,
    draw: (ctx, display, body) => {
      ctx.fillStyle = RAVEN.bg;
      ctx.fillRect(0, 0, 1640, 624);
      // moon + stars
      ctx.fillStyle = "#d8d2ec";
      ctx.beginPath();
      ctx.arc(1450, 110, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RAVEN.bg;
      ctx.beginPath();
      ctx.arc(1472, 90, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RAVEN.accent;
      for (const [sx, sy, r] of [[240, 90, 4], [520, 60, 3], [1090, 100, 3.5], [1300, 210, 3]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHedgerow(ctx, 60, 588, 1520, RAVEN);
      drawWrenOnBook(ctx, 330, 130, 4.6, RAVEN.accent);
      ctx.textAlign = "left";
      ctx.fillStyle = RAVEN.ink;
      ctx.font = `600 128px ${display}`;
      ctx.fillText("BookWren", 680, 290);
      ctx.fillStyle = RAVEN.muted;
      ctx.font = `400 42px ${body}`;
      ctx.fillText("The library is open. It usually is.", 684, 360);
      ctx.fillStyle = RAVEN.accent;
      ctx.font = `700 44px ${body}`;
      ctx.fillText("bookwren.app", 684, 440);
    },
  },
  {
    id: "launch-post",
    title: "Launch post",
    hint: "1080×1350 — the pinned-post image",
    width: 1080,
    height: 1350,
    draw: (ctx, display, body) => {
      ctx.fillStyle = WREN.bg;
      ctx.fillRect(0, 0, 1080, 1350);
      drawWrenOnBook(ctx, (1080 - 64 * 5) / 2, 70, 5, WREN.accent);
      ctx.textAlign = "center";
      ctx.fillStyle = WREN.ink;
      ctx.font = `600 108px ${display}`;
      ctx.fillText("BookWren", 540, 540);
      ctx.fillStyle = WREN.muted;
      ctx.font = `400 44px ${body}`;
      ctx.fillText("Track every minute you read.", 540, 610);

      ctx.textAlign = "left";
      const items: [string, string][] = [
        ["#b45309", "Time your reading & keep your streak alive"],
        ["#0d9488", "Race friends in reading challenges"],
        ["#7c3aed", "Stats on pages, words, books & authors"],
        ["#8e3b46", "Free to use — no account needed"],
      ];
      let y = 740;
      for (const [dot, text] of items) {
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(150, y - 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = WREN.ink;
        ctx.font = `500 42px ${body}`;
        ctx.fillText(text, 190, y);
        y += 92;
      }

      ctx.textAlign = "center";
      ctx.fillStyle = WREN.accent;
      ctx.font = `700 60px ${body}`;
      ctx.fillText("bookwren.app", 540, 1180);
      drawHedgerow(ctx, 60, 1300, 960, WREN);
    },
  },
];

export default function BrandPage() {
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await document.fonts.ready;
      const display = displayFontFamily();
      const body = bodyFontFamily();
      for (const asset of ASSETS) {
        const canvas = refs.current[asset.id];
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) continue;
        asset.draw(ctx, display, body);
      }
      setReady(true);
    })();
  }, []);

  function download(asset: Asset) {
    const canvas = refs.current[asset.id];
    canvas?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookwren-${asset.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Brand kit</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Everything BookWren: images to download, colors, fonts, voice, and
          copy you can paste straight into a post.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          <a
            href="#assets"
            className="rounded-full bg-accent-soft px-3 py-1 font-medium text-accent"
          >
            Images
          </a>
          <a
            href="#guide"
            className="rounded-full border border-line px-3 py-1 font-medium text-ink-muted hover:border-accent hover:text-accent"
          >
            Colors, fonts &amp; copy
          </a>
        </nav>
      </div>

      <h2 id="assets" className="font-display text-xl font-semibold">
        Images
      </h2>
      {ASSETS.map((asset) => (
        <section key={asset.id} className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">{asset.title}</h2>
              <p className="text-xs text-ink-muted">{asset.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => download(asset)}
              disabled={!ready}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
            >
              Download
            </button>
          </div>
          <canvas
            ref={(el) => {
              refs.current[asset.id] = el;
            }}
            width={asset.width}
            height={asset.height}
            className="w-full rounded-lg border border-line"
          />
        </section>
      ))}

      <h2 id="guide" className="font-display text-xl font-semibold">
        Colors, fonts &amp; copy
      </h2>
      <BrandGuide />
    </div>
  );
}
