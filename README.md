<div align="center">

# ⚡ GigRadar — Upwork Client Inspector

<p align="center">
  <strong>Know the client before you spend a single Connect.</strong>
</p>

<p align="center">
  <a href="https://github.com/comerade2134/GigRadar/releases"><img src="https://img.shields.io/badge/Release-v0.2.0--beta-10B981?style=for-the-badge&logo=github&logoColor=white" alt="Release v0.2.0"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest-V3-10B981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-3.4-38B2D1?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#-quick-install-beta"><strong>Quick Install (Beta)</strong></a> •
  <a href="https://5eadaf17.gigradar-3tj.pages.dev/"><strong>Live Website</strong></a> •
  <a href="#-features"><strong>Features</strong></a> •
  <a href="#-the-problem--gigradar-solution"><strong>Comparison</strong></a> •
  <a href="#-architecture"><strong>Architecture</strong></a> •
  <a href="#-faq"><strong>FAQ</strong></a>
</p>

---

</div>

Upwork hides client hiring history, true historical hourly pay, and past contractor names behind 3 clicks. **GigRadar** is a lightweight, zero-telemetry Chrome extension (Manifest V3) that parses and injects a deterministic **0–100 Client Intent Score**, **red-flag waste alerts**, **extracted client names**, and **personalized proposal hooks** directly into your Upwork feed in real-time.

---

## 🛑 The Problem & GigRadar Solution

Upwork charges **~$0.15 per Connect**, and modern listings routinely demand **8 to 16 Connects ($1.20 to $2.40)** just to submit a single proposal. Freelancers waste thousands of dollars annually bidding on ghost listings, clients with 0% hire rates, and scam traps.

| Upwork Default (Blind Bidding) | GigRadar Injected Telemetry |
| :--- | :--- |
| ❌ Lists inflated "$60–$90/hr" budget with no context | ⚡ **True Pay Benchmark**: Shows client actually paid **$8.50/hr** on past contracts |
| ❌ Hides client hire rate unless you open detail drawer | ⚡ **Deterministic Intent Score (0–100)**: Flags `<25%` danger & `<30%` feed warnings |
| ❌ No client name shown (start with generic "Hi there") | ⚡ **Client Name Extraction**: Scans past reviews to find "Sarah Mitchell" |
| ❌ Saturation traps (50+ bids on unverified dead jobs) | ⚡ **Connects-Waste Alerts**: 1-second badge to skip and save 14 Connects ($2.10) |
| ❌ Off-platform scam handoffs (Telegram / WhatsApp) | ⚡ **Scam Scanner**: Automatic regex alerts on payment evasion and free work traps |

---

## ✨ Features

### 1. ⚡ Deterministic Client Intent Score (0–100)
A pure mathematical score computed from lifetime hire rate, verified spend, payment method status, and posting recency. **100% deterministic math — zero AI hallucination.**

### 2. ⚠️ Connects-Waste & Scam Red-Flags
Immediate visual warning strips on job cards that identify:
- **Low Hire Rates**: Red-flag danger at `<25%` hire rate; amber warning at `<30%`.
- **Proposal Saturation**: Warnings for 50+ submitted proposals on low-intent jobs.
- **Scam / Off-Platform Traps**: 6 regex scanning categories detecting Telegram, WhatsApp, direct email pivots, and "free sample test" traps.
- **Payment Verification**: Flags unverified payment methods before you open the listing.

### 3. 🔍 Client First Name Extraction
Cross-references past freelancer feedback to extract the client's real first name with a confidence gate and stoplist. Start your proposal with *"Hi Sarah,"* instead of generic greeting spam.

### 4. 💰 True Rate Benchmark
Compares the client's advertised job budget against the historical hourly and fixed rates they actually paid past freelancers. Never underprice or bid blind again.

### 5. ✍️ 1-Click Proposal Hook Generator
Generates three tailored, deterministic opening hooks (FNV-1a seeded) for every listing:
- **Variant A (Problem/Fix)**: Directly addresses the client's primary tech requirement.
- **Variant B (Proof/Portfolio)**: References the client's hiring volume and relevant repo samples.
- **Variant C (Rate Match)**: Aligns with the client's historical payment benchmark.

### 6. 🔔 Real-Time Saved-Search RSS Scanner
Watches your saved-search RSS feeds in the background and sends instant desktop notifications the exact second a high-intent, verified client posts a matching listing.

### 7. 🤖 BYOK AI Polish (Optional)
Bring your own OpenAI or Anthropic API key stored 100% locally in `chrome.storage.local`. Proxies requests directly through the service worker without remote intermediary servers.

---

## 🚀 Quick Install (Beta)

### Option A: Pre-built Package (Recommended — 2 minutes)

