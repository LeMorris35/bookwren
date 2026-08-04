"use client";

// The growth loop: one tap renders the user's reading stats as a pretty
// 1080×1080 image they can post to Facebook/Instagram — with the app's name
// and the LAM Media credit on it.

import { useState } from "react";
import { useStore } from "@/lib/store";
import { SITE } from "@/lib/site";
import {
  booksFinishedThisYear,
  currentStreak,
  minutesThisYear,
  pagesThisYear,
} from "@/lib/stats";
import { formatMinutes } from "@/lib/dates";
import { displayFontFamily } from "@/lib/canvas-art";

const W = 1080;
const H = 1080;

export function ShareStats() {
  const { data } = useStore();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      // Make sure the display font is ready before drawing
      await document.fonts.ready;
      const display = displayFontFamily();

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cream = "#faf6ee";
      const ink = "#241c15";
      const muted = "#6b5f52";
      const accent = "#b45309";

      ctx.fillStyle = cream;
      ctx.fillRect(0, 0, W, H);

      // Frame
      ctx.strokeStyle = "#e7ddcc";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      // Wren-on-book logo (same shapes as WrenMark)
      ctx.save();
      ctx.translate(80, 70);
      ctx.scale(1.5, 1.5);
      ctx.fillStyle = accent;
      // bird, scaled above the book
      ctx.save();
      ctx.translate(9, 1);
      ctx.scale(0.78, 0.78);
      ctx.beginPath();
      ctx.moveTo(3, 25.5);
      ctx.lineTo(16, 22.5);
      ctx.lineTo(16, 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(21.5, 25, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(34, 38, 15.5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(48, 38);
      ctx.rotate((30 * Math.PI) / 180);
      ctx.translate(-48, -38);
      ctx.beginPath();
      ctx.roundRect(45, 13, 6.5, 27, 3.2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      // legs
      ctx.beginPath();
      ctx.roundRect(30, 39, 2.4, 11, 1.2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(38, 40, 2.4, 10, 1.2);
      ctx.fill();
      // open book
      ctx.beginPath();
      ctx.moveTo(4, 50);
      ctx.bezierCurveTo(12, 45.5, 24, 45.5, 32, 49);
      ctx.bezierCurveTo(40, 45.5, 52, 45.5, 60, 50);
      ctx.lineTo(60, 57);
      ctx.bezierCurveTo(52, 53.5, 40, 53.5, 32, 56.5);
      ctx.bezierCurveTo(24, 53.5, 12, 53.5, 4, 57);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = ink;
      ctx.font = `600 64px ${display}`;
      ctx.fillText(SITE.name, 190, 152);

      ctx.fillStyle = muted;
      ctx.font = "400 40px system-ui, sans-serif";
      ctx.fillText("My reading, so far this year", 92, 270);

      const pages = pagesThisYear(data.sessions);
      const stats: [string, string][] = [
        [formatMinutes(minutesThisYear(data.sessions)), "of reading time"],
        [String(booksFinishedThisYear(data)), "books finished"],
        [`${currentStreak(data.sessions)} days`, "current streak"],
      ];
      if (pages > 0) stats.push([pages.toLocaleString(), "pages turned"]);
      let y = pages > 0 ? 400 : 430;
      const step = pages > 0 ? 165 : 210;
      for (const [big, small] of stats) {
        ctx.fillStyle = accent;
        ctx.font = `600 ${pages > 0 ? 96 : 120}px ${display}`;
        ctx.fillText(big, 92, y);
        ctx.fillStyle = muted;
        ctx.font = "400 44px system-ui, sans-serif";
        ctx.fillText(small, 92, y + 52);
        y += step;
      }

      ctx.fillStyle = ink;
      ctx.font = "600 40px system-ui, sans-serif";
      ctx.fillText(`Track yours free → ${SITE.url.replace("https://", "")}`, 92, 985);
      ctx.fillStyle = muted;
      ctx.font = "400 32px system-ui, sans-serif";
      ctx.fillText(`A free tool by ${SITE.brand.name}`, 92, 1030);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File([blob], "my-reading-stats.png", { type: "image/png" });
      // Native share sheet on phones; download fallback on desktop
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `My ${SITE.name} stats` });
          return;
        } catch {
          // user cancelled or share failed — fall through to download
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-reading-stats.png";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className="w-full rounded-full bg-accent py-3 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "Making your card…" : "📤 Share my reading stats"}
    </button>
  );
}
