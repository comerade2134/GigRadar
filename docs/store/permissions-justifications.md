# CWS Review — Permission Justifications

Paste-ready answers for the Chrome Web Store "Permissions" tab. Reviewers reject vague answers; these are specific and testable.

## Single purpose

> GigRadar helps Upwork freelancers evaluate clients on job listings they are already viewing: it scores client signals, warns about wasted bids, extracts the client's first name from past feedback, and drafts proposal openers.

## `storage`

> Stores user settings (AI polish, RSS scanner), the purchased-license cache, a 7-day auto-expiring cache of job intel used to pre-fill proposal pages, and the local "Connects Protected" counter. All data stays in local extension storage on the user's device; nothing syncs or transmits.

## `alarms`

> Powers the optional Real-Time Job Scanner. When the user enables it with their own Upwork saved-search RSS URL, a periodic alarm (minimum 1 minute, default 3) triggers a background check of that feed so the user can be notified of fresh high-signal jobs. The alarm is removed when the feature is disabled. Off by default.

## `notifications`

> Used exclusively by the optional Real-Time Job Scanner to show a notification when a new job matching the user's saved-search criteria appears in their RSS feed. Clicking a notification opens the job posting. Off by default.

## Content script — `*://*.upwork.com/*` (main)

> Injects the core UI: a score pill under each job listing in search results and an intel panel on job detail pages. It reads only the DOM of pages the user has open; it performs no network requests and sends no page data anywhere. A second content script scoped to proposal pages (`/nx/proposals/job/*`, `/ab/proposals/job/*`) adds a toolbar that fills the cover-letter field with a generated opener when clicked.

## Content script — `https://extensionpay.com/*` (`document_start`)

> Required relay script for ExtensionPay's official Manifest V3 integration: it forwards payment-success messages from the ExtensionPay checkout tab back to our service worker so the license activates immediately after purchase. Vendor code per ExtPay's documented MV3 setup.

## Optional host permissions — `api.openai.com`, `api.anthropic.com`

> Requested only when the user enables "AI Polish" and provides their own API key for the selected provider. Hook text is sent directly from the browser to that provider using the user's key. Declining the permission keeps AI polish disabled; every other feature works without it.

## Optional host permissions — `www.upwork.com`

> Requested only when the user enables the Real-Time Job Scanner, so the background worker can fetch the RSS feed of the user's own saved Upwork search (with their existing session cookies). Declining keeps the scanner off; all on-page features work without it.

## Remote code statement

> No remote code. All JavaScript is bundled at build time. The only third-party library (ExtPay) is vendored into the package because MV3 CSP prohibits loading it remotely.
