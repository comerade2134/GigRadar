import './style.css'
import { getCachedLicense, openUpgradeFlow, syncLicense, PRO_PRICE } from '../monetization/extpay'
import { getConnectsSaved, DOLLARS_PER_CONNECT } from '../engine/metrics'
import { openShareModal } from '../share/share-modal'
import {
  getLanguage,
  setLanguage,
  hasSelectedLanguage,
  t,
  SUPPORTED_LOCALES,
  getFlagSvg,
  type SupportedLocale
} from '../i18n'

const app = document.querySelector<HTMLDivElement>('#app')

const LOGO_SVG = `
  <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 flex-none" aria-hidden="true">
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
    <circle cx="8" cy="8" r="7" class="fill-brand-500/20"/>
    <path d="M5 8.2l2.1 2.1L11.2 6" stroke="#10B981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`

const LOCK_SVG = `
  <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 flex-none" aria-hidden="true">
    <rect x="3.2" y="7" width="9.6" height="6.6" rx="1.8" class="stroke-amber-300/80 fill-amber-300/10" stroke-width="1.3"/>
    <path d="M5.4 7V5.4a2.6 2.6 0 015.2 0V7" class="stroke-amber-300/80" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="8" cy="10.3" r="1" class="fill-amber-300"/>
  </svg>`

const GEAR_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 flex-none" aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`

async function isCurrentTabUpwork(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tabs[0]?.url || ''
    return url.includes('upwork.com')
  } catch {
    return false
  }
}

