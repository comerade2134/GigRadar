# Chrome Web Store Submission Checklist — GigRadar v0.3.2

Follow this checklist to publish `gigradar-0.3.2.zip` to the Chrome Web Store (CWS).

---

## 1. Pre-Flight Artifact Check

- [x] Package built: [`gigradar-0.3.2.zip`](file:///C:/Users/abdu/gigradar/gigradar-0.3.2.zip) (138 KB, verified containing `manifest.json`, `dist/`, `icons/`, etc.).
- [x] Manifest version: `0.3.2` matches in both `manifest.json` and `package.json`.
- [x] All 101 tests green (`pnpm test`).
- [x] TypeScript compiler check green (`pnpm exec tsc --noEmit`).
- [x] 100% dictionary completeness across all 8 languages (`src/i18n/i18n.test.ts`).

---

## 2. Google Developer Dashboard Setup

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. If this is your first extension, pay the one-time $5 developer registration fee.

---

## 3. Package Upload

1. Click **Add new item** (top right) or open your existing GigRadar item.
2. Drag and drop [`gigradar-0.3.2.zip`](file:///C:/Users/abdu/gigradar/gigradar-0.3.2.zip).
3. Confirm the version updates to `0.3.2`.

---

## 4. Store Listing Tab

Copy directly from [`docs/store/listing.md`](file:///C:/Users/abdu/gigradar/docs/store/listing.md):

- **Product name**: `GigRadar — Upwork Tactical Intelligence & Autopilot`
- **Short description**: `Stop wasting Connects on ghost jobs. Client intent scores, proposal autopilot, predictive bid intelligence & agency team sync.`
- **Detailed description**: Paste the full Markdown/text block from `docs/store/listing.md`.
- **Category**: `Productivity` (or `Workflow & Planning`).
- **Language**: `English (United States)`.

---

## 5. Graphic Assets

Upload the following images (see `docs/store/screenshots-SHOTLIST.md`):

1. **Store Icon**: `icons/icon128.png` (128×128 PNG).
2. **Screenshots** (1280×800 or 640×400 PNG/JPEG, 16:10 aspect ratio):
   - Screenshot 1: Feed inspection pills + 0-100 client intent scores + red flags.
   - Screenshot 2: Client detail drawer + proposal autopilot + matched case studies.
   - Screenshot 3: Predictive bid intelligence card on Upwork proposal page + ROI curve.
   - Screenshot 4: Agency lead inbox & team pipeline dashboard.
3. **Small promo tile** (optional, 440×280 PNG): Dark background with brand bolt logo and *"Know the client before you bid."*

---

## 6. Privacy Practices Tab

Answer the privacy disclosure questionnaire accurately:

- **Single Purpose**:
  > *"GigRadar provides freelance bidding analytics, client intent scoring, and proposal drafting intelligence on Upwork to prevent wasted connects."*
- **Permission Justifications**:
  - `storage`: Required to save user settings, offline lead pipeline, custom voice profiles, and cached client metrics locally.
  - `alarms`: Used for background scheduling of periodic RSS feed scans when enabled by the user.
  - `notifications`: Alerts the user when new high-intent jobs match their criteria in the background.
  - `host_permissions` (`https://extensionpay.com/*`): Required for secure license checkout and Pro tier activation.
  - Optional host permissions (`api.openai.com`, `api.anthropic.com`, `www.upwork.com`, `hooks.slack.com`, `discord.com`, `https://*/*`): Requested dynamically only if the user explicitly configures BYOK AI polish, RSS feed scanner, or Agency Slack/Discord/CRM webhooks.
- **Data Usage Disclosure**:
  - Select **"Does not collect or use user data"** or declare that all data is kept strictly client-side.
  - Check *"I certify that this extension complies with the Developer Program Policies."*
- **Privacy Policy URL**:
  - Provide link to hosted policy: e.g. `https://yourdomain.com/privacy` or use the Markdown policy in [`docs/store/privacy-policy.md`](file:///C:/Users/abdu/gigradar/docs/store/privacy-policy.md).

---

## 7. Submit for Review

1. Paste the reviewer notes from `docs/store/listing.md` into **"Notes for the reviewer"**.
2. Click **Submit for Review**.
3. Typical review turnaround is 24–72 hours for Manifest V3 extensions without remote code.
