// Native-app helpers. Every call is a no-op in a normal browser, so the same
// code runs on the web and inside the iOS shell.

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** A small tap — logging a session, starting the timer, sending a book. */
export async function tapFeedback(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

/** A celebratory buzz — finishing a book, hitting a goal, winning a challenge. */
export async function successFeedback(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}
