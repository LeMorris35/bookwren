import type { CapacitorConfig } from "@capacitor/cli";

/**
 * BookWren iOS shell.
 *
 * The app loads the live site (bookwren.app) inside a native WebView. That
 * keeps one codebase and means shipping a fix never needs an App Store
 * review — but it also means the App Store submission has to earn its
 * keep with real native behaviour (haptics, splash, status bar, safe
 * areas, and push). See DEPLOY-IOS.md.
 *
 * `capacitor-fallback/` is what shows if the device is offline before the
 * site ever loads.
 */
const config: CapacitorConfig = {
  appId: "com.lammedia.bookwren",
  appName: "BookWren",
  webDir: "capacitor-fallback",
  server: {
    url: "https://bookwren.app",
    androidScheme: "https",
    iosScheme: "https",
    // Never allow plain-HTTP loads
    cleartext: false,
    /**
     * Anything NOT listed here gets kicked out to Safari, which makes the
     * app feel like a browser instead of an app. Clerk bounces through its
     * own domains during the sign-in handshake, so they have to be allowed
     * or the very first launch throws the reader out to Safari.
     */
    allowNavigation: [
      "bookwren.app",
      "*.bookwren.app",
      // Clerk development instance (swap for clerk.bookwren.app in prod)
      "*.clerk.accounts.dev",
      "clerk.bookwren.app",
      "accounts.bookwren.app",
      // Google sign-in and Clerk's bot check
      "accounts.google.com",
      "*.google.com",
      "challenges.cloudflare.com",
      // Book covers
      "covers.openlibrary.org",
      "openlibrary.org",
    ],
  },
  ios: {
    // The app draws its own warm background behind the web content, so the
    // notch/home-indicator areas never flash white.
    backgroundColor: "#f6efe0",
    contentInset: "never",
  },
  backgroundColor: "#f6efe0",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false, // we hide it once the app is actually ready
      backgroundColor: "#f6efe0",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
