# Beta Distribution Guide (pre-Web-Store)

Ship to early users while the CWS review runs. Two channels: GitHub Release (recommended) and manual unpacked load.

## A. GitHub Release — primary channel

1. Ensure `pnpm zip` artifacts are current (`gigradar.zip` at repo root).
2. Tag the release:
   ```
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. Create the release on GitHub → upload **`gigradar.zip`** as the asset.
4. Suggested release notes:

   ```md
   ## GigRadar v0.2.0 — Public Beta

   ### Install (2 minutes, no dev tools needed)
   1. Download `gigradar.zip` below and unzip it.
   2. Open `chrome://extensions` in Chrome/Edge/Brave.
   3. Toggle **Developer mode** (top right).
   4. Click **Load unpacked** → select the unzipped folder.

   The extension is loaded. Open Upwork and look for GigRadar pills under job listings.

   ### Updating later
   Repeat steps 1 and 4 with the newer zip (remove the old folder first). Chrome picks up changes on reload via the ↻ button on the extension card.

   ### What's new in 0.2.0
   - Real-Time Job Scanner: RSS watch + desktop notifications for fresh high-intent jobs
   - Proposal page Quick-Fill toolbar + screening-question auto-drafts
   - Scam/off-platform detection (Telegram/WhatsApp/email pivots, free-work tests)
   - Client sentiment flag from negative feedback patterns
   - True Rate benchmark vs listed budget inflation warnings
   ```

5. Pin a "known issues" comment as they surface during beta.

> ⚠️ Unpacked extensions show a "Disable developer mode extensions" nag on some Chrome versions and disable themselves if the folder moves. Tell testers to keep the folder in Downloads untouched or re-load it.

## B. Manual unpacked (for non-technical friends)

Same as above minus the release — send them the zip directly with the install steps pasted from the release notes.

## Pro comping plan for beta testers

- Promise on record: **first ~20 testers get 3 months of Pro free at launch** instead of paying the early-bird price.
- Pricing at launch: **$9.99 early bird (first 50 licenses) → $19.99**. Early buyers keep lifetime access at their price. Update `PRO_PRICE` / `PRO_PRICE_NOTE` in `src/monetization/extpay-core.ts` when the ladder steps, and keep the ExtPay plan price in sync.
- Mechanism post-launch: ExtensionPay dashboard → manually grant/extend, or issue a coupon code; log who's comped in the tester sheet (see `docs/marketing/discord-blurb.md`).
- Until ExtPay ID is live, gating stays honest: Pro sections remain blurred until you configure payments. For pre-launch demos, temporarily set a real ID or walk testers through free-tier features only.

## Pre-flight checklist before ANY distribution

- [ ] Real ExtensionPay ID in `src/monetization/extpay-core.ts` (console warning disappears)
- [ ] Purchase loop tested end-to-end with the real ID (buy → license syncs → blur lifts)
- [ ] `pnpm build` green · version bumped in both `manifest.json` and `package.json`
- [ ] Tested logged-out (guest banner) AND logged-in (scores render) on `/nx/search`, `/jobs/~` detail, and one proposal page
- [ ] One deliberately bad listing checked (red-flag chips render, skip counter increments after scroll-past)
