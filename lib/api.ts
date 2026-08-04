// Tiny client-side fetch helpers. Every API error becomes a thrown Error
// whose message is safe to show in the UI.

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? "Something went wrong"
    );
  }
  return body as T;
}

export async function getJson<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url));
}

export async function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  );
}

// Shared shapes returned by the API
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface FriendEntry {
  friendshipId: string;
  user: PublicUser;
}

import type { ChallengeMetric } from "./challenge-metrics";

export interface ChallengeSummary {
  id: string;
  name: string;
  metric: ChallengeMetric;
  target: number;
  startDate: string;
  endDate: string;
  inviteCode: string;
  participantCount: number;
  isCreator: boolean;
}

export interface ChallengeInvite {
  id: string;
  from: PublicUser | null;
  challenge: {
    id: string;
    name: string;
    metric: ChallengeMetric;
    target: number;
    startDate: string;
    endDate: string;
    participantCount: number;
  };
}

export interface LeaderboardRow {
  user: PublicUser;
  progress: number;
  isYou: boolean;
}

export interface RecommendationEntry {
  id: string;
  title: string;
  author: string;
  coverUrl?: string | null;
  note?: string | null;
  createdAt: string;
  sender: PublicUser;
}
