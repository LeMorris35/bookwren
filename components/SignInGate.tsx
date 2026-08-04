"use client";

import { SignInButton } from "@clerk/nextjs";
import { RavenOnTwig, WrenOnTwig } from "@/components/WrenArt";
import { useTheme } from "@/lib/theme";

/** Friendly "this part needs an account" screen for the social pages. */
export function SignInGate({ feature }: { feature: string }) {
  const { theme } = useTheme();
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      {theme === "raven" ? (
        <RavenOnTwig className="mx-auto h-36 w-auto" />
      ) : (
        <WrenOnTwig className="mx-auto h-36 w-auto" />
      )}
      <h1 className="mt-4 font-display text-3xl font-semibold">{feature}</h1>
      <p className="mt-3 text-ink-muted">
        Tracking works without an account — but friends, challenges, and book
        sharing need one so your people can find you. It&apos;s free, and your
        reading log stays yours.
      </p>
      <SignInButton mode="modal">
        <button className="mt-6 rounded-full bg-accent px-8 py-3 font-semibold text-accent-ink">
          Sign in or create account
        </button>
      </SignInButton>
    </div>
  );
}
