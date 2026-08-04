// Who can moderate. Set ADMIN_USER_IDS to a comma-separated list of Clerk
// user ids (and redeploy — env changes only apply to new deployments).
// An empty list means nobody is a moderator, which is the safe default.

export function adminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(userId: string): boolean {
  return adminIds().includes(userId);
}
