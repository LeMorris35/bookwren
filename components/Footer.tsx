"use client";

import { SITE } from "@/lib/site";
import { useTheme } from "@/lib/theme";
import { HedgerowBand } from "@/components/WrenArt";

/** A whisper, not a billboard: hedgerow, one line of voice, one faint line of fine print. */
export function Footer() {
  const { theme } = useTheme();

  return (
    <footer className="pb-20 pt-2 text-center sm:pb-6">
      <HedgerowBand className="mx-auto h-10 w-full max-w-3xl opacity-75" />
      <p className="mt-2 font-display text-sm italic text-ink-faint">
        {theme === "wren"
          ? "Your nook is ready."
          : "The library is open. It usually is."}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        {SITE.name} · no ads · your books stay on your device ·{" "}
        <a
          href={SITE.brand.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent hover:underline"
        >
          {SITE.brand.name}
        </a>
      </p>
    </footer>
  );
}
