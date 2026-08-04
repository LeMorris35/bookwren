// One-time migration: the old Recommendation rows become Messages carrying a
// book, so nothing already sent is lost when the two systems merge.
// Usage: node scripts/migrate-recs-to-messages.mjs [--dev]
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const envPath = process.argv.includes("--dev") ? "../.env" : "../.env.production";
const envFile = readFileSync(new URL(envPath, import.meta.url), "utf8");
const url = envFile.match(/^DATABASE_URL="(.+)"/m)?.[1];
if (!url) throw new Error(`DATABASE_URL not found in ${envPath}`);

const db = new PrismaClient({ datasources: { db: { url } } });

const recs = await db.recommendation.findMany();
let moved = 0;

for (const rec of recs) {
  // Skip if this book already arrived as a message (safe to re-run)
  const existing = await db.message.findFirst({
    where: {
      fromId: rec.senderId,
      toId: rec.recipientId,
      bookTitle: rec.title,
    },
  });
  if (existing) continue;

  await db.message.create({
    data: {
      fromId: rec.senderId,
      toId: rec.recipientId,
      body: rec.note ?? null,
      bookTitle: rec.title,
      bookAuthor: rec.author || null,
      bookCover: rec.coverUrl ?? null,
      createdAt: rec.createdAt,
    },
  });
  moved++;
}

console.log(`Migrated ${moved} of ${recs.length} recommendation(s) into messages`);
await db.$disconnect();
