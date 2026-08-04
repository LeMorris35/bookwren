// Push notifications, sent straight to Apple. No third-party service, so
// nobody but us and Apple sees who's reading what.
//
// Needs four env vars (see DEPLOY-IOS.md):
//   APNS_KEY_ID       the 10-char key id from developer.apple.com
//   APNS_TEAM_ID      your 10-char Apple team id
//   APNS_PRIVATE_KEY  the .p8 file contents
//   APNS_SANDBOX      "true" only for Xcode debug builds; TestFlight and the
//                     App Store both use the production gateway (the default)

import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import { db } from "./db";

const BUNDLE_ID = "com.lammedia.bookwren";
const HOST = process.env.APNS_SANDBOX === "true"
  ? "https://api.sandbox.push.apple.com"
  : "https://api.push.apple.com";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_PRIVATE_KEY
  );
}

/**
 * Apple wants a fresh-ish ES256 token, and rate-limits token creation, so we
 * cache one for the recommended ~50 minutes.
 */
let cached: { token: string; madeAt: number } | null = null;

async function authToken(): Promise<string> {
  if (cached && Date.now() - cached.madeAt < 50 * 60 * 1000) return cached.token;

  // The key survives env vars in whatever shape it was pasted
  const raw = (process.env.APNS_PRIVATE_KEY ?? "").trim();
  const pem = raw.includes("BEGIN")
    ? raw.replace(/\\n/g, "\n")
    : `-----BEGIN PRIVATE KEY-----\n${raw.replace(/\s+/g, "").replace(/(.{64})/g, "$1\n")}\n-----END PRIVATE KEY-----`;

  const key = await importPKCS8(pem, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APNS_KEY_ID! })
    .setIssuer(process.env.APNS_TEAM_ID!)
    .setIssuedAt()
    .sign(key);

  cached = { token, madeAt: Date.now() };
  return token;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Deep link path, e.g. "/messages/abc" — opened when they tap. */
  path?: string;
  /** Number for the red app badge. Omit to leave it alone. */
  badge?: number;
  threadId?: string;
}

/** Send to one device. Returns false if Apple rejected the token. */
async function sendToToken(
  deviceToken: string,
  message: PushMessage
): Promise<{ ok: boolean; gone: boolean }> {
  const jwt = await authToken();
  const client = http2.connect(HOST);

  try {
    return await new Promise((resolve) => {
      const payload = JSON.stringify({
        aps: {
          alert: { title: message.title, body: message.body },
          sound: "default",
          ...(message.badge !== undefined ? { badge: message.badge } : {}),
          ...(message.threadId ? { "thread-id": message.threadId } : {}),
        },
        path: message.path ?? "/",
      });

      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });

      let status = 0;
      let body = "";
      req.on("response", (headers) => {
        status = Number(headers[":status"]);
      });
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        // 410 Gone / BadDeviceToken means the app was deleted — prune it
        const gone =
          status === 410 || body.includes("BadDeviceToken") || body.includes("Unregistered");
        if (status !== 200) {
          console.error(`APNs ${status} for ${deviceToken.slice(0, 8)}…: ${body}`);
        }
        resolve({ ok: status === 200, gone });
      });
      req.on("error", (err) => {
        console.error("APNs request failed:", err.message);
        resolve({ ok: false, gone: false });
      });
      req.end(payload);
    });
  } finally {
    client.close();
  }
}

type PrefKey = "social" | "challenges" | "streak";

/**
 * Notify a reader on every device they've registered, respecting their
 * settings. Never throws — a failed push must not break the action that
 * triggered it.
 */
export async function notify(
  userId: string,
  category: PrefKey,
  message: PushMessage
): Promise<void> {
  try {
    if (!pushConfigured()) return;

    const prefs = await db.notificationPrefs.findUnique({ where: { userId } });
    if (prefs && prefs[category] === false) return;
    // Streak nudges are opt-in, so no row means no nudge
    if (!prefs && category === "streak") return;

    const devices = await db.deviceToken.findMany({ where: { userId } });
    if (devices.length === 0) return;

    const results = await Promise.all(
      devices.map(async (d) => ({
        token: d.token,
        ...(await sendToToken(d.token, message)),
      }))
    );

    const dead = results.filter((r) => r.gone).map((r) => r.token);
    if (dead.length > 0) {
      await db.deviceToken.deleteMany({ where: { token: { in: dead } } });
    }
  } catch (err) {
    console.error("notify() failed:", err);
  }
}
