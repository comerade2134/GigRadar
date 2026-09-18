# Security & Privacy Policy

## Our Guarantees

GigRadar is engineered as a client-side inspection tool with no GigRadar backend, analytics, or telemetry:

1. **No GigRadar Data Backend**: GigRadar runs its analysis locally in your browser. We operate no analytics servers, tracking databases, or telemetry collectors. Optional requests go directly to ExtensionPay, Upwork, OpenAI, or Anthropic as described in the privacy policy.
2. **Minimal Permissions Scope**: The extension's host permissions are bounded to `*://*.upwork.com/*` and `https://extensionpay.com/*`; optional AI and RSS hosts are requested only when their features are enabled.
3. **Local BYOK AI Storage**: If you enable optional AI polish with your OpenAI or Anthropic API key, your key is stored locally in `chrome.storage.local` on your browser profile and communicated directly to the respective API provider over HTTPS.

## Reporting a Vulnerability

If you discover a security vulnerability or credential leak issue in GigRadar, please do **not** open a public GitHub issue.

Instead, please send an email directly to:
**keem21@atomicmail.io**

Please include:
- A description of the issue and potential impact
- Step-by-step reproduction instructions or proof-of-concept
- Any relevant logs or browser console traces

We will acknowledge your report within 48 hours and coordinate a fix and release.
