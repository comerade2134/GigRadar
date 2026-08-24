import './style.css'
import { getCachedLicense, openUpgradeFlow, syncLicense, PRO_PRICE, PRO_PRICE_NOTE } from '../monetization/extpay'
import { getConnectsSaved, DOLLARS_PER_CONNECT } from '../engine/metrics'

const app = document.querySelector<HTMLDivElement>('#app')

const LOGO_SVG = `
  <svg viewBox="0 0 24 24" fill="none" class="h-[22px] w-[22px]" aria-hidden="true">
    <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6.5" fill="url(#gr-logo-g)" stroke="#10B981" stroke-opacity=".35"/>
    <path d="M13.4 4.8 7.2 12.9h3.6l-1.1 6.3 6.9-8.7h-3.9l.7-5.7z" fill="#0D0F12"/>
    <defs>
      <linearGradient id="gr-logo-g" x1="2" y1="2" x2="22" y2="22">
        <stop stop-color="#34D399"/><stop offset="1" stop-color="#059669"/>
      </linearGradient>
    </defs>
  </svg>`

const CHECK_SVG = `
  <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 flex-none" aria-hidden="true">
    <circle cx="8" cy="8" r="7" class="fill-brand-500/15"/>
    <path d="M5 8.2l2.1 2.1L11.2 6" stroke="#10B981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`

const LOCK_SVG = `
  <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 flex-none" aria-hidden="true">
    <rect x="3.2" y="7" width="9.6" height="6.6" rx="1.8" class="stroke-amber-300/70" stroke-width="1.3"/>
    <path d="M5.4 7V5.4a2.6 2.6 0 015.2 0V7" class="stroke-amber-300/70" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="8" cy="10.3" r="1" class="fill-amber-300/80"/>
  </svg>`