async function init(): Promise<void> {
  if (!app) return

  const alreadySelected = await hasSelectedLanguage()
  const currentLocale = await getLanguage()

  if (!alreadySelected) {
    renderOnboarding()
  } else {
    await renderMainApp(currentLocale)
  }

  function renderOnboarding(): void {
    if (!app) return
    app.innerHTML = `
      <div class="relative overflow-hidden p-5 text-center animate-fade-up">
        <!-- Ambient radial glow -->
        <div class="pointer-events-none absolute -top-12 left-1/2 h-36 w-60 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl"></div>

        <div class="relative mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/40 bg-gradient-to-b from-brand-500/20 to-brand-500/5 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
          ${LOGO_SVG}
        </div>

        <h1 class="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-base font-black tracking-tight text-transparent">
          ${t('onboarding_title', 'en')}
        </h1>
        <p class="mt-1 text-xs leading-relaxed text-slate-400 max-w-[280px] mx-auto">
          ${t('onboarding_subtitle', 'en')}
        </p>

        <div class="mt-4 flex flex-col gap-1.5 text-left max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          ${SUPPORTED_LOCALES.map(
            (l) => `
            <button data-set-lang="${l.code}"
              class="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/5 bg-panel/80 p-2.5 text-left shadow-card transition-all duration-150 hover:border-brand-500/50 hover:bg-brand-500/[0.08] hover:shadow-[0_0_16px_rgba(16,185,129,0.15)] active:scale-[0.98]">
              <span class="flex-none select-none">${getFlagSvg(l.code)}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-white group-hover:text-brand-300 transition-colors truncate">${l.nativeName}</span>
                  ${l.nativeName !== l.name ? `<span class="text-[10px] text-slate-400 truncate">(${l.name})</span>` : ''}
                </div>
                <span class="block text-[10px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors truncate">${l.sublabel}</span>
              </div>
              <div class="flex h-6 w-6 flex-none items-center justify-center rounded-lg border border-white/10 bg-white/5 font-mono text-[10px] font-extrabold text-slate-300 group-hover:border-brand-400/50 group-hover:bg-brand-500/20 group-hover:text-brand-300 transition-all">
                ${l.code.toUpperCase()}
              </div>
            </button>
          `
          ).join('')}
        </div>

        <div class="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500">
          <svg viewBox="0 0 16 16" fill="none" class="h-3 w-3 text-brand-400" aria-hidden="true">
            <path d="M8 1.5l5.5 2v4.2c0 3.2-2.3 5.9-5.5 6.8-3.2-.9-5.5-3.6-5.5-6.8V3.5L8 1.5z" class="fill-brand-500/20" stroke="#10B981" stroke-width="1.3"/>
            <path d="M5.6 7.9l1.7 1.7 3.1-3.4" stroke="#34D399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${t('onboarding_local_note', 'en')} · <button id="onboarding-settings" type="button" class="underline hover:text-brand-300 transition-colors">${t('onboarding_change_settings', 'en')}</button></span>
        </div>
      </div>
    `

    document.getElementById('onboarding-settings')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage()
    })

    app.querySelectorAll<HTMLButtonElement>('button[data-set-lang]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const lang = btn.dataset.setLang as SupportedLocale
        await setLanguage(lang)
        void renderMainApp(lang)
      })
    })
  }

  async function renderMainApp(locale: SupportedLocale): Promise<void> {
    if (!app) return

    const isUpwork = await isCurrentTabUpwork()
    const currentMeta = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0]

    app.innerHTML = `
      <header class="flex h-13 items-center justify-between border-b border-edge/80 bg-gradient-to-b from-white/[.04] to-transparent px-4 animate-fade-up">
        <div class="flex items-center gap-2.5">
          ${LOGO_SVG}
          <div class="flex flex-col">
            <span class="text-sm font-black tracking-tight text-white leading-none">GigRadar</span>
            <span class="text-[9.5px] font-medium text-mute tracking-tight mt-0.5">${t('client_inspector_sub', locale)}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Custom Modern Glassy Language Popover -->
          <div class="relative">
            <button id="lang-btn" type="button" aria-haspopup="true" aria-expanded="false"
              class="group flex items-center gap-1.5 rounded-full border border-edge bg-raised/90 py-1 pl-2 pr-2.5 text-[11px] font-bold text-slate-200 shadow-sm transition-all duration-150 hover:border-brand-500/60 hover:bg-raised hover:text-white active:scale-95">
              <span class="flex-none select-none">${getFlagSvg(currentMeta.code)}</span>
              <span class="font-mono text-[10px] font-extrabold uppercase tracking-wider text-brand-300">${currentMeta.code}</span>
              <svg id="lang-chevron" class="h-2.5 w-2.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-200" fill="none" viewBox="0 0 10 6">
                <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <!-- Custom In-Popup Dropdown Flyout -->
            <div id="lang-dropdown" class="hidden absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-[#12161f] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl z-50 animate-fade-up">
              <div class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                ${t('change_language', locale)}
              </div>
              <div class="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                ${SUPPORTED_LOCALES.map(
                  (l) => `
                  <button type="button" data-select-lang="${l.code}"
                    class="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                      l.code === locale
                        ? 'bg-brand-500/20 text-white border border-brand-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }">
                    <span class="flex-none select-none">${getFlagSvg(l.code)}</span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5">
                        <span class="font-semibold text-white truncate">${l.nativeName}</span>
                        ${l.nativeName !== l.name ? `<span class="text-[10px] text-slate-400 truncate font-normal">(${l.name})</span>` : ''}
                      </div>
                    </div>
                    ${
                      l.code === locale
                        ? `<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5 flex-none text-brand-400"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                        : ''
                    }
                  </button>
                `
                ).join('')}
              </div>
            </div>
          </div>

          <!-- Quick Settings Gear Button in Header -->
          <button id="header-settings" type="button" title="${t('settings_title', locale)}" aria-label="${t('settings_title', locale)}"
            class="group flex h-7 w-7 items-center justify-center rounded-full border border-edge bg-raised/90 text-slate-300 shadow-sm transition-all duration-150 hover:border-brand-500/60 hover:bg-brand-500/15 hover:text-brand-300 active:scale-95">
            <span class="transition-transform duration-300 group-hover:rotate-45">${GEAR_SVG}</span>
          </button>
        </div>
      </header>

      ${
        !isUpwork
          ? `
      <div id="upwork-cta-banner" class="mx-3.5 mt-2.5 flex items-center justify-between rounded-2xl border border-brand-500/35 bg-gradient-to-r from-brand-500/15 via-panel to-panel p-2.5 shadow-sm animate-fade-up">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-brand-500/20 border border-brand-400/30 text-brand-300">
            <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M6 3.5h7m0 0v7m0-7L3.5 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-bold text-white leading-tight">${t('ready_for_upwork', locale)}</span>
            <span class="text-[10px] text-slate-400">${t('ready_for_upwork_desc', locale)}</span>
          </div>
        </div>
        <button id="open-feed-btn" type="button" class="flex-none rounded-xl bg-brand-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 shadow hover:bg-brand-400 active:scale-95 transition-all">
          ${t('open_feed_btn', locale)}
        </button>
      </div>`
          : ''
      }

      <section id="saved-card" class="relative overflow-hidden mx-3.5 mt-2.5 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-[#10291f] via-panel to-panel p-3 shadow-card animate-fade-up">
        <span class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent"></span>
        <div class="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-500/15 blur-2xl"></div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
            <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M8 1.5l5.5 2v4.2c0 3.2-2.3 5.9-5.5 6.8-3.2-.9-5.5-3.6-5.5-6.8V3.5L8 1.5z" class="fill-brand-500/20" stroke="#10B981" stroke-width="1.3"/>
              <path d="M5.6 7.9l1.7 1.7 3.1-3.4" stroke="#34D399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${t('connects_protected', locale)}
          </div>
          <div class="flex items-center gap-1.5">
            <button id="share-savings-btn" type="button" class="inline-flex items-center gap-1 rounded-full border border-brand-400/40 bg-brand-500/20 px-2 py-0.5 text-[9px] font-bold text-brand-300 hover:bg-brand-500/30 active:scale-95 transition-all shadow-sm">
              <svg viewBox="0 0 16 16" fill="currentColor" class="h-2.5 w-2.5 flex-none text-brand-300" aria-hidden="true">
                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 2.5 2.5c0 1.25-.92 2.3-2.12 2.47l-5.6 2.8a2.5 2.5 0 0 1 0 .46l5.6 2.8c1.2-.17 2.12.88 2.12 2.47a2.5 2.5 0 1 1-5 0c0-.16.02-.31.05-.46l-5.6-2.8A2.5 2.5 0 1 1 5.5 8c0 .16-.02.31-.05.46l5.6 2.8A2.5 2.5 0 0 1 11 13.5"/>
              </svg>
              <span>${t('share_savings_btn', locale)}</span>
            </button>
            <span id="plan-pill" class="inline-flex items-center gap-1 rounded-full border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[9px] font-bold text-brand-300">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-dot"></span> LIVE
            </span>
          </div>
        </div>

        <div class="mt-2 flex items-baseline gap-2">
          <span id="saved-count" class="font-mono text-2xl font-black tracking-tight text-white tabular-nums">0</span>
          <span class="text-xs font-bold text-brand-400">Connects</span>
        </div>

        <div class="mt-1 flex items-center gap-1.5 flex-wrap">
          <span id="saved-usd" class="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-300 tabular-nums">
            $0.00 ${t('saved_usd_label', locale)}
          </span>
          <span id="saved-roi-pill" class="hidden items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-400/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
          </span>
          <span id="saved-desc" class="text-[10px] text-mute truncate">${t('skip_to_protect', locale)}</span>
        </div>
      </section>

      <ul class="mt-2.5 space-y-1.5 px-3.5 animate-fade-up">
        <li class="flex items-center gap-2.5 rounded-xl border border-white/[0.04] bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-raised">
          ${CHECK_SVG}
          <span class="flex-1">${t('feat_score', locale)}</span>
          <span class="rounded bg-brand-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-300">0-100</span>
        </li>
        <li class="flex items-center gap-2.5 rounded-xl border border-white/[0.04] bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-raised">
          ${CHECK_SVG}
          <span class="flex-1">${t('feat_warnings', locale)}</span>
          <span class="rounded bg-brand-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-300">${t('connects_saved_active', locale)}</span>
        </li>
        <li data-pro-feature class="flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-400/[0.08]">
          ${LOCK_SVG}
          <span data-gradient class="flex-1 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-semibold text-transparent">${t('feat_name', locale)}</span>
          <span data-pro-tag class="rounded bg-amber-400/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">PRO</span>
        </li>
        <li data-pro-feature class="flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-400/[0.08]">
          ${LOCK_SVG}
          <span data-gradient class="flex-1 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-semibold text-transparent">${t('feat_hook', locale)}</span>
          <span data-pro-tag class="rounded bg-amber-400/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">PRO</span>
        </li>
      </ul>

      <div class="mt-2.5 space-y-1.5 px-3.5 animate-fade-up">
        <button id="upgrade"
          class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 py-2.5 text-xs font-black tracking-tight text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all duration-200 hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] hover:scale-[1.01] active:scale-[0.98]">
          <span class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></span>
          <span class="absolute inset-x-0 top-0 h-px bg-white/70"></span>
          <div class="relative flex items-center justify-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4 flex-none text-slate-950">
              <path d="M9.5 1.5L3.5 9h4l-1 5.5 6-7.5h-4l1-5.5z"/>
            </svg>
            <span>${t('get_pro', locale)} — ${PRO_PRICE} ${t('early_bird', locale)}</span>
          </div>
        </button>

        <p id="cta-subtext" class="text-center text-[10px] font-medium text-slate-400">
          ${t('cta_guarantee', locale)}
        </p>

        <p id="status-note" class="text-center text-[9.5px] font-medium text-slate-500">
          ${t('pro_price_note', locale)}
        </p>

        <button id="pro-active" hidden
          class="w-full rounded-xl border border-amber-400/40 bg-amber-400/10 py-2 text-xs font-extrabold text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all hover:bg-amber-400/20 active:scale-[0.99]">
          ★ ${t('pro_active', locale)}
        </button>

        <button id="open-settings"
          class="w-full flex items-center justify-center gap-2 rounded-xl border border-edge bg-raised/80 py-2 text-xs font-semibold text-slate-300 shadow-sm transition-colors hover:border-brand-500/50 hover:bg-raised hover:text-white active:scale-[0.99]">
          ${GEAR_SVG}
          <span>${t('open_settings', locale)}</span>
        </button>
      </div>

      <footer class="mt-2.5 flex items-center justify-between border-t border-edge/80 bg-white/[0.01] px-4 py-2 text-[11px] text-mute">
        <a id="footer-settings" href="#" class="group flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-slate-400 transition-colors hover:text-brand-300 hover:bg-white/5">
          <span class="text-slate-400 group-hover:text-brand-300 transition-colors">${GEAR_SVG}</span>
          <span>${t('settings_byok', locale)}</span>
        </a>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 text-[10px] ${isUpwork ? 'text-brand-400' : 'text-slate-400'} font-medium">
            <span class="h-1.5 w-1.5 rounded-full ${isUpwork ? 'bg-brand-400 animate-pulse-dot' : 'bg-slate-500'}"></span>
            ${isUpwork ? t('active_on_upwork', locale) : t('ready_for_upwork', locale)}
          </span>
          <span id="version" class="font-mono text-[10.5px] text-slate-500 tabular-nums"></span>
        </div>
      </footer>
    `

    const pillEl = document.getElementById('plan-pill')
    const upgradeBtn = document.getElementById('upgrade')
    const proBtn = document.getElementById('pro-active')
    const settingsBtn = document.getElementById('open-settings')
    const ctaSubtext = document.getElementById('cta-subtext')

    // Language Dropdown interactions
    const langBtn = document.getElementById('lang-btn')
    const langDropdown = document.getElementById('lang-dropdown')
    const langChevron = document.getElementById('lang-chevron')

    langBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      const isHidden = langDropdown?.classList.toggle('hidden')
      langChevron?.classList.toggle('rotate-180', !isHidden)
    })

    document.addEventListener('click', (e) => {
      if (!langDropdown?.classList.contains('hidden') && !langDropdown?.contains(e.target as Node)) {
        langDropdown?.classList.add('hidden')
        langChevron?.classList.remove('rotate-180')
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !langDropdown?.classList.contains('hidden')) {
        langDropdown?.classList.add('hidden')
        langChevron?.classList.remove('rotate-180')
      }
    })

    langDropdown?.querySelectorAll<HTMLButtonElement>('button[data-select-lang]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const newLang = btn.dataset.selectLang as SupportedLocale
        if (newLang && newLang !== locale) {
          await setLanguage(newLang)
          void renderMainApp(newLang)
        } else {
          langDropdown?.classList.add('hidden')
          langChevron?.classList.remove('rotate-180')
        }
      })
    })

    const statusNote = document.getElementById('status-note')

    const versionEl = document.getElementById('version')
    if (versionEl) versionEl.textContent = `v${chrome.runtime.getManifest().version}`

    void (async () => {
      const saved = await getConnectsSaved()
      const savedCount = document.getElementById('saved-count')
      const savedUsd = document.getElementById('saved-usd')
      const savedRoiPill = document.getElementById('saved-roi-pill')
      const savedDesc = document.getElementById('saved-desc')
      if (savedCount && savedUsd && savedDesc) {
        savedCount.textContent = String(saved)
        const dollarsSaved = saved * DOLLARS_PER_CONNECT
        if (saved > 0) {
          savedUsd.textContent = `~$${dollarsSaved.toFixed(2)} ${t('saved_usd_label', locale)}`
          savedDesc.textContent = t('connects_saved_sub', locale)
          if (savedRoiPill) {
            savedRoiPill.classList.remove('hidden')
            savedRoiPill.classList.add('inline-flex')
            if (dollarsSaved >= 9.99) {
              const mult = (dollarsSaved / 9.99).toFixed(1)
              savedRoiPill.textContent = `⚡ ${mult}x ${t('roi_pro_label', locale)}`
            } else {
              const pct = Math.round((dollarsSaved / 9.99) * 100)
              savedRoiPill.textContent = `⚡ ${pct}% ${t('roi_of_pro_label', locale)}`
            }
          }
          if (ctaSubtext && dollarsSaved >= 9.99) {
            ctaSubtext.textContent = `⚡ ~$${dollarsSaved.toFixed(2)} ${t('saved_usd_label', locale)} — ${t('pro_paid_itself', locale)}`
          }
        } else {
          savedUsd.textContent = `$0.00 ${t('saved_usd_label', locale)}`
          savedDesc.textContent = t('skip_to_protect', locale)
          if (savedRoiPill) {
            savedRoiPill.classList.add('hidden')
            savedRoiPill.classList.remove('inline-flex')
          }
        }
      }
    })()

    function unlockProFeatures(): void {
      document.querySelectorAll<HTMLLIElement>('li[data-pro-feature]').forEach((li) => {
        li.classList.remove('border-amber-400/20', 'bg-amber-400/[0.04]')
        li.classList.add('border-white/[0.04]', 'bg-panel/60', 'text-slate-200')
        const iconSlot = li.firstElementChild
        if (iconSlot) iconSlot.outerHTML = CHECK_SVG
        const tag = li.querySelector('[data-pro-tag]')
        if (tag) tag.remove()
        const textSpan = li.querySelector('[data-gradient]')
        if (textSpan) {
          textSpan.className = 'flex-1 text-slate-200 font-medium'
        }
      })
    }

    async function refresh(): Promise<void> {
      let paid: boolean
      try {
        paid = await syncLicense()
      } catch {
        paid = await getCachedLicense()
      }

      if (!upgradeBtn || !proBtn || !settingsBtn) return

      if (paid) {
        if (pillEl) {
          pillEl.className =
            'inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
          pillEl.innerHTML = `<span>★</span> <span>${t('pro', locale)}</span>`
        }
        upgradeBtn.hidden = true
        if (ctaSubtext) ctaSubtext.hidden = true
        if (statusNote) statusNote.hidden = true
        proBtn.hidden = false
        settingsBtn.hidden = false
        unlockProFeatures()
      } else {
        if (pillEl) {
          pillEl.className =
            'inline-flex items-center gap-1 rounded-full border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[9px] font-bold text-brand-300'
          pillEl.innerHTML = `
            <span class="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-dot"></span> LIVE`
        }
        upgradeBtn.hidden = false
        if (ctaSubtext) ctaSubtext.hidden = false
        if (statusNote) {
          statusNote.textContent = t('pro_price_note', locale)
          statusNote.hidden = false
        }
        proBtn.hidden = true
        settingsBtn.hidden = false
      }
    }

    function openCheckout(): void {
      if (openUpgradeFlow()) return
      if (statusNote) {
        statusNote.textContent =
          'Payment window unavailable — verify the ExtensionPay extension ID in src/monetization/extpay.ts.'
        statusNote.hidden = false
      }
    }

    const openSettings = (event?: Event): void => {
      if (event) event.preventDefault()
      chrome.runtime.openOptionsPage()
    }

    upgradeBtn?.addEventListener('click', openCheckout)
    settingsBtn?.addEventListener('click', openSettings)
    document.getElementById('header-settings')?.addEventListener('click', openSettings)
    document.getElementById('footer-settings')?.addEventListener('click', openSettings)
    document.getElementById('open-feed-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.upwork.com/nx/search/jobs/' })
    })
    document.getElementById('share-savings-btn')?.addEventListener('click', async () => {
      const saved = await getConnectsSaved()
      const dollarsSaved = saved * DOLLARS_PER_CONNECT
      const mult = dollarsSaved >= 9.99 ? (dollarsSaved / 9.99).toFixed(1) : undefined
      openShareModal(
        {
          connectsSaved: saved,
          dollarsSaved,
          proRoiMultiplier: mult,
          locale
        },
        locale
      )
    })

    void refresh()
  }
}

void init()
