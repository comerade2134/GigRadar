# GigRadar Privacy Policy

_Effective date: 2026-08-23 · Applies to the GigRadar Chrome extension ("GigRadar", "the extension")._

**The short version: GigRadar has no servers, no accounts, and no analytics. Your data stays in your browser.**

## What we collect

Nothing. GigRadar does not collect, transmit, sell, or share personal data. There is no backend. There is no telemetry.

## Data stored on your device

GigRadar saves the following in your browser's local extension storage (`chrome.storage.local`). This data never leaves your machine unless described below:

- **Settings** — AI polish preferences, RSS scanner configuration.
- **License cache** — whether you purchased Pro (checked via ExtensionPay).
- **Job intel cache** — job titles, URLs, descriptions and client names from pages you browsed, used to pre-fill proposal pages. Auto-expires after 7 days.
- **Connects Protected counter** — a running tally of flagged jobs you skipped.

## Third-party services you choose to use

1. **ExtensionPay** — if you purchase GigRadar Pro, payment processing is handled by ExtensionPay and Stripe under their own privacy policies. GigRadar only receives a paid/unpaid status.
2. **OpenAI or Anthropic (optional)** — if *you* enable "AI Polish" and paste your own API key, hook text is sent directly from your browser to that provider using your key. This is off by default and requires an explicit permission prompt.
3. **Upwork RSS feed (optional)** — if you enable the Real-Time Job Scanner, the extension fetches the saved-search RSS URL you provided, using your browser's existing Upwork session. The scanner is off by default.

## Upwork page data

GigRadar parses the content of Upwork pages you have open to compute scores and flags. That analysis happens locally in your browser tab. No page content is uploaded anywhere by us.

## Permissions

Each permission maps to a user-facing feature and is requested at install time only where strictly needed (`storage`, `alarms`, `notifications`). Host permissions for AI providers and Upwork are optional and prompted only when you enable the related feature. See our permission justifications in the store listing notes.

## Data deletion

Remove the extension and all locally stored data is destroyed. Nothing persists elsewhere because nothing was ever sent anywhere.

## Changes

Material changes to this policy will be noted in the extension's release notes with a new effective date.

## Contact

Questions: **keem21@atomicmail.io**