if (app) {
  app.innerHTML = `
    <header class="flex h-14 items-center gap-2.5 border-b border-edge bg-gradient-to-b from-white/[.04] to-transparent px-4 animate-fade-up">
      ${LOGO_SVG}
      <span class="text-[15px] font-bold tracking-tightest">GigRadar</span>
      <div id="plan-pill" class="ml-auto flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold text-brand-400 transition-colors"></div>
    </header>

    <section id="saved-card" class="mx-3 mt-3 rounded-xl border border-brand-500/25 bg-gradient-to-b from-brand-500/12 to-transparent p-3 shadow-card animate-fade-up">
      <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-mute">
        <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
          <path d="M8 1.5l5.5 2v4.2c0 3.2-2.3 5.9-5.5 6.8-3.2-.9-5.5-3.6-5.5-6.8V3.5L8 1.5z" class="fill-brand-500/20" stroke="#10B981" stroke-width="1.3"/>
          <path d="M5.6 7.9l1.7 1.7 3.1-3.4" stroke="#34D399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Connects Protected
      </div>
      <p id="saved-line" class="mt-1.5 text-lg font-extrabold tracking-tightest text-brand-300">…</p>
      <p id="saved-usd" class="mt-0.5 text-[11px] font-bold text-emerald-400/80"></p>
    </section>

    <section class="mx-3 mt-3 space-y-2.5 rounded-xl border border-edge bg-panel p-3 shadow-card animate-fade-up">
      <div class="flex items-center gap-2 text-xs text-mute">
        <svg viewBox="0 0 14 14" class="h-3.5 w-3.5 flex-none text-brand-500" fill="currentColor" aria-hidden="true"><path d="M8 .8 2.6 8h3.2l-.9 5.2L10.4 6H7.2L8 .8z"/></svg>
        Connects Saved
        <b id="stat-saved" class="ml-auto font-bold text-brand-400">Active</b>
      </div>
      <div class="flex items-center gap-2 text-xs text-mute">
        <svg viewBox="0 0 14 14" class="h-3.5 w-3.5 flex-none text-brand-500" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.6" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="7" r="2" fill="currentColor"/></svg>
        Client Scoring
        <b class="ml-auto font-bold text-ink">100% Deterministic</b>
      </div>
    </section>

    <ul class="mt-3.5 space-y-1 px-3 animate-fade-up">
      <li class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-raised/60 transition-colors">
        ${CHECK_SVG}<span>Client Intent &amp; Spend Score</span>
      </li>
      <li class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-raised/60 transition-colors">
        ${CHECK_SVG}<span>Connects Waste Warnings</span>
      </li>
      <li data-pro-feature class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-raised/60">
        ${LOCK_SVG}<span data-gradient class="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-semibold text-transparent">Client Real Name Extraction</span>
      </li>
      <li data-pro-feature class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-raised/60">
        ${LOCK_SVG}<span data-gradient class="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-semibold text-transparent">1-Click Proposal Hook Engine</span>
      </li>
    </ul>

    <div class="mt-4 space-y-2 px-3 animate-fade-up">
      <button id="upgrade"
        class="group relative w-full overflow-hidden rounded-lg bg-gradient-to-b from-brand-300 to-brand-600 py-2.5 text-sm font-extrabold tracking-tight text-obsidian shadow-cta transition-all duration-150 hover:brightness-110 active:scale-[.98] active:brightness-95">
        <span class="absolute inset-x-0 top-0 h-px bg-white/40"></span>
        ⚡ Get Lifetime Pro — ${PRO_PRICE} Early Bird
      </button>

      <button id="pro-active" hidden
        class="w-full rounded-lg border border-amber-400/40 bg-amber-400/10 py-2.5 text-sm font-bold text-amber-300 shadow-glow transition-all duration-150 hover:bg-amber-400/15 active:scale-[.99]">
        ✨ Pro License Active
      </button>

      <button id="open-settings" hidden
        class="w-full rounded-lg border border-edge bg-raised py-2 text-xs font-semibold text-mute transition-colors duration-150 hover:border-brand-500/40 hover:text-ink active:scale-[.99]">
        Open Extension Settings
      </button>
    </div>

    <footer class="mt-4 flex items-center justify-between border-t border-edge px-4 py-3 text-[11px] text-mute">
      <a id="footer-settings" href="#" class="rounded px-1 py-0.5 transition-colors duration-150 hover:text-brand-400">⚙️ Settings &amp; BYOK</a>
      <span id="version" class="tabular-nums text-slate-600"></span>
    </footer>
  `

  const pillEl = document.getElementById('plan-pill')
  const upgradeBtn = document.getElementById('upgrade')
  const proBtn = document.getElementById('pro-active')
  const settingsBtn = document.getElementById('open-settings')
  const statusNote = document.createElement('p')
  statusNote.className =
    'mx-3 mt-3 hidden text-center text-[11px] leading-relaxed text-mute'
  document.querySelector('footer')?.before(statusNote)

  const versionEl = document.getElementById('version')
  if (versionEl) versionEl.textContent = `v${chrome.runtime.getManifest().version}`

  void (async () => {
    const saved = await getConnectsSaved()
    const savedLine = document.getElementById('saved-line')
    const savedUsd = document.getElementById('saved-usd')
    if (savedLine && savedUsd) {
      savedLine.textContent = `🛡️ ${saved} Connects`
      savedUsd.textContent =
        saved > 0
          ? `(~$${(saved * DOLLARS_PER_CONNECT).toFixed(2)} saved by skipping flagged jobs)`
          : 'Skip flagged jobs to start protecting Connects'
    }
  })()

  function unlockProFeatures(): void {
    document.querySelectorAll<HTMLLIElement>('li[data-pro-feature]').forEach((li) => {
      li.classList.add('text-slate-200')
      const iconSlot = li.firstElementChild
      if (iconSlot) iconSlot.outerHTML = CHECK_SVG
    })
  }

  async function refresh(): Promise<void> {
    let paid: boolean
    try {
      paid = await syncLicense()
    } catch {
      paid = await getCachedLicense()
    }

    if (!pillEl || !upgradeBtn || !proBtn || !settingsBtn) return

    if (paid) {
      pillEl.className =
        'ml-auto flex items-center rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-amber-300'
      pillEl.textContent = 'PRO'
      upgradeBtn.hidden = true
      proBtn.hidden = false
      settingsBtn.hidden = false
      statusNote.textContent =
        'Full intel unlocked on every Upwork page — names, hooks and AI polish.'
      statusNote.classList.remove('hidden')
      unlockProFeatures()
    } else {
      pillEl.innerHTML = `
        <span class="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-dot"></span>
        Active on Upwork`
      statusNote.textContent = PRO_PRICE_NOTE
      statusNote.classList.remove('hidden')
    }
  }

  function openCheckout(): void {
    if (openUpgradeFlow()) return
    statusNote.textContent =
      'Payment window unavailable — verify the ExtensionPay extension ID in src/monetization/extpay.ts.'
    statusNote.classList.remove('hidden')
  }

  upgradeBtn?.addEventListener('click', openCheckout)

  settingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage())
  document
    .getElementById('footer-settings')
    ?.addEventListener('click', (event) => {
      event.preventDefault()
      chrome.runtime.openOptionsPage()
    })

  void refresh()
}
