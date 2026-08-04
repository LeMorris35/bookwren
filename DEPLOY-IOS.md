# BookWren → TestFlight (no Mac required)

Same setup you used for LifeMetricOS: **Codemagic** rents a cloud Mac mini,
builds the iOS app, signs it, and uploads it to TestFlight. You never touch
Xcode.

The `ios/` project and `codemagic.yaml` are already generated and committed —
they were made here on Windows.

## What this app is

A native shell around **https://bookwren.app**. Web deploys reach every phone
instantly with no App Store review; only native changes (icon, plugins, config)
need a new build.

Already wired up natively: launch screen, app icon, status bar that follows
Wren/Raven, notch + home-indicator safe areas, no rubber-band scroll, 16px
inputs (so iOS never zoom-jumps on a text field), haptic tap when you log a
session, success buzz when you finish a timer, edge-swipe back, portrait
locked, and an offline screen.

---

## Step 1 — Put the code on GitHub

Codemagic builds from a repo. From `C:\Users\LeviM\Projects\shelfmark`:

```bash
git add -A && git commit -m "BookWren: iOS shell + Codemagic build"
```

Then create an empty **bookwren** repo on GitHub (no README), and:

```bash
git remote add origin https://github.com/LeMorris35/bookwren.git && git branch -M main && git push -u origin main
```

> ⚠️ `.env`, `.env.production` and `.env.local` are gitignored — your database
> URL and Clerk secret keys will **not** be pushed. Keep it that way.

## Step 2 — Register the App ID with Apple

In [App Store Connect](https://appstoreconnect.apple.com) → **My Apps → +**:

- Platform: iOS
- Name: **BookWren**
- Bundle ID: **`com.lammedia.bookwren`**
  (if it isn't in the dropdown, create it first at
  developer.apple.com → Certificates, IDs & Profiles → Identifiers → +)
- SKU: `bookwren`

Then open **App Information → General Information** and copy the numeric
**Apple ID** (looks like `6783981457`). Paste it into `codemagic.yaml`:

```yaml
APP_STORE_APP_ID: "6XXXXXXXXX"
```

That's what auto-increments the build number. Leaving it blank still works for
the first build.

## Step 3 — Set up Codemagic

1. Sign in at [codemagic.io](https://codemagic.io) with GitHub
2. **Add application** → pick the `bookwren` repo → it will detect
   `codemagic.yaml`
3. Confirm the App Store Connect integration exists:
   **Teams/Settings → Integrations → App Store Connect**.
   The config reuses your existing key named **`LifeMetricOS ASC`** — the same
   key works for every app on your Apple account. If you'd rather have a
   separate one, add it and change the `app_store_connect:` name in
   `codemagic.yaml` to match exactly.
4. **Start new build** → workflow **BookWren iOS (TestFlight)**

It takes roughly 8–15 minutes. Codemagic emails you on success or failure.

## Step 4 — TestFlight

1. App Store Connect → **TestFlight** → wait for processing (5–30 min)
2. Answer Export Compliance: the app uses only standard HTTPS →
   **No** to "non-exempt encryption"
3. **Internal testers** (up to 100, no review, instant): add yourself and Lydia
4. **External testers** (up to 10,000, needs a ~1 day Beta App Review): this is
   where your sister's readers go. Fill in Test Information first.

**What to Test** (paste this in):

> Track your reading: add a book, run the timer, keep your streak alive.
> Then try the social side — add a friend, start a challenge, and send someone
> a book with your rating and review. Tell me anything that felt slow,
> confusing, or broken.

**App Review Information → Notes** (for the external review):

> BookWren works fully without an account — tracking, timer, stats, and
> importing a library need no sign-in. Creating a free account only adds the
> social features (friends, challenges, messages). No demo account needed.

---

## Before the public App Store (not needed for TestFlight)

Apple can reject apps that are only a repackaged website
(**Guideline 4.2**). The strongest fix, in order:

1. **Push notifications** — "your friend invited you to a challenge", "someone
   sent you a book", streak reminders. Needs
   `@capacitor/push-notifications` + an APNs key. This is also the feature the
   app genuinely wants next.
2. Home-screen widget or Live Activity for the reading timer
3. Offline reading log — already true, worth saying in the review notes
4. Siri Shortcut: "start reading"

## Shipping updates later

- **Web change** (almost always): deploy to Vercel. Every phone has it on next
  launch. No build, no review.
- **Native change**: push to GitHub → run the Codemagic workflow again. The
  build number auto-increments.

## If a build fails

- **"Cannot save ... without private key"** → already handled; the config
  generates a fresh RSA key before fetching signing files.
- **Bundle ID mismatch** → `codemagic.yaml` `BUNDLE_ID`,
  `ios/App/App.xcodeproj` `PRODUCT_BUNDLE_IDENTIFIER`, and
  `capacitor.config.ts` `appId` must all be `com.lammedia.bookwren`.
- **Pod install errors** → `npx cap sync ios` runs on the Mac; check that
  `package-lock.json` was committed (`npm ci` needs it).
- Build logs and the `.ipa` are downloadable from the Codemagic build page.
