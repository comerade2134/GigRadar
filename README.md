# ⚡ GigRadar — Upwork Client Inspector

Chrome extension (Manifest V3) that injects a client-intent score into Upwork job listings, flags dead jobs before you spend Connects, extracts the client's first name from past feedback, and generates personalized proposal hooks.

## Stack

- Vite 5 + `@crxjs/vite-plugin` (MV3 HMR)
- Vanilla TypeScript (strict)
- Tailwind CSS 3 (popup + options pages; in-page UI uses isolated Shadow DOM)
- ExtensionPay ($29 lifetime license)

## Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)

## Develop

```bash
pnpm install
pnpm dev
```

Then:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder of this repo
4. Browse any Upwork search or job page — badges appear under each listing; the floating "⚡ GigRadar Intel" pill appears on job detail pages

The dev server hot-reloads content scripts and pages while you edit.

## Production build

```bash
pnpm build      # typechecks, then bundles to dist/
pnpm zip        # dist/ → gigradar.zip for Chrome Web Store upload
```

## Monetization setup (ExtensionPay)

ExtPay is vendored locally (`src/vendor/extpay.module.js`, AGPLv3, from [Glench/ExtPay](https://github.com/Glench/ExtPay)) because Manifest V3 CSP blocks remote scripts on extension pages.

1. Create an extension entry at <https://extensionpay.com> and connect Stripe.
2. Replace `REPLACE_WITH_EXTENSIONPAY_EXTENSION_ID` in `src/monetization/extpay-core.ts` with your real extension ID (single source of truth).
3. Free tier: intent score + red-flag warnings. Pro ($29 lifetime): client-name extractor + proposal hook generator.

Wiring already in place:

- Popup/options instantiate ExtPay directly (ESM import) — no CDN tag, no CSP errors.
- Service worker calls `startBackground()` so post-payment pings resolve.
- A `document_start` content script on `https://extensionpay.com/*` relays successful-payment messages back to the service worker (mirrors the official MV3 sample).

To upgrade ExtPay later: re-download `dist/ExtPay.module.js` from the upstream repo into `src/vendor/`.

## AI Polish (BYOK)

Options page → enable AI polish → pick provider (OpenAI / Anthropic) → paste key. The key lives in `chrome.storage.local` on that browser profile only. Enabling requests optional host permissions for the provider API domain; calls are proxied through the service worker.

## Architecture

```
src/
├── types.ts                  shared domain types + runtime message union
├── config/selectors.ts       every DOM selector with fallback chains (patch here when Upwork ships redesigns)
├── engine/
│   ├── scoring.ts            weighted 0–100 score, null-aware weight redistribution, red flags
│   ├── name-extractor.ts     regex voting over past-feedback text + stoplist + confidence gate
│   ├── templates.ts          deterministic category-tagged hook templates (fnv1a-seeded)
│   └── byok.ts               BYOK settings storage + permission request + SW message call
├── monetization/extpay.ts    license sync/cache (24h TTL) + upgrade flow
├── background/service-worker.ts   OPEN_OPTIONS relay + BYOK provider proxy fetch
└── content/
    ├── parse.ts              money/%/count/relative-time parsers + card & detail extraction
    ├── badge.ts              Shadow-DOM score pill injected per job card
    ├── modal.ts              slide-out intel panel: signals, flags, name, hook generator
    └── index.ts              debounced MutationObserver orchestrator + detail-page trigger
```

### Design guarantees

- **Zero background fetching**: enrichment parses only DOM the user already has open (hover/click/slide-out). No automated mass requests on the feed.
- **Strict host scope**: content script matches `*://*.upwork.com/*`; no other hosts unless BYOK is explicitly enabled by the user.
- **Style isolation**: all injected UI lives in closed Shadow Roots — no bleed into Upwork's CSS, none back.

## Selector maintenance

Upwork ships redesigns without notice. All selectors live in one file (`src/config/selectors.ts`) as ordered fallback chains — when a badge stops appearing, update the chain there; nothing else needs touching.