1. Download **[`gigradar.zip`](https://github.com/comerade2134/GigRadar/releases)** from the latest release.
2. Unzip `gigradar.zip` to a local folder (e.g., `Downloads/gigradar`).
3. Open your browser and navigate to `chrome://extensions` (Chrome, Brave, Edge).
4. Toggle **Developer mode** on in the top-right corner.
5. Click **Load unpacked** and select the unzipped `gigradar` folder.
6. Open [Upwork](https://www.upwork.com/nx/search/jobs/) — GigRadar score pills and intel panels will render automatically!

---

### Option B: Build from Source

```bash
# 1. Clone repository
git clone https://github.com/comerade2134/GigRadar.git
cd GigRadar

# 2. Install dependencies
pnpm install

# 3. Start development mode with HMR
pnpm dev

# Or build for production
pnpm build
```

Then load the resulting `dist/` directory via `chrome://extensions` → **Load unpacked**.

---

## 🏗️ Architecture

```
src/
├── types.ts                     # Shared domain types & runtime message unions
├── context.ts                   # Context helpers
├── config/
│   └── selectors.ts             # Centralized DOM selector fallback chains
├── engine/
│   ├── scoring.ts               # Weighted 0–100 score & null-aware redistribution
│   ├── red-flags.ts             # 6-category scam & off-platform regex scanner
│   ├── sentiment.ts             # Negative-feedback keyword analysis & temperament
│   ├── name-extractor.ts        # Regex voting over past reviews + confidence gate
│   ├── templates.ts             # Deterministic category hook matrix (FNV-1a seeded)
│   ├── feed-scanner.ts          # RSS parsing + heuristic scoring + notification cache
│   ├── metrics.ts               # Connects-saved counter (8 Connects per skipped job)
│   └── byok.ts                  # Local BYOK settings storage & SW message proxy
├── monetization/
│   ├── extpay-core.ts           # ExtensionPay configuration (single source of truth)
│   └── extpay.ts                # License sync, cache, and upgrade flow
├── background/
│   └── service-worker.ts        # ExtPay background worker, RSS alarms, and BYOK proxy
└── content/
    ├── parse.ts                 # Currency/percentage/count parsers & DOM extractors
    ├── badge.ts                 # Shadow-DOM score pill injected into feed cards
    ├── modal.ts                 # Slide-out intel panel: signals, flags, name & hooks
    ├── proposal-autofill.ts     # Quick-Fill toolbar & screening question helper
    ├── payment-relay.ts         # ExtensionPay document_start payment relay
    └── index.ts                 # Debounced MutationObserver orchestrator & drawer
```

---

## 🔒 Design & Privacy Guarantees

- **Zero Background Fetching**: GigRadar only parses DOM nodes you actively view in your browser. No mass automated requests on Upwork's servers.
- **Strict Host Scope**: Content scripts match `*://*.upwork.com/*` exclusively; no other hosts are accessed unless BYOK AI is explicitly enabled.
- **Shadow DOM Style Isolation**: All injected badges, pills, and drawers live in closed Shadow Roots. Upwork's CSS cannot break GigRadar, and GigRadar styles never leak into Upwork.
- **Zero Remote Analytics**: No tracking pixels, no telemetry databases, and no external user tracking.

---

## 🛠️ Selector Maintenance

Upwork updates their React DOM classes periodically. All selectors live in a single file: [`src/config/selectors.ts`](src/config/selectors.ts).

If an Upwork update breaks a badge or panel:
1. Inspect the new element in Chrome DevTools.
2. Add the new selector to the top of the ordered fallback array in `src/config/selectors.ts`.
3. Submit a PR or open a [DOM Selector Issue](https://github.com/comerade2134/GigRadar/issues/new?template=selector_fix.md).

---

## 💎 Pricing & Monetization

GigRadar operates on an honest, one-time payment model with **no subscriptions**:

- **Free Tier ($0)**: 0–100 Client Intent Score, red-flag alerts, feed warnings, and basic RSS scanner.
- **Pro Tier ($9.99 Early Bird · First 50 freelancers → then $19.99)**: Client name extraction, 3x proposal hook generator, historical pay benchmark, and BYOK AI polish.

Pro is unlocked **directly inside the extension** via [ExtensionPay](https://extensionpay.com) and Stripe:
1. Click the blurred **"Unlock with GigRadar Pro"** card in any drawer or popup.
2. Complete checkout on Stripe.
3. License syncs within seconds and unblurs Pro features immediately.

---

## ❓ FAQ

<details>
<summary><strong>Will using GigRadar get my Upwork account banned?</strong></summary>
<p>No. GigRadar does not automate proposals, send bot requests, or scrape Upwork's private APIs. It operates strictly as a client-side visual inspector that reads the HTML already loaded in your active browser window and calculates statistics locally.</p>
</details>

<details>
<summary><strong>How does client name extraction work?</strong></summary>
<p>GigRadar scans past freelancer reviews on the client's profile for linguistic greeting and gratitude patterns (e.g., "Sarah was a pleasure to work with...", "Thanks Sarah for the clear specs..."), runs a regex voting engine with a stoplist filter, and outputs the highest-confidence first name.</p>
</details>

<details>
<summary><strong>Where are my OpenAI / Anthropic API keys stored?</strong></summary>
<p>Your API keys live strictly in <code>chrome.storage.local</code> on your individual browser profile. They are never sent to any GigRadar server.</p>
</details>

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, development setup, and PR submission process.

---

## 📄 License

GigRadar is open-source software licensed under the [MIT License](LICENSE).
ExtPay module is vendored locally under AGPLv3.

---

<p align="center">
  Crafted by <a href="https://github.com/comerade2134"><strong>comerade2134</strong></a> • Direct questions to <a href="mailto:keem21@atomicmail.io"><strong>keem21@atomicmail.io</strong></a>
</p>
