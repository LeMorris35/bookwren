"use client";

// Runs only inside the iOS app: dismisses the splash once we're actually
// painted, keeps the status bar matching the current theme, and handles the
// hardware/edge back gesture. Renders nothing.

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { isNative } from "@/lib/native";

export function NativeShell() {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Mark the document so CSS can add safe-area padding only in the app
  useEffect(() => {
    if (isNative()) document.documentElement.dataset.native = "true";
  }, []);

  // Hide the splash once React has painted real content
  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    (async () => {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      // One frame of breathing room so we never flash an empty screen
      requestAnimationFrame(() => {
        if (!cancelled) SplashScreen.hide().catch(() => {});
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Status bar follows Wren / Raven
  useEffect(() => {
    if (!isNative()) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({
          style: theme === "raven" ? Style.Dark : Style.Light,
        });
        await StatusBar.setBackgroundColor({
          color: theme === "raven" ? "#12101c" : "#f6efe0",
        });
      } catch {
        // setBackgroundColor is Android-only; ignoring keeps iOS quiet
      }
    })();
  }, [theme]);

  // iOS edge-swipe / Android back: go back, or leave the app at the root
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && pathname !== "/") router.back();
        else App.exitApp();
      });
      remove = () => handle.remove();
    })();
    return () => remove?.();
  }, [router, pathname]);

  return null;
}
