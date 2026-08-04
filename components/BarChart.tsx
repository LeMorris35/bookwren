"use client";

import { useState } from "react";
import { formatMinutes } from "@/lib/dates";

export interface BarDatum {
  label: string; // short axis label ("Mon", "Jan"…)
  tooltip: string; // fuller label for the tooltip ("Jul 29")
  minutes: number;
}

/**
 * Single-series bar chart of reading minutes. Hand-rolled: thin bars with
 * rounded data-ends, per-bar hover/focus tooltip, recessive axis, and the max
 * bar direct-labeled. One series → single accent hue, no legend.
 */
export function BarChart({
  data,
  height = 128,
  goalMinutes,
}: {
  data: BarDatum[];
  height?: number;
  goalMinutes?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.minutes), goalMinutes ?? 0, 1);
  const maxIdx = data.reduce(
    (best, d, i) => (d.minutes > data[best].minutes ? i : best),
    0
  );
  const hasAny = data.some((d) => d.minutes > 0);

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* Goal line */}
        {goalMinutes && goalMinutes > 0 && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-ink-faint/50"
            style={{ bottom: `${(goalMinutes / max) * 100}%` }}
            aria-hidden
          />
        )}
        <div className="flex h-full items-end gap-[3px]">
          {data.map((d, i) => {
            const h = Math.max(d.minutes > 0 ? 4 : 2, (d.minutes / max) * height);
            return (
              <button
                key={i}
                type="button"
                className="group relative flex h-full flex-1 items-end outline-none"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${d.tooltip}: ${formatMinutes(d.minutes)}`}
              >
                <div
                  className={`w-full rounded-t-[4px] transition-colors ${
                    d.minutes > 0
                      ? active === i
                        ? "bg-accent"
                        : "bg-accent/80"
                      : "bg-chart-track"
                  }`}
                  style={{ height: h }}
                />
                {/* Direct label on the tallest bar */}
                {hasAny && i === maxIdx && d.minutes > 0 && active === null && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap text-[10px] font-medium text-ink-muted">
                    {formatMinutes(d.minutes)}
                  </span>
                )}
                {/* Tooltip */}
                {active === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-background shadow">
                    {d.tooltip} · {formatMinutes(d.minutes)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 truncate text-center text-[10px] text-ink-faint"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
