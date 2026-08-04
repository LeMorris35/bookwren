// Clerk auth proxy (Next.js 16's name for middleware.ts).
// Note: this does NOT lock any page behind login — the whole app stays
// public. It just makes auth() available so API routes can check who's
// calling. Social features opt in to auth themselves.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
