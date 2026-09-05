# GigRadar Privacy Policy

**Effective date:** September 5, 2026  
**Applies to:** GigRadar — Upwork Client Inspector ("GigRadar", "the extension")

GigRadar operates strictly on a local-first, zero-telemetry architecture. We have no analytics servers, no remote user tracking, and no external user accounts.

---

### 1. Data We Access and Process
GigRadar accesses and processes the following information strictly within your local browser:
- **Webpage Content (Upwork):** When you browse Upwork (upwork.com), the extension reads publicly displayed job listings, client hire rates, total spend, and feedback review text from the active page DOM to calculate client intent scores and extract client names.
- **Local Settings and Cache:** Search preferences, RSS scanner configuration, Connects-saved tallies, and temporarily cached job intel (titles, descriptions, client names) are stored on your device to pre-fill proposal pages. Cached job data auto-expires after 7 days.
- **Optional API Credentials (BYOK):** If you enable the optional AI polish feature, your OpenAI or Anthropic API key is stored locally in your browser.

---

### 2. How We Use and Handle Data
All data accessed by GigRadar is handled exclusively to provide client-side extension features:
- Computing the deterministic 0–100 Client Intent Score.
- Rendering in-page visual red-flag alerts (low hire rate, saturation warnings).
- Generating proposal opening hooks and pre-filling proposal fields.
- Monitoring user-provided saved-search RSS feeds for desktop notifications.

All processing occurs locally in your active browser tab. No web page content or browsing data is uploaded or transmitted to any servers operated by GigRadar.

---

### 3. Data Storage and Security
- **Local Storage Sandbox:** All extension data and user preferences are stored exclusively in your browser’s `chrome.storage.local`.
- **Zero Remote Storage:** We do not operate remote databases or external servers. Your data never leaves your device except as described in Section 4.

---

### 4. Data Sharing and Third-Party Disclosures
GigRadar does **NOT** sell, rent, monetize, or transfer your personal data, browsing history, or job information to third parties. Data is only communicated in these user-directed cases:
- **Payment Processing (ExtensionPay / Stripe):** If you purchase GigRadar Pro, payments are processed directly by ExtensionPay and Stripe under their respective privacy policies. GigRadar only receives verification of your paid/unpaid license status.
- **Optional AI Providers (OpenAI / Anthropic):** If you explicitly enable "AI Polish" and supply your own API key, proposal text is sent directly from your browser to that provider via HTTPS. This is disabled by default and requires user consent.
- **Upwork RSS (Optional):** If you enable the Real-Time Job Scanner, the extension queries the specific saved-search RSS URL you configured using your active browser session.

---

### 5. Data Retention and Deletion
- **Local Expiration:** Cached job intel automatically expires and is purged after 7 days.
- **Complete Deletion:** Uninstalling the GigRadar extension from `chrome://extensions` immediately and permanently destroys all locally stored data and settings.

---

### 6. Contact Information
For questions or privacy concerns, contact:
- **Developer:** Abdu Alsheikh
- **Email:** keem21@atomicmail.io
- **Repository:** https://github.com/comerade2134/GigRadar
