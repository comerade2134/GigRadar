# Screenshot Shot-List — 3× 1280×800

Chrome Web Store requires **at least one** screenshot at exactly **1280×800** (PNG/JPEG, <4 MB). Ship all three below; they tell the product story in order: *see the score → open the intel → win the bid.*

## One-time setup (5 min)

1. Launch a dedicated Chrome window at exact store size:
   ```
   chrome.exe --window-size=1280,800 --window-position=0,0 --user-data-dir="%TEMP%\gigradar-shots"
   ```
2. Load `dist/` unpacked (`chrome://extensions` → Developer mode → Load unpacked).
3. Log in to Upwork in this profile. Hide the bookmarks bar (`Ctrl+Shift+B`).
4. Zoom must be 100% (`Ctrl+0`). OS scaling: use 100% if possible, else capture via DevTools device toolbar at 1280×800 instead.
5. Save shots as PNG into this folder: `docs/store/shots/`.

> Tip for pixel-perfect size regardless of OS DPI: DevTools (`F12`) → `Ctrl+Shift+M` → Dimensions: Responsive → 1280×800 → ⋮ menu → "Capture screenshot".

## Shot 1 — Feed badges (the hook)

| | |
| --- | --- |
| Page | Upwork job search results with 4–6 visible cards, mix of clients |
| Must show | At least one scored pill (`GigRadar 78 HIGH`), one neutral pill, one alert strip (e.g. 🔥 High-Intent Buyer or ⚠️ Low Hire Rate), one ⚠ flag-count chip |
| Prep | Scroll slowly so badges mount; pick a search with varied client quality ("wordpress" works well) |
| Filename | `1-feed-badges.png` |

## Shot 2 — Intel panel docked (the depth)

| | |
| --- | --- |
| Page | Any job whose native drawer is open, GigRadar panel docked right |
| Must show | Score ring colored by tier, Intent Signals table with bars, Red Flags list with at least one chip, True Rate block if available |
| Prep | Click a card title to open the drawer; panel auto-docks. If signals are thin, hover a pricier job ($1k+ fixed) — richer clients have fuller data |
| Filename | `2-intel-panel.png` |

## Shot 3 — Proposal hooks (the money)

| | |
| --- | --- |
| Page | Intel panel scrolled to "⚡ 1-Click Proposal Hook" with all three A/B/C cards visible |
| Must show | Option A/B/C cards with distinct styles + Copy buttons; ideally the name chip above ("👤 Sarah · 90% confidence") |
| Prep | Use a job where the name extractor hit (client with 5+ feedback entries mentioning their name) |
| Filename | `3-proposal-hooks.png` |

## Optional bonus shots

- `4-popup.png` — popup with Connects Protected counter showing a real number (>50 reads best).
- `5-scanner.png` — options page scanner section + one Chrome notification visible.
