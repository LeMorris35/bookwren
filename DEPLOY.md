# Deploying ChapterClock

Everything is prepped — the only thing I can't do for you is log into Vercel
(it's your account). Two steps, ~3 minutes total.

## ⚠ FIRST: claim the PRODUCTION database (before deploying!)

There are now TWO hosted Postgres databases (Prisma Postgres, us-east-1),
provisioned without needing your login:

- **Production** (recreated Aug 2, 10 PM — the first one died unclaimed) —
  lives in `.env.production`, uploaded to Vercel.
  **Deleted Sunday Aug 3 ~10:11 PM Central unless claimed.** Claim it
  (free, GitHub/Google sign-in, 30 seconds):
  **https://create-db.prisma.io/claim?projectID=proj_up8l41o2hgwkdu1w359ko96a**
- **Dev** — lives in `.env`, used by `npm run dev` on your machine.
  Disposable; recreate any time with `npx create-db@latest`.

Demo data note: `node scripts/seed-demo.mjs` seeds the demo friend
(@wrenny + challenge WRNBK2) into the production DB and auto-befriends
every existing account — safe to re-run after you sign up.

If either expires: `npx create-db@latest`, paste the new connection string
into the matching file, `npx prisma db push` — back in 2 minutes. This early,
the databases only hold synced copies of local test data, so nothing precious
is lost.

## Deploy to Vercel

```bash
vercel login
```

(opens a browser — sign in with GitHub, or create the free account if you
don't have one yet)

Then, from `C:\Users\LeviM\Projects\shelfmark`:

```bash
powershell -File scripts/deploy.ps1
```

The script links the project to Vercel, uploads the three environment
variables (Clerk keys + database URL) without printing them, and ships a
production deploy. It prints your live URL at the end.

## After it's live

1. Open the URL on your phone, sign in, add a book — make sure it feels right.
2. **Clerk is still on development keys.** That's fine for testing (it shows a
   small "development mode" badge and caps signups), but before your sister
   shares it: buy a domain (chapterclock.app or whichever name you pick), then
   in the Clerk dashboard create a Production instance for the ShelfMark app,
   follow its DNS steps, and swap the two Clerk env vars on Vercel to the
   `pk_live_` / `sk_live_` keys.
3. Put your real LAM Media Facebook URL in `lib/site.ts` (still a placeholder).
4. Renaming the app = edit `name` and `url` in `lib/site.ts`. Done.
