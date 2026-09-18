import type { ShareCardStats } from '../types'
import {
  generateSavingsCardBlob,
  generateSavingsCardDataUrl,
  formatShareTweetText,
  OFFICIAL_WEBSITE_URL
} from './card-generator'
import { t, type SupportedLocale } from '../i18n'

export function openShareModal(stats: ShareCardStats, locale: SupportedLocale): void {
  const existing = document.getElementById('gigradar-share-modal-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'gigradar-share-modal-overlay'
  overlay.className =
    'fixed inset-0 z-[100] flex flex-col bg-[#0D0F12] text-ink overflow-y-auto custom-scrollbar animate-fade-in'

  const dataUrl = generateSavingsCardDataUrl(stats)
  const tweetText = formatShareTweetText(stats)
  const previewLines = tweetText.split('\n').filter((l) => l.trim().length > 0)
  const snippet = previewLines.slice(0, 2).join(' ')

  overlay.innerHTML = `
    <!-- Top Navigation Header -->
    <header class="flex h-12 flex-none items-center justify-between border-b border-edge/80 bg-panel/90 px-4">
      <button id="share-modal-back" type="button" class="group flex items-center gap-1.5 rounded-lg py-1 px-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
        <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true">
          <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${t('back_btn', locale)}</span>
      </button>

      <span class="text-xs font-black uppercase tracking-wider text-brand-300">
        ${t('share_modal_title', locale)}
      </span>

      <button id="share-modal-close" type="button" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors" aria-label="Close">
        ✕
      </button>
    </header>

    <!-- Main Content Body -->
    <div class="flex-1 p-4 space-y-3.5 flex flex-col justify-between">
      <div class="space-y-3">
        <p class="text-[11px] text-mute text-center leading-relaxed max-w-[280px] mx-auto [text-wrap:balance]">
          ${t('share_modal_subtitle', locale)}
        </p>

        <!-- Live High-Resolution Card Preview -->
        <div class="relative overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] bg-panel">
          <img id="share-card-preview" src="${dataUrl}" alt="GigRadar Savings Card" class="w-full h-auto block select-none" />
        </div>

        <!-- Tweet Snippet Preview -->
        <div class="rounded-xl border border-white/5 bg-raised/70 p-2.5 text-[10.5px] text-slate-300 leading-relaxed select-text">
          <div class="text-[9px] font-bold uppercase tracking-wider text-brand-400 mb-1 flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-2.5 w-2.5"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 2.5 2.5c0 1.25-.92 2.3-2.12 2.47l-5.6 2.8a2.5 2.5 0 0 1 0 .46l5.6 2.8c1.2-.17 2.12.88 2.12 2.47a2.5 2.5 0 1 1-5 0c0-.16.02-.31.05-.46l-5.6-2.8A2.5 2.5 0 1 1 5.5 8c0 .16-.02.31-.05.46l5.6 2.8A2.5 2.5 0 0 1 11 13.5"/></svg>
            ${t('share_savings_btn', locale)}
          </div>
          <p class="text-slate-300 italic line-clamp-2">"${snippet}"</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-1">
        <!-- Primary 1-Click Copy -->
        <button id="share-copy-image" type="button"
          class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.01] active:scale-95">
          <span class="absolute inset-x-0 top-0 h-px bg-white/60"></span>
          <div class="relative flex items-center justify-center gap-2">
            <span class="text-sm">📋</span>
            <span id="copy-btn-text">${t('copy_image_btn', locale)}</span>
          </div>
        </button>

        <!-- Secondary Multi-Share Grid -->
        <div class="grid grid-cols-3 gap-2">
          <button id="share-download" type="button"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border border-edge bg-raised/90 py-2.5 px-1 text-[10px] font-bold text-slate-200 hover:border-brand-500/40 hover:text-white active:scale-95 transition-all">
            <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Save PNG</span>
          </button>

          <button id="share-x" type="button"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-1 text-[10px] font-bold text-white hover:bg-slate-800 active:scale-95 transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Post to X</span>
          </button>

          <button id="share-linkedin" type="button"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#0A66C2]/40 bg-[#0A66C2]/15 py-2.5 px-1 text-[10px] font-bold text-[#70B5F9] hover:bg-[#0A66C2]/25 active:scale-95 transition-all">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.31a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z"/>
            </svg>
            <span>LinkedIn</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sleek Bottom Footer -->
    <footer class="mt-auto flex h-8 flex-none items-center justify-between border-t border-edge/80 bg-white/[0.01] px-4 text-[10px] text-mute">
      <span class="flex items-center gap-1.5 text-slate-400">
        <span class="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
        Zero Telemetry · 100% Deterministic
      </span>
      <span class="font-mono text-[9.5px] text-slate-500">gigradar.io</span>
    </footer>
  `

  document.body.appendChild(overlay)

  const close = (): void => {
    overlay.classList.add('opacity-0', 'pointer-events-none')
    setTimeout(() => overlay.remove(), 160)
  }

  overlay.querySelector('#share-modal-close')?.addEventListener('click', close)
  overlay.querySelector('#share-modal-back')?.addEventListener('click', close)

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', escHandler)
    }
  })

  // 1. Copy Image to clipboard
  const copyBtn = overlay.querySelector<HTMLButtonElement>('#share-copy-image')
  const copyText = overlay.querySelector<HTMLElement>('#copy-btn-text')
  copyBtn?.addEventListener('click', async () => {
    try {
      const blob = await generateSavingsCardBlob(stats)
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        if (copyText) {
          const original = copyText.textContent
          copyText.textContent = t('image_copied', locale)
          copyBtn.classList.add('ring-2', 'ring-brand-400')
          setTimeout(() => {
            if (copyText) copyText.textContent = original
            copyBtn.classList.remove('ring-2', 'ring-brand-400')
          }, 2000)
        }
      } else {
        triggerDownload()
      }
    } catch {
      triggerDownload()
    }
  })

  // 2. Download Image PNG
  const triggerDownload = (): void => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `gigradar-savings-${stats.connectsSaved}-connects.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  overlay.querySelector('#share-download')?.addEventListener('click', triggerDownload)

  // 3. Share on X / Twitter
  overlay.querySelector('#share-x')?.addEventListener('click', async () => {
    try {
      const blob = await generateSavingsCardBlob(stats)
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      }
    } catch {
      // clipboard fallback
    }
    const text = formatShareTweetText(stats)
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    chrome.tabs.create({ url })
  })

  // 4. Share on LinkedIn
  overlay.querySelector('#share-linkedin')?.addEventListener('click', async () => {
    try {
      const blob = await generateSavingsCardBlob(stats)
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      }
    } catch {
      // clipboard fallback
    }
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(OFFICIAL_WEBSITE_URL)}`
    chrome.tabs.create({ url })
  })
}
