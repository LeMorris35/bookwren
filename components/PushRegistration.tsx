"use client";

// Registers the phone for push once the reader is signed in, and routes them
// to the right screen when they tap a notification. Renders nothing.
//
// Permission is NOT requested on first launch — iOS only lets you ask once,
// and a cold prompt gets denied. We ask from Settings, or the first time
// they do something social (see askForPush).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { isNative } from "@/lib/native";

/**
 * Ask iOS for notification permission and register the token.
 * Returns what happened so the UI can explain it.
 */
export async function askForPush(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (!isNative()) return "unsupported";
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const current = await PushNotifications.checkPermissions();
  let status = current.receive;
  if (status === "prompt" || status === "prompt-with-rationale") {
    status = (await PushNotifications.requestPermissions()).receive;
  }
  if (status !== "granted") return "denied";

  await PushNotifications.register();
  return "granted";
}

export function PushRegistration() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isNative() || !isSignedIn) return;
    let cleanup: (() => void)[] = [];

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Apple handed us a token — save it against this account
      const reg = await PushNotifications.addListener(
        "registration",
        async ({ value }) => {
          try {
            await fetch("/api/devices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: value, platform: "ios" }),
            });
          } catch {}
        }
      );

      const err = await PushNotifications.addListener(
        "registrationError",
        (e) => console.error("Push registration failed:", e)
      );

      // Tapped a notification — go where it points
      const tap = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        ({ notification }) => {
          const path = (notification.data as { path?: string })?.path;
          if (path) router.push(path);
        }
      );

      cleanup = [
        () => reg.remove(),
        () => err.remove(),
        () => tap.remove(),
      ];

      // Already granted from a previous launch? Re-register silently so the
      // token stays fresh (Apple rotates them).
      const perms = await PushNotifications.checkPermissions();
      if (perms.receive === "granted") await PushNotifications.register();
    })();

    return () => cleanup.forEach((fn) => fn());
  }, [isSignedIn, router]);

  return null;
}
