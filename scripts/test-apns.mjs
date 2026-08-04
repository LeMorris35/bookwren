// Verifies the APNs credentials really work by sending to a deliberately
// fake device token. Apple rejects the token but ONLY after validating our
// key, team, and topic — so "BadDeviceToken" is the success signal here.
//
// Run: node scripts/test-apns.mjs <optional-real-device-token>
import { readFileSync } from "node:fs";
import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";

const KEY_ID = process.env.APNS_KEY_ID;
const TEAM_ID = process.env.APNS_TEAM_ID;
const KEY_PATH = process.env.APNS_KEY_PATH;
const BUNDLE_ID = "com.lammedia.bookwren";
const deviceToken = process.argv[2] ?? "0".repeat(64);

const pem = readFileSync(KEY_PATH, "utf8");
const key = await importPKCS8(pem, "ES256");
const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
  .setIssuer(TEAM_ID)
  .setIssuedAt()
  .sign(key);

console.log("JWT signed OK (key + team id are well-formed)\n");

for (const host of [
  "https://api.push.apple.com",
  "https://api.sandbox.push.apple.com",
]) {
  const client = http2.connect(host);
  const result = await new Promise((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE_ID,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve({ status, body }));
    req.on("error", (e) => resolve({ status: 0, body: e.message }));
    req.end(
      JSON.stringify({
        aps: { alert: { title: "BookWren", body: "Test push 🐦" } },
      })
    );
  });
  client.close();

  const label = host.includes("sandbox") ? "sandbox   " : "production";
  const reason = (() => {
    try {
      return JSON.parse(result.body).reason;
    } catch {
      return result.body;
    }
  })();

  let verdict;
  if (result.status === 200) verdict = "✅ DELIVERED";
  else if (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic")
    verdict = "✅ credentials accepted (token is fake, as expected)";
  else if (reason === "InvalidProviderToken" || reason === "ExpiredProviderToken")
    verdict = "❌ KEY/TEAM REJECTED — check APNS_KEY_ID and APNS_TEAM_ID";
  else if (reason === "TopicDisallowed")
    verdict = "❌ key not allowed for this bundle id";
  else verdict = `⚠️  ${reason}`;

  console.log(`${label}  HTTP ${result.status}  ${verdict}`);
}
