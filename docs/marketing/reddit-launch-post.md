# Reddit Launch Post — r/Upwork (build-in-public)

> **Posting notes (read first):**
> - Check r/Upwork's current self-promo rules before posting. If promo is restricted, r/freelance and r/Upwork_Skill_Certificates-adjacent communities, or a comment in relevant "how do you pick jobs" threads, are softer entries.
> - Post from your main account with history. Disclose you built it — this draft already does.
> - Best posting window: Tue–Thu, 8–11am ET (freelancers browsing between gigs).
> - Replace `GITHUB_LINK` and answer every comment in the first 3 hours; that's what makes these take off.

---

**Title options (A/B by vibe):**

1. *I got tired of wasting Connects on clients who never hire anyone — so I built a Chrome extension that scores them before I bid*
2. *After 2 years on Upwork I can spot a dead job post in 5 seconds. I taught a browser extension to do it for me.*
3. *I built an extension that shows a client's hire rate, spend and red flags right on the Upwork feed — free while in beta*

---

**Body:**

Every freelancer here knows the pain: you find a decent-looking job, spend Connects, write a proposal… and then notice the client has a 14% hire rate and 60 proposals already. That Connect never had a chance.

I kept doing this at 1am because the client info exists on Upwork — it's just buried behind extra clicks, and when you're skimming 30 listings, you don't click.

So I built **GigRadar**, a Chrome extension that puts that judgment call directly on the feed:

- Every job card gets a **0–100 client intent score** — hire rate, total spend, payment verified, hiring recency, weighted into one number
- **Alert strips** on the nasty ones: low hire rate, saturated posts (50+ proposals), unverified payment, scam/off-platform patterns (the "let's move to Telegram" crowd)
- On job pages it opens an intel panel with the full breakdown, plus a **"true rate" benchmark** — what the client actually paid freelancers vs. what they're listing
- It scans past feedback to find the **client's first name** so proposals can start "Hi Sarah" instead of "Hi there"
- Generates **three ready-to-send proposal openers** per job, one click to copy, and there's a quick-fill toolbar inside Upwork's actual proposal page
- Optional background scanner that watches a saved-search RSS feed and notifies you the moment a high-signal job drops

Everything scoring-wise is deterministic — no LLM guessing at "vibes," just math on data Upwork already shows you.

Honest limits: it only reads pages you have open (no background scraping of Upwork, by design), it's Chrome-only for now, and Upwork redesigns will occasionally break things until I patch selectors.

It's **free on the Chrome Web Store**: https://chromewebstore.google.com/detail/gigradar-%E2%80%94-upwork-client/nheegeimgmgkbklpgbhipdkmfoedflnm (source code: https://github.com/comerade2134/GigRadar). Pro features (name extraction + hook generator) are $9.99 lifetime early-bird for the first 50 freelancers (then $19.99) — early buyers keep lifetime access forever.

Roast it, break it, tell me what's missing. The two features I'm debating next: hire-rate trend over time, and auto-drafting screening question answers (that one's half-built). What would actually save you time?

---

**First-comment (post yourself, adds context):**

> Builder here — happy to answer questions about how scoring works. Quick example: a client at $120k spent, 71% hire rate, payment verified, hired someone last week scores ~90 HIGH. A $0-spend client with 8% hire rate and unverified payment scores LOW with three flags. The panel shows the exact breakdown either way, so you can disagree with the number and still get the full picture.
