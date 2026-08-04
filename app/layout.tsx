import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE } from "@/lib/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NativeShell } from "@/components/NativeShell";

// Alegreya Sans: a humanist sans designed for literature — warm, bookish,
// nothing like a productivity tool.
const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Fraunces with its SOFT and WONK axes loaded — the letterpress character
// comes from font-variation-settings in globals.css.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe0" },
    { media: "(prefers-color-scheme: dark)", color: "#101119" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${alegreyaSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Stamp the theme before first paint — no flash of the wrong bird */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#9c5a33",
              borderRadius: "0.75rem",
            },
          }}
        >
          <ThemeProvider>
            <StoreProvider>
              <NativeShell />
              <Nav />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6">
                {children}
              </main>
              <Footer />
            </StoreProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
