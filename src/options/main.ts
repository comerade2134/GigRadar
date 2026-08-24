import './style.css'
import { loadByok, saveByok, requestAiOrigins, hasAiOrigins } from '../engine/byok'
import {
  DEFAULT_SCANNER_SETTINGS,
  loadScannerSettings,
  saveScannerSettings
} from '../engine/feed-scanner'
import { getCachedLicense, openUpgradeFlow, syncLicense, PRO_PRICE, PRO_PRICE_NOTE } from '../monetization/extpay'
import type { Provider } from '../types'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <header class="mb-8 flex animate-fade-up items-center gap-3">
      <svg viewBox="0 0 24 24" fill="none" class="h-9 w-9" aria-hidden="true">
        <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6.5" fill="url(#gr-logo-g)" stroke="#10B981" stroke-opacity=".35"/>
        <path d="M13.4 4.8 7.2 12.9h3.6l-1.1 6.3 6.9-8.7h-3.9l.7-5.7z" fill="#0D0F12"/>
        <defs>
          <linearGradient id="gr-logo-g" x1="2" y1="2" x2="22" y2="22">
            <stop stop-color="#34D399"/><stop offset="1" stop-color="#059669"/>
          </linearGradient>
        </defs>
      </svg>
      <div>
        <h1 class="text-lg font-bold tracking-tightest">GigRadar Settings</h1>
        <p class="text-xs text-mute">Upwork Client Inspector · v${chrome.runtime.getManifest().version}</p>
      </div>
    </header>

    <section class="mb-5 space-y-4 rounded-xl border border-edge bg-panel p-5 shadow-card animate-fade-up">
      <h2 class="text-[11px] font-bold uppercase tracking-widest text-mute">License</h2>
      <p id="license-status" class="text-sm leading-relaxed text-slate-300">Checking…</p>
      <div class="flex flex-wrap gap-2">
        <button id="buy"
          class="rounded-lg bg-gradient-to-b from-brand-300 to-brand-600 px-4 py-2 text-sm font-extrabold text-obsidian shadow-cta transition-all duration-150 hover:brightness-110 active:scale-[.98]">
          Get Pro — ${PRO_PRICE} early bird
        </button>
        <button id="recheck"
          class="rounded-lg border border-edge bg-raised px-4 py-2 text-sm font-semibold text-mute transition-colors duration-150 hover:border-brand-500/40 hover:text-ink active:scale-[.99]">
          Re-check license
        </button>
      </div>
    </section>

    <section class="space-y-5 rounded-xl border border-edge bg-panel p-5 shadow-card animate-fade-up">
      <h2 class="text-[11px] font-bold uppercase tracking-widest text-mute">AI Polish · Bring Your Own Key</h2>

      <label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-edge bg-raised px-4 py-3 transition-colors duration-150 hover:border-brand-500/30">
        <span class="text-sm font-semibold">
          Enable AI polish on generated hooks
          <span class="mt-0.5 block text-xs font-normal text-mute">Stored locally in this browser profile only.</span>
        </span>
        <input id="byok-enabled" type="checkbox" class="peer sr-only" />
        <span class="relative h-6 w-11 flex-none rounded-full bg-slate-700 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400"></span>
      </label>

      <p class="-mt-2 text-xs leading-relaxed text-mute">
        Your key is sent only to the provider you choose. Enabling requests host permissions for that API domain.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">Provider</span>
          <select id="provider"
            class="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="openai">OpenAI (gpt-4o-mini)</option>
            <option value="anthropic">Anthropic (claude-3-5-haiku)</option>
          </select>
        </label>

        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">API key</span>
          <input id="api-key" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false"
            class="w-full rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>
      </div>

      <div class="flex items-center gap-3 pt-1">
        <button id="save"
          class="rounded-lg bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-2 text-sm font-bold text-slate-900 shadow-card transition-all duration-150 hover:brightness-105 active:scale-[.98]">
          Save settings
        </button>
        <span id="save-status" class="text-xs text-brand-400"></span>
      </div>
    </section>

    <section class="mt-5 space-y-5 rounded-xl border border-edge bg-panel p-5 shadow-card animate-fade-up">
      <h2 class="text-[11px] font-bold uppercase tracking-widest text-mute">Real-Time Search Scanner</h2>

      <label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-edge bg-raised px-4 py-3 transition-colors duration-150 hover:border-brand-500/30">
        <span class="text-sm font-semibold">
          Notify me about fresh high-intent jobs
          <span class="mt-0.5 block text-xs font-normal text-mute">Polls your saved-search RSS feed in the background and pings you when a hot job lands.</span>
        </span>
        <input id="scanner-enabled" type="checkbox" class="peer sr-only" />
        <span class="relative h-6 w-11 flex-none rounded-full bg-slate-700 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400"></span>
      </label>

      <label class="block space-y-2">
        <span class="text-xs font-semibold text-mute">Saved search RSS URL</span>
        <input id="scanner-rss" type="url" placeholder="https://www.upwork.com/nx/search/jobs/rss?q=…" autocomplete="off" spellcheck="false"
          class="w-full rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <span class="block text-xs leading-relaxed text-mute">On Upwork: run a search → RSS icon near the results → copy that link. Requires being logged in to Upwork in this browser.</span>
      </label>

      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">Check every</span>
          <select id="scanner-interval"
            class="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="3">3 minutes</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">Min intent score</span>
          <select id="scanner-min-score"
            class="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="80">80 (strict)</option>
            <option value="70">70</option>
            <option value="60">60 (loose)</option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">Posted within</span>
          <select id="scanner-fresh"
            class="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-obsidian px-3 py-2.5 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button id="scanner-save"
          class="rounded-lg bg-gradient-to-b from-slate-100 to-slate-300 px-4 py-2 text-sm font-bold text-slate-900 shadow-card transition-all duration-150 hover:brightness-105 active:scale-[.98]">
          Save scanner settings
        </button>
        <button id="scanner-test"
          class="rounded-lg border border-edge bg-raised px-4 py-2 text-sm font-semibold text-mute transition-colors duration-150 hover:border-brand-500/40 hover:text-ink active:scale-[.99]">
          Run test scan
        </button>
        <span id="scanner-status" class="text-xs text-brand-400"></span>
      </div>
    </section>
  `

  const licenseStatus = document.getElementById('license-status')
  const saveStatus = document.getElementById('save-status')
  const enabledCb = document.getElementById('byok-enabled') as HTMLInputElement | null
  const providerSel = document.getElementById('provider') as HTMLSelectElement | null
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement | null

  async function refreshLicense(): Promise<void> {
    if (!licenseStatus) return
    try {
      const paid = await syncLicense()
      licenseStatus.textContent = paid
        ? 'Pro is active — thanks for supporting GigRadar!'
        : `Free tier active. Pro unlocks client-name extraction and the hook generator — ${PRO_PRICE} early bird (${PRO_PRICE_NOTE.toLowerCase()}).`
    } catch {
      licenseStatus.textContent = await getCachedLicense().then(
        (paid) => (paid ? 'Pro is active (cached).' : 'License unknown — press Re-check.')
      )
    }
  }

  document.getElementById('buy')?.addEventListener('click', () => {
    if (openUpgradeFlow()) return
    if (licenseStatus) {
      licenseStatus.textContent =
        'Payment window unavailable — verify the ExtensionPay extension ID in src/monetization/extpay.ts.'
    }
  })

  document.getElementById('recheck')?.addEventListener('click', () => void refreshLicense())

  document.getElementById('save')?.addEventListener('click', async () => {
    if (!enabledCb || !providerSel || !apiKeyInput || !saveStatus) return

    const enabled = enabledCb.checked
    const apiKey = apiKeyInput.value.trim()

    if (enabled && !apiKey) {
      saveStatus.className = 'text-xs text-red-400'
      saveStatus.textContent = 'Add an API key or disable the toggle.'
      return
    }

    if (enabled) {
      const already = await hasAiOrigins()
      const granted = already ? true : await requestAiOrigins()
      if (!granted) {
        enabledCb.checked = false
        saveStatus.className = 'text-xs text-amber-300'
        saveStatus.textContent = 'Host permission denied — AI polish stays off.'
        return
      }
    }

    await saveByok({
      enabled,
      provider: providerSel.value as Provider,
      apiKey
    })
    if (!apiKey && enabled === false) apiKeyInput.value = ''
    saveStatus.className = 'text-xs text-brand-400'
    saveStatus.textContent = 'Saved ✓'
    window.setTimeout(() => {
      if (saveStatus) saveStatus.textContent = ''
    }, 1600)
  })

  void (async () => {
    const byok = await loadByok()
    if (enabledCb) enabledCb.checked = byok.enabled
    if (providerSel) providerSel.value = byok.provider
    if (apiKeyInput && byok.apiKey) apiKeyInput.placeholder = '•••• saved ••••'
  })()

  const scannerEnabled = document.getElementById('scanner-enabled') as HTMLInputElement | null
  const scannerRss = document.getElementById('scanner-rss') as HTMLInputElement | null
  const scannerInterval = document.getElementById('scanner-interval') as HTMLSelectElement | null
  const scannerMinScore = document.getElementById('scanner-min-score') as HTMLSelectElement | null
  const scannerFresh = document.getElementById('scanner-fresh') as HTMLSelectElement | null
  const scannerStatus = document.getElementById('scanner-status')

  function flashScannerStatus(text: string, isError: boolean): void {
    if (!scannerStatus) return
    scannerStatus.className = isError ? 'text-xs text-red-400' : 'text-xs text-brand-400'
    scannerStatus.textContent = text
    window.setTimeout(() => {
      if (scannerStatus) scannerStatus.textContent = ''
    }, 3200)
  }

  document.getElementById('scanner-save')?.addEventListener('click', async () => {
    if (!scannerEnabled || !scannerRss || !scannerInterval || !scannerMinScore || !scannerFresh) return

    const enabled = scannerEnabled.checked
    const rssUrl = scannerRss.value.trim()

    if (enabled && !rssUrl.startsWith('https://')) {
      flashScannerStatus('Paste a valid https RSS URL first.', true)
      return
    }

    if (enabled) {
      const already = await chrome.permissions.contains({ origins: ['https://www.upwork.com/*'] })
      const granted = already
        ? true
        : await chrome.permissions.request({ origins: ['https://www.upwork.com/*'] })
      if (!granted) {
        scannerEnabled.checked = false
        flashScannerStatus('Upwork host permission denied — scanner stays off.', true)
        return
      }
    }

    await saveScannerSettings({
      enabled,
      rssUrl,
      intervalMin: parseInt(scannerInterval.value, 10),
      minScore: parseInt(scannerMinScore.value, 10),
      freshMinutes: parseInt(scannerFresh.value, 10)
    })

    try {
      await chrome.runtime.sendMessage({ type: 'SCANNER_SETTINGS_UPDATED' })
    } catch {
      return
    }
    flashScannerStatus(enabled ? 'Scanner armed ✓' : 'Scanner off', false)
  })

  document.getElementById('scanner-test')?.addEventListener('click', async () => {
    if (!scannerStatus) return
    scannerStatus.className = 'text-xs text-mute'
    scannerStatus.textContent = 'Scanning…'
    try {
      const outcome = (await chrome.runtime.sendMessage({
        type: 'SCANNER_SCAN_NOW'
      })) as { fetched?: boolean; notified?: number; error?: string } | undefined
      if (!outcome) throw new Error('no response')
      if (outcome.error) {
        flashScannerStatus(`Scan failed: ${outcome.error}`, true)
      } else if (outcome.fetched) {
        flashScannerStatus(
          `Feed OK — ${outcome.notified} new high-intent job${outcome.notified === 1 ? '' : 's'}`,
          false
        )
      } else {
        flashScannerStatus('Scanner is disabled — save it enabled first.', true)
      }
    } catch {
      flashScannerStatus('No response from background worker.', true)
    }
  })

  void (async () => {
    const settings = await loadScannerSettings()
    if (scannerEnabled) scannerEnabled.checked = settings.enabled
    if (scannerRss) scannerRss.value = settings.rssUrl
    if (scannerInterval) scannerInterval.value = String(settings.intervalMin)
    if (scannerMinScore) scannerMinScore.value = String(settings.minScore)
    if (scannerFresh) scannerFresh.value = String(settings.freshMinutes)
    if (
      scannerRss &&
      !settings.rssUrl &&
      DEFAULT_SCANNER_SETTINGS.rssUrl !== ''
    ) {
      scannerRss.value = DEFAULT_SCANNER_SETTINGS.rssUrl
    }
  })()

  void refreshLicense()
}
