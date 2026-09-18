# GigRadar Privacy Policy

**Effective date:** September 18, 2026
**Applies to:** GigRadar — Upwork Tactical Intelligence & Autopilot ("GigRadar", "the extension")

**The short version:** GigRadar has no central user tracking, analytics servers, or remote user accounts. Data processing operates locally in your browser. Optional cloud features (BYOK AI, team sync, webhooks) communicate directly with the third-party providers you configure.

---

### 1. Data We Access and Process
GigRadar accesses and processes information strictly to provide extension functionality:
- **Webpage Content (Upwork):** When you browse Upwork (`upwork.com`), the extension inspects publicly displayed job listings, client hire rates, total spend, and feedback reviews from the active page DOM to calculate client intent scores, display red flags, and extract client names.
- **Local Storage & Pipeline Cache:** Preferences, language settings, custom voice tones, case studies, offline lead pipelines, Connects-saved counters, and temporary job intel (auto-expiring after 7 days) are stored locally in your browser (`chrome.storage.local`).
- **Optional AI Credentials (BYOK):** If you enable AI Polish or Client Dossiers, your OpenAI or Anthropic API key is stored locally in your browser and sent directly to that provider's official API endpoint.
- **Optional Webhooks & Team CRM:** If you configure Slack, Discord, or custom CRM webhooks, event notifications (job titles, deal values, claim statuses) are dispatched directly from your browser to your specified webhook URL.
- **Optional RSS Feed Scanner:** If you enable the Real-Time Job Scanner, your configured saved-search RSS URL is queried using your existing Upwork session to deliver desktop notifications.

---

### 2. How We Use Data
All data processed by GigRadar is used solely to provide user-requested features:
- Computing the deterministic 0–100 Client Intent Score.
- Generating proposal drafts and matching relevant case studies.
- Forecasting boost auction ROI and win probabilities.
- Preventing team bid collisions across agency teammates.
- Delivering desktop alerts for high-value client leads.

---

### 3. Data Sharing and Third-Party Disclosures
GigRadar does **NOT** sell, rent, monetize, or track your personal browsing data. External network transmissions occur only in these user-initiated scenarios:
1. **ExtensionPay & Stripe:** For license verification and Pro/Agency checkout. Payments are handled securely by ExtensionPay and Stripe. GigRadar receives only license verification status, never credit card details.
2. **AI Providers (OpenAI / Anthropic):** Only when you configure BYOK and explicitly submit prompts. Requests are sent directly over HTTPS using your personal API key.
3. **Webhooks (Slack / Discord / Custom CRM):** Only when you enter a webhook URL in settings. Payloads are transmitted directly to your configured endpoints.
4. **Upwork Saved Searches:** Only when you configure the RSS scanner.

---

### 4. Data Retention and Deletion
- **Local Expiration:** Cached job intelligence is automatically deleted after 7 days.
- **Complete Deletion:** Uninstalling GigRadar from `chrome://extensions` immediately deletes all stored settings, caches, and local configurations.

---

### 5. Contact Information
For questions or privacy inquiries:
- **Developer:** Abdu Alsheikh
- **Email:** keem21@atomicmail.io
- **Repository:** https://github.com/comerade2134/GigRadar
