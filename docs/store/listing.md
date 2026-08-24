# Chrome Web Store — Listing Package

Paste-ready copy for the CWS developer dashboard. Character limits verified.

## Identity

| Field | Value |
| --- | --- |
| Name | GigRadar — Upwork Client Inspector *(34/45 chars)* |
| Version | 0.2.0 |
| Category | Productivity |
| Language | English (US) |
| Regions | All regions |

## Short description (132 char limit)

```
Score Upwork clients before you spend Connects. Red-flag alerts, client name extraction and ready-to-send proposal hooks.
```
*(120 chars)*

## Long description

```
Stop burning Connects on dead jobs.

GigRadar sits inside your Upwork feed and tells you — instantly — whether a client is worth bidding on.

WHAT YOU GET (FREE)

● Client Intent Score — every job card gets a 0–100 score built from the client's hire rate, total spend, payment verification and hiring recency. HIGH / MEDIUM / LOW tier at a glance.

● Connects-Waste Alerts — colored strips flag danger jobs before you click: low hire rates under 30%, saturated postings with 50+ proposals, unverified payment methods, and scam/off-platform traps (Telegram handoffs, WhatsApp pivots, "free sample" tests).

● Connects Protected counter — watch your savings stack up every time you skip a flagged job.

● Real-Time Job Scanner (optional) — polls your saved-search RSS feed in the background and pings you when a fresh high-intent job drops, so you can be first to bid.

GIGRADAR PRO — $9.99 EARLY BIRD (first 50 freelancers, then $19.99 — lifetime, no subscription)

● Client Name Extraction — scans past contract feedback and pulls the client's actual first name, with confidence scoring. Because "Hi there," gets ignored and "Hi Sarah," gets read.

● Proposal Hook Generator — three personalized openers per job (Direct, Problem-First, Quick Credibility), built from that job's signals, one click to copy. Plus a Quick-Fill toolbar directly inside Upwork's proposal page.

● AI Polish (bring your own key) — optionally refine any hook through OpenAI or Anthropic. Your key stays on your machine.

Early-bird buyers keep lifetime access forever — the price only rises for future users.

PRIVACY FIRST

GigRadar reads only the pages you already have open. No accounts, no servers, no analytics, nothing leaves your browser except AI calls you explicitly enable with your own API key.

DISCLAIMER

GigRadar is an independent tool. It is not affiliated with, endorsed by, or sponsored by Upwork Global Inc.
```

## SEO keywords (weave into promo text / website meta)

`upwork tool` · `upwork freelancer extension` · `proposal generator` · `client research` · `connects saver` · `upwork job alerts` · `freelance productivity`

## Screenshots required

See `screenshots-SHOTLIST.md` — 3 images at exactly **1280×800** PNG/JPEG, <4 MB each.

## Promotional tile (optional but recommended)

440×280 small promo tile — reuse logo bolt on obsidian `#0D0F12`, brand gradient text, tagline: *"Know the client before you bid."*

## Review notes for testers (paste into "Notes for the reviewer")

```
This extension enhances Upwork pages the user is already browsing.

To see it working: open https://www.upwork.com/nx/search/work/ (a logged-out view is fine) and look for the "GigRadar" pill rendered beneath job listings. The pill opens an intel panel. Guest sessions show a neutral state by design.

The extension requests no host permissions at install time. Optional host permissions (openai/anthropic/upwork) are only requested if the user enables BYOK AI polish or the RSS scanner in Settings.

Monetization uses ExtensionPay; without a configured license key the Pro sections render blurred with an upgrade CTA.
```
