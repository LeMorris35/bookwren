// Shared helpers for API routes: auth guard, profile bootstrap, friendship
// checks, and consistent JSON errors.
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "./db";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Wrap a route handler so thrown ApiErrors become clean JSON responses. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  };
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, "Sign in to use this feature");
  return userId;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username: string): string {
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) {
    throw new ApiError(
      400,
      "Usernames are 3–20 characters: lowercase letters, numbers, underscores"
    );
  }
  return u;
}

/**
 * Get the caller's profile row, creating it on first contact with a
 * username generated from their Clerk name.
 */
export async function ensureProfile(userId: string) {
  const existing = await db.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const displayName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    clerkUser?.emailAddresses[0]?.emailAddress.split("@")[0] ||
    "Reader";

  const base =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 14) || "reader";

  // Find a free username: base, then base_2, base_37, …
  let username = base.length >= 3 ? base : `${base}_reader`.slice(0, 14);
  for (let i = 0; i < 20; i++) {
    const taken = await db.user.findUnique({ where: { username } });
    if (!taken) break;
    username = `${base}_${Math.floor(Math.random() * 1000)}`;
  }

  try {
    return await db.user.create({
      data: {
        id: userId,
        username,
        displayName,
        avatarUrl: clerkUser?.imageUrl,
      },
    });
  } catch (err) {
    // First sign-in fires several API calls at once; if a parallel request
    // created the row a moment ago, just use it.
    const raced = await db.user.findUnique({ where: { id: userId } });
    if (raced) return raced;
    throw err;
  }
}

/**
 * True if either reader has blocked the other. Blocks are symmetric in
 * effect: neither side can friend, view, or send anything to the other.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await db.userReport.findFirst({
    where: {
      blocked: true,
      OR: [
        { reporterId: a, targetId: b },
        { reporterId: b, targetId: a },
      ],
    },
  });
  return block !== null;
}

/** Throws if either reader has blocked the other. */
export async function assertNotBlocked(a: string, b: string): Promise<void> {
  if (await isBlockedBetween(a, b)) {
    throw new ApiError(403, "That reader isn't available");
  }
}

/** True if the two users have an accepted friendship (either direction). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await db.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
  return f !== null;
}

export const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;
