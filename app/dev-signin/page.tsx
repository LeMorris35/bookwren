"use client";

// DEV ONLY: signs in with a Clerk sign-in token (?ticket=...), so automated
// tests can authenticate without touching the real sign-in UI. Tokens are
// minted server-side with the Clerk CLI/Backend API. This page renders
// nothing in production builds.

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function DevSignInPage() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense>
      <DevSignInInner />
    </Suspense>
  );
}

function DevSignInInner() {
  const clerk = useClerk();
  const params = useSearchParams();
  const [status, setStatus] = useState("Signing in…");
  const started = useRef(false);

  useEffect(() => {
    const ticket = params.get("ticket");
    if (!clerk.loaded || !clerk.client || !ticket || started.current) return;
    started.current = true;
    (async () => {
      try {
        const result = await clerk.client!.signIn.create({
          strategy: "ticket",
          ticket,
        });
        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
          setStatus("Signed in ✓ — heading to Friends");
          window.location.href = "/friends";
        } else {
          setStatus(`Sign-in incomplete: ${result.status}`);
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
  }, [clerk, clerk.loaded, params]);

  return <p className="py-16 text-center text-ink-muted">{status}</p>;
}
