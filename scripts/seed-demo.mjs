// Seeds a demo reader ("Wren Bookish", @wrenny) into the PRODUCTION database
// so Levi can see what a friend's stats, shelves, and challenges look like.
// The demo user is a plain database row — she never logs in, so she needs no
// Clerk account. Run: node scripts/seed-demo.mjs
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Defaults to production; pass --dev to seed the local dev database instead.
const envPath = process.argv.includes("--dev") ? "../.env" : "../.env.production";
const envFile = readFileSync(new URL(envPath, import.meta.url), "utf8");
const url = envFile.match(/^DATABASE_URL="(.+)"/m)?.[1];
if (!url) throw new Error(`DATABASE_URL not found in ${envPath}`);

const db = new PrismaClient({ datasources: { db: { url } } });

const DEMO_ID = "demo_wren_bookish";
const cover = (id) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const iso = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

// Her library: 5 finished, 2 in progress, 1 wishlist — real covers
const books = [
  { clientId: "w1", title: "Fourth Wing", author: "Rebecca Yarros", coverUrl: cover(14407898), format: "physical", status: "finished", finishedAt: iso(-28), pages: 530 },
  { clientId: "w2", title: "A Court of Thorns and Roses", author: "Sarah J. Maas", coverUrl: cover(8738585), format: "physical", status: "finished", finishedAt: iso(-43), pages: 451 },
  { clientId: "w3", title: "The Song of Achilles", author: "Madeline Miller", coverUrl: cover(7098465), format: "ebook", status: "finished", finishedAt: iso(-15), pages: 385 },
  { clientId: "w4", title: "It Ends With Us", author: "Colleen Hoover", coverUrl: cover(10473609), format: "physical", status: "finished", finishedAt: iso(-5), pages: 384 },
  { clientId: "w5", title: "The Midnight Library", author: "Matt Haig", coverUrl: cover(10313767), format: "ebook", status: "finished", finishedAt: iso(-58), pages: 304 },
  { clientId: "w6", title: "Project Hail Mary", author: "Andy Weir", coverUrl: cover(11200092), format: "audiobook", status: "reading", pages: 496 },
  { clientId: "w7", title: "The Hobbit", author: "J.R.R. Tolkien", coverUrl: cover(14627509), format: "physical", status: "reading", pages: 310 },
  { clientId: "w8", title: "Pride and Prejudice", author: "Jane Austen", coverUrl: cover(14348537), format: "physical", status: "want", pages: 432 },
];

// Reading history: work through each finished book ending on its finish date,
// then a live 12-day streak on the current reads (so her streak is hot today).
function buildSessions() {
  const sessions = [];
  let n = 0;
  const mulberry = (() => { let s = 42; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  for (const b of books.filter((x) => x.status === "finished")) {
    const finishOffset = Math.round((new Date(b.finishedAt) - Date.now()) / 86400000);
    const count = 8 + Math.floor(mulberry() * 4);
    let pagesLeft = b.pages;
    for (let i = count - 1; i >= 0; i--) {
      const offset = finishOffset - i * (1 + Math.floor(mulberry() * 2));
      const pagesRead = i === 0 ? pagesLeft : Math.min(pagesLeft, 25 + Math.floor(mulberry() * 60));
      pagesLeft -= pagesRead;
      sessions.push({
        clientId: `s${n++}`,
        bookClientId: b.clientId,
        date: day(offset),
        minutes: 20 + Math.floor(mulberry() * 55),
        pagesRead: b.format === "audiobook" ? 0 : pagesRead,
      });
    }
  }
  // the streak: every one of the last 12 days
  for (let i = 11; i >= 0; i--) {
    const b = i % 2 === 0 ? books[5] : books[6];
    sessions.push({
      clientId: `s${n++}`,
      bookClientId: b.clientId,
      date: day(-i),
      minutes: 25 + Math.floor(mulberry() * 45),
      pagesRead: b.format === "audiobook" ? 0 : 12 + Math.floor(mulberry() * 24),
    });
  }
  return sessions;
}

async function main() {
  await db.user.upsert({
    where: { id: DEMO_ID },
    create: { id: DEMO_ID, username: "wrenny", displayName: "Wren Bookish" },
    update: { username: "wrenny", displayName: "Wren Bookish" },
  });

  await db.syncedBook.deleteMany({ where: { userId: DEMO_ID } });
  await db.syncedSession.deleteMany({ where: { userId: DEMO_ID } });
  await db.syncedBook.createMany({
    data: books.map(({ pages: _pages, ...b }) => ({ ...b, userId: DEMO_ID, finishedAt: b.finishedAt ?? null })),
  });
  const sessions = buildSessions();
  await db.syncedSession.createMany({
    data: sessions.map((s) => ({ ...s, userId: DEMO_ID })),
  });

  // Her challenge — join it with the invite code to see a live leaderboard
  const start = day(0).slice(0, 8) + "01";
  const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  const challenge = await db.challenge.upsert({
    where: { inviteCode: "WRNBK2" },
    create: {
      creatorId: DEMO_ID,
      name: "Wren's Page Cup",
      metric: "pages",
      target: 1500,
      startDate: start,
      endDate: end,
      inviteCode: "WRNBK2",
      participants: { create: { userId: DEMO_ID } },
    },
    update: {},
  });

  // Befriend only the accounts named with --friend (comma-separated usernames).
  // Never auto-friend every real user — other people didn't ask for a demo pal.
  const friendArg = process.argv.find((a) => a.startsWith("--friend="));
  const wanted = friendArg
    ? friendArg.slice("--friend=".length).split(",").map((s) => s.trim().toLowerCase())
    : [];
  const realUsers = wanted.length
    ? await db.user.findMany({
        where: { id: { not: DEMO_ID }, username: { in: wanted } },
      })
    : [];
  for (const u of realUsers) {
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: DEMO_ID, addresseeId: u.id } },
      create: { requesterId: DEMO_ID, addresseeId: u.id, status: "accepted" },
      update: { status: "accepted" },
    });
    // Book recommendations travel as messages now
    const existingMsg = await db.message.findFirst({
      where: { fromId: DEMO_ID, toId: u.id, bookTitle: "The Song of Achilles" },
    });
    if (!existingMsg) {
      await db.message.create({
        data: {
          fromId: DEMO_ID,
          toId: u.id,
          body: "This one broke me. Your turn. 🥲",
          bookTitle: "The Song of Achilles",
          bookAuthor: "Madeline Miller",
          bookCover: cover(7098465),
          bookRating: 5,
          bookReview: "The last fifty pages rearranged me. Read it slowly.",
        },
      });
    }
  }

  console.log(`Seeded @wrenny: ${books.length} books, ${sessions.length} sessions`);
  console.log(`Challenge "${challenge.name}" — invite code WRNBK2`);
  console.log(`Auto-friended ${realUsers.length} existing user(s)`);
}

main().finally(() => db.$disconnect());
