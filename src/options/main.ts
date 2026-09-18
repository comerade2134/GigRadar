import './style.css'
import { loadByok, saveByok, requestAiOrigins, hasAiOrigins } from '../engine/byok'
import {
  DEFAULT_SCANNER_SETTINGS,
  loadScannerSettings,
  saveScannerSettings
} from '../engine/feed-scanner'
import { getCachedLicense, openUpgradeFlow, syncLicense, PRO_PRICE } from '../monetization/extpay'
import {
  getLanguage,
  setLanguage,
  t,
  SUPPORTED_LOCALES,
  getFlagSvg,
  type SupportedLocale
} from '../i18n'
import type { Provider } from '../types'
import {
  getUserProfile,
  getAccountTier,
  loginWithToken,
  logoutAccount
} from '../cloud/account'
import {
  triggerCloudSync,
  getSyncState,
  getTeamSharedIntel
} from '../cloud/sync'
import {
  getTeamActivities,
  getTeamCollisionMetrics,
  seedSampleTeamActivities,
  clearAllTeamActivities,
  releaseJobClaim,
  claimJobForTeam,
  formatTimeAgo
} from '../cloud/team-tracker'
import {
  loadWebhookConfig,
  saveWebhookConfig,
  sendTestWebhook,
  requestWebhookPermissions,
  formatUsd
} from '../engine/webhooks'
import { openShareModal } from '../share/share-modal'
import { getConnectsSaved, DOLLARS_PER_CONNECT } from '../engine/metrics'
import {
  loadVoiceProfile,
  saveVoiceProfile,
  analyzeWritingTone,
  type ToneAnalysisResult
} from '../autopilot/voice-profile'
import {
  loadCaseStudies,
  addCaseStudy,
  deleteCaseStudy,
  seedSampleCaseStudies
} from '../autopilot/case-studies'
import { calculateBidIntelligence } from '../engine/bid-intelligence'
import type { VoiceTone, WebhookConfig } from '../types'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const app = document.querySelector<HTMLDivElement>('#app')

async function initOptions(): Promise<void> {
  if (!app) return

  const currentLang = await getLanguage()

  app.innerHTML = `
    <header class="mb-8 flex animate-fade-up items-center gap-3.5">
      <div class="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/35 bg-gradient-to-b from-brand-500/20 to-brand-500/5 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
        <svg viewBox="0 0 24 24" fill="none" class="h-7 w-7" aria-hidden="true">
          <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6.5" fill="url(#gr-logo-g)" stroke="#10B981" stroke-opacity=".35"/>
          <path d="M13.4 4.8 7.2 12.9h3.6l-1.1 6.3 6.9-8.7h-3.9l.7-5.7z" fill="#0D0F12"/>
          <defs>
            <linearGradient id="gr-logo-g" x1="2" y1="2" x2="22" y2="22">
              <stop stop-color="#34D399"/><stop offset="1" stop-color="#059669"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-black tracking-tight text-white">${t('settings_title', currentLang)}</h1>
          <span class="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            v${chrome.runtime.getManifest().version}
          </span>
        </div>
        <p class="text-xs text-mute">${t('settings_sub', currentLang)}</p>
      </div>
    </header>

    <!-- Language Selector Section -->
    <section class="mb-6 space-y-4 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('language_section_title', currentLang)}</h2>
          <p class="mt-0.5 text-xs text-mute">${t('language_section_desc', currentLang)}</p>
        </div>
        <span id="lang-save-status" class="text-xs font-bold text-brand-400"></span>
      </div>

      <!-- Visual Interactive Language Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        ${SUPPORTED_LOCALES.map(
          (l) => `
          <button type="button" data-option-lang="${l.code}"
            class="group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-150 active:scale-95 ${
              l.code === currentLang
                ? 'border-brand-500 bg-brand-500/15 shadow-[0_0_18px_rgba(16,185,129,0.22)]'
                : 'border-edge bg-obsidian/70 hover:border-brand-500/40 hover:bg-raised'
            }">
            <div class="flex items-center justify-between">
              ${getFlagSvg(l.code)}
              ${
                l.code === currentLang
                  ? `<span class="inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[9.5px] font-black text-brand-300 border border-brand-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                      <svg viewBox="0 0 16 16" fill="none" class="h-2.5 w-2.5"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ${t('connects_saved_active', currentLang)}
                    </span>`
                  : `<span class="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold text-slate-400 group-hover:text-slate-200 transition-colors">${l.code.toUpperCase()}</span>`
              }
            </div>
            <div class="mt-3 min-w-0">
              <div class="text-xs font-bold text-white truncate group-hover:text-brand-300 transition-colors">${l.nativeName}</div>
              <div class="text-[10px] text-slate-400 truncate mt-0.5">${l.sublabel}</div>
            </div>
          </button>
        `
        ).join('')}
      </div>

      <!-- Hidden select for compatibility -->
      <select id="setting-language" class="hidden">
        ${SUPPORTED_LOCALES.map(
          (l) => `
          <option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>
            ${l.name}
          </option>
        `
        ).join('')}
      </select>
    </section>

    <!-- License Section -->
    <section class="mb-6 space-y-4 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex items-center justify-between">
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('license', currentLang)}</h2>
        <span class="text-[10px] font-mono text-slate-400">ExtensionPay</span>
      </div>

      <div class="flex items-start gap-3 rounded-xl border border-white/5 bg-obsidian/40 p-3.5">
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-brand-500/30 bg-brand-500/15 text-brand-400">
          <svg viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.8 4h1.6v4H7.2V5zm.8 7a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
        </div>
        <p id="license-status" class="text-sm leading-relaxed text-slate-300 pt-0.5">${t('license_status_checking', currentLang)}</p>
      </div>

      <div class="flex flex-wrap gap-2.5 pt-1">
        <button id="buy"
          class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-150 hover:brightness-105 active:scale-[.98]">
          <span class="absolute inset-x-0 top-0 h-px bg-white/60"></span>
          ${t('get_pro', currentLang)} — ${PRO_PRICE} early bird
        </button>
        <button id="recheck"
          class="rounded-xl border border-edge bg-raised px-4 py-2.5 text-sm font-semibold text-mute transition-colors duration-150 hover:border-brand-500/40 hover:text-white active:scale-[.99]">
          ${t('recheck_license', currentLang)}
        </button>
      </div>
    </section>

    <!-- Account & Cloud Sync Section -->
    <section class="mb-6 space-y-4 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('account_section_title', currentLang)}</h2>
          <p class="mt-0.5 text-xs text-mute">${t('account_section_desc', currentLang)}</p>
        </div>
        <span id="account-tier-badge" class="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-400">
          <span class="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
          <span id="account-tier-label">${t('tier_free', currentLang)}</span>
        </span>
      </div>

      <div class="rounded-xl border border-white/5 bg-obsidian/40 p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-mute font-medium">Status:</span>
            <span id="cloud-sync-status" class="font-bold text-slate-400 flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-slate-500"></span>
              ${t('sync_status_offline', currentLang)}
            </span>
          </div>
          <div id="account-user-email" class="text-slate-400 font-mono text-[11px]">
            local_anonymous
          </div>
        </div>

        <div id="team-info-box" class="hidden rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs">
          <div class="flex items-center justify-between text-brand-300 font-bold mb-1">
            <span id="team-name-label">Agency Workspace</span>
            <span id="team-seats-badge" class="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-mono">1 / 10 seats</span>
          </div>
          <div class="text-[11px] text-slate-400 flex items-center justify-between">
            <span>${t('team_intel_shared', currentLang)}:</span>
            <span id="team-intel-count" class="font-mono font-bold text-white">0</span>
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <input id="account-token-input" type="text" placeholder="Enter license or agency team token…" autocomplete="off" spellcheck="false"
          class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 text-xs text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <div class="flex items-center gap-2">
          <button id="account-connect-btn" type="button"
            class="rounded-xl border border-edge bg-raised px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:border-brand-500/40 hover:bg-raised/80 active:scale-[.99]">
            Connect
          </button>
          <button id="account-sync-btn" type="button"
            class="flex-1 rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.2)] transition-all duration-150 hover:scale-[1.01] active:scale-[.98]">
            ${t('sync_now_btn', currentLang)}
          </button>
          <button id="account-disconnect-btn" type="button" class="hidden rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 transition-colors duration-150 hover:bg-red-500/20 active:scale-[.99]">
            Disconnect
          </button>
        </div>
      </div>
      <span id="account-status-msg" class="text-xs font-bold text-brand-400"></span>

      <!-- Module A: Live Team Proposal Pipeline & Collision Ledger -->
      <div id="team-pipeline-section" class="mt-4 pt-4 border-t border-white/5 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="flex h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
            <h3 class="text-xs font-black uppercase tracking-wider text-purple-300">
              ${t('active_team_pipeline', currentLang)}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <button id="simulate-team-activity-btn" type="button"
              class="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 transition-colors">
              ${t('simulate_team_activity_btn', currentLang)}
            </button>
            <button id="clear-team-pipeline-btn" type="button"
              class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors">
              ${t('clear_team_pipeline_btn', currentLang)}
            </button>
          </div>
        </div>

        <!-- Metrics Row -->
        <div class="grid grid-cols-3 gap-2.5">
          <div class="rounded-xl border border-white/5 bg-obsidian/60 p-3">
            <div class="text-[10px] uppercase font-bold text-mute tracking-wider">${t('collisions_prevented_label', currentLang)}</div>
            <div id="metric-collisions-prevented" class="text-lg font-black text-white font-mono mt-0.5">0</div>
          </div>
          <div class="rounded-xl border border-white/5 bg-obsidian/60 p-3">
            <div class="text-[10px] uppercase font-bold text-mute tracking-wider">${t('connects_saved_label', currentLang)}</div>
            <div id="metric-connects-saved" class="text-lg font-black text-emerald-400 font-mono mt-0.5">0</div>
          </div>
          <div class="rounded-xl border border-white/5 bg-obsidian/60 p-3">
            <div class="text-[10px] uppercase font-bold text-mute tracking-wider">${t('capital_protected_label', currentLang)}</div>
            <div id="metric-dollars-saved" class="text-lg font-black text-brand-300 font-mono mt-0.5">$0.00</div>
          </div>
        </div>
        <div class="mt-2.5">
          <button id="options-share-savings-btn" type="button" class="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-400/40 bg-brand-500/10 hover:bg-brand-500/20 py-2 px-3 text-xs font-bold text-brand-300 shadow-sm transition-all active:scale-[0.99]">
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5 flex-none"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 2.5 2.5c0 1.25-.92 2.3-2.12 2.47l-5.6 2.8a2.5 2.5 0 0 1 0 .46l5.6 2.8c1.2-.17 2.12.88 2.12 2.47a2.5 2.5 0 1 1-5 0c0-.16.02-.31.05-.46l-5.6-2.8A2.5 2.5 0 1 1 5.5 8c0 .16-.02.31-.05.46l5.6 2.8A2.5 2.5 0 0 1 11 13.5"/></svg>
            <span>${t('share_savings_btn', currentLang)} — LinkedIn / X Badge</span>
          </button>
        </div>

        <!-- Active Team Proposals List -->
        <div id="team-pipeline-list" class="space-y-2">
          <!-- Dynamically populated -->
        </div>
      </div>
    </section>

    <!-- Proposal Autopilot & Custom Voice Profile Studio (Module B) -->
    <section class="mb-6 space-y-5 rounded-2xl border border-indigo-500/30 bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400">
              🚀 ${t('voice_profile_title', currentLang)}
            </h2>
            <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-300 border border-indigo-500/30">
              PRO FREELANCER
            </span>
          </div>
          <p class="mt-0.5 text-xs text-mute">${t('voice_profile_desc', currentLang)}</p>
        </div>
        <span id="voice-save-status" class="text-xs font-bold text-indigo-400"></span>
      </div>

      <!-- Tone Selector & Custom Instructions -->
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('default_voice_tone_label', currentLang)}</span>
          <div class="relative">
            <select id="voice-tone-select"
              class="w-full cursor-pointer appearance-none rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 pr-8 text-sm text-ink transition-colors duration-150 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="direct_engineer">${t('tone_direct', currentLang)}</option>
              <option value="consultative_partner">${t('tone_consultative', currentLang)}</option>
              <option value="velocity_exec">${t('tone_velocity', currentLang)}</option>
              <option value="custom">${t('tone_custom', currentLang)}</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-3.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 10 6">
              <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('custom_tone_instructions', currentLang)}</span>
          <input id="voice-custom-instructions" type="text"
            placeholder="${t('custom_tone_placeholder', currentLang)}"
            class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </label>
      </div>

      <!-- Interactive Tone Analyzer -->
      <div class="rounded-xl border border-white/5 bg-obsidian/70 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300">${t('auto_tone_analyzer_title', currentLang)}</span>
          <span id="tone-analysis-badge" class="text-[10px] font-bold text-slate-400">${t('tone_calibration_hint', currentLang)}</span>
        </div>
        <textarea id="tone-sample-input" rows="3"
          placeholder="${t('paste_sample_proposal_placeholder', currentLang)}"
          class="w-full rounded-xl border border-edge bg-obsidian/90 px-3.5 py-2.5 text-xs text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"></textarea>
        <div class="flex items-center justify-between">
          <button id="tone-analyze-btn" type="button"
            class="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-bold text-indigo-300 transition-all duration-150 hover:bg-indigo-500/25 active:scale-95">
            ${t('analyze_tone_btn', currentLang)}
          </button>
          <div id="tone-traits-display" class="text-xs text-slate-300 font-mono hidden"></div>
        </div>
      </div>

      <!-- Portfolio Case Studies Manager -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-bold text-slate-200">💼 ${t('case_studies_title', currentLang)}</h3>
            <p class="text-[11px] text-mute">${t('case_studies_sub', currentLang)}</p>
          </div>
          <button id="seed-case-studies-btn" type="button"
            class="rounded-lg border border-edge bg-raised px-3 py-1 text-xs font-semibold text-slate-300 hover:border-brand-500/40 hover:text-white transition-all">
            ${t('seed_case_studies_btn', currentLang)}
          </button>
        </div>

        <!-- Add Case Study Form -->
        <div class="rounded-xl border border-white/5 bg-obsidian/50 p-3.5 space-y-2.5">
          <div class="grid gap-2.5 sm:grid-cols-2">
            <input id="cs-title-input" type="text" placeholder="${t('case_study_title_label', currentLang)}"
              class="rounded-lg border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none" />
            <input id="cs-tags-input" type="text" placeholder="${t('case_study_tags_label', currentLang)}"
              class="rounded-lg border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none" />
          </div>
          <div class="grid gap-2.5 sm:grid-cols-2">
            <input id="cs-problem-input" type="text" placeholder="${t('case_study_problem_label', currentLang)}"
              class="rounded-lg border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none" />
            <input id="cs-metrics-input" type="text" placeholder="${t('case_study_metrics_label', currentLang)}"
              class="rounded-lg border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none" />
          </div>
          <div class="flex items-center gap-2">
            <input id="cs-link-input" type="url" placeholder="${t('case_study_link_label', currentLang)}"
              class="flex-1 rounded-lg border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none" />
            <button id="add-case-study-btn" type="button"
              class="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition-all">
              ${t('add_case_study_btn', currentLang)}
            </button>
          </div>
        </div>

        <!-- Case Studies List -->
        <div id="case-studies-list" class="space-y-2">
          <!-- Dynamically populated -->
        </div>
      </div>
    </section>

    <!-- Predictive Bid Intelligence & Connects ROI Simulator (Module C) -->
    <section class="mb-6 space-y-5 rounded-2xl border border-sky-500/30 bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-sky-400">
              📈 ${t('bid_simulator_title', currentLang)}
            </h2>
            <span class="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-300 border border-sky-500/30">
              ${t('bid_intel_badge', currentLang)}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-mute">${t('bid_simulator_desc', currentLang)}</p>
        </div>
      </div>

      <!-- Controls Grid -->
      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="font-semibold text-slate-300">${t('contract_value_label', currentLang)}</span>
            <span id="sim-budget-val" class="font-mono font-bold text-sky-400">$1,500</span>
          </div>
          <input id="sim-budget-slider" type="range" min="100" max="10000" step="100" value="1500"
            class="w-full accent-sky-500 cursor-pointer" />
        </label>

        <label class="block space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="font-semibold text-slate-300">${t('client_hire_rate_label', currentLang)}</span>
            <span id="sim-hirerate-val" class="font-mono font-bold text-emerald-400">65%</span>
          </div>
          <input id="sim-hirerate-slider" type="range" min="0" max="100" step="5" value="65"
            class="w-full accent-emerald-500 cursor-pointer" />
        </label>

        <label class="block space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="font-semibold text-slate-300">${t('competition_label', currentLang)}</span>
            <span id="sim-proposals-val" class="font-mono font-bold text-indigo-400">18 proposals</span>
          </div>
          <input id="sim-proposals-slider" type="range" min="1" max="60" step="1" value="18"
            class="w-full accent-indigo-500 cursor-pointer" />
        </label>
      </div>

      <!-- Output Simulation Dashboard -->
      <div class="rounded-xl border border-white/5 bg-obsidian/70 p-4 space-y-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span id="sim-strategy-badge" class="rounded px-2 py-0.5 text-[10px] font-black uppercase font-mono border"></span>
            <span id="sim-recommended-bid" class="text-xs font-bold text-white"></span>
          </div>
          <span id="sim-roi-ratio" class="text-xs font-mono font-extrabold text-amber-400"></span>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div class="text-[9.5px] font-bold text-mute uppercase tracking-wider">${t('win_probability_label', currentLang)}</div>
            <div id="sim-win-prob" class="text-base font-black text-emerald-400 font-mono mt-0.5">0%</div>
          </div>
          <div class="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div class="text-[9.5px] font-bold text-mute uppercase tracking-wider">${t('organic_win_label', currentLang)}</div>
            <div id="sim-org-prob" class="text-base font-black text-slate-300 font-mono mt-0.5">0%</div>
          </div>
          <div class="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div class="text-[9.5px] font-bold text-mute uppercase tracking-wider">${t('expected_value_label', currentLang)}</div>
            <div id="sim-expected-value" class="text-base font-black text-brand-300 font-mono mt-0.5">$0</div>
          </div>
          <div class="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div class="text-[9.5px] font-bold text-mute uppercase tracking-wider">${t('break_even_win_label', currentLang)}</div>
            <div id="sim-breakeven" class="text-base font-black text-slate-400 font-mono mt-0.5">0%</div>
          </div>
        </div>

        <p id="sim-verdict" class="text-xs text-slate-300 leading-relaxed bg-white/[0.02] border border-white/5 p-3 rounded-lg"></p>

        <!-- Dynamic Visual Curve -->
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-mute tracking-wider">Win Probability & EV by Boost Bid</div>
          <div id="sim-curve-container" class="flex gap-1.5 items-end h-20 pt-2 border-b border-white/10 pb-1">
            <!-- Dynamically populated bars -->
          </div>
        </div>
      </div>
    </section>

    <!-- AI Proposal Polisher (BYOK) Section -->
    <section class="mb-6 space-y-5 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('ai_polish_title', currentLang)}</h2>

      <label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-edge bg-raised/80 px-4 py-3 transition-colors duration-150 hover:border-brand-500/30">
        <span class="text-sm font-semibold text-white">
          ${t('enable_ai_polish', currentLang)}
          <span class="mt-0.5 block text-xs font-normal text-mute">${t('ai_polish_note', currentLang)}</span>
        </span>
        <input id="byok-enabled" type="checkbox" class="peer sr-only" />
        <span class="relative h-6 w-11 flex-none rounded-full bg-slate-700 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400"></span>
      </label>

      <p class="-mt-2 text-xs leading-relaxed text-mute">
        ${t('ai_polish_help', currentLang)}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('provider', currentLang)}</span>
          <div class="relative">
            <select id="provider"
              class="w-full cursor-pointer appearance-none rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 pr-8 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-3.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 10 6">
              <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>

        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('api_key', currentLang)}</span>
          <input id="api-key" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false"
            class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button id="save"
          class="rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.25)] transition-all duration-150 hover:shadow-[0_0_24px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[.98]">
          ${t('save', currentLang)}
        </button>
        <button id="byok-test" type="button"
          class="rounded-xl border border-edge bg-raised px-4 py-2 text-sm font-semibold text-slate-200 transition-colors duration-150 hover:border-brand-500/40 hover:bg-raised/80 hover:text-white active:scale-[.99]">
          ${t('test_connection', currentLang)}
        </button>
        <span id="save-status" class="text-xs font-bold text-brand-400"></span>
      </div>
    </section>

    <!-- Background RSS Scanner Section -->
    <section class="space-y-5 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('scanner_title', currentLang)}</h2>

      <label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-edge bg-raised/80 px-4 py-3 transition-colors duration-150 hover:border-brand-500/30">
        <span class="text-sm font-semibold text-white">
          ${t('scanner_toggle', currentLang)}
          <span class="mt-0.5 block text-xs font-normal text-mute">${t('scanner_note', currentLang)}</span>
        </span>
        <input id="scanner-enabled" type="checkbox" class="peer sr-only" />
        <span class="relative h-6 w-11 flex-none rounded-full bg-slate-700 transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-200 peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400"></span>
      </label>

      <label class="block space-y-2">
        <span class="text-xs font-semibold text-mute">${t('scanner_rss_label', currentLang)}</span>
        <input id="scanner-rss" type="url" placeholder="https://www.upwork.com/nx/search/jobs/rss?q=…" autocomplete="off" spellcheck="false"
          class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-600 transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        <span class="block text-xs leading-relaxed text-mute">${t('scanner_rss_help', currentLang)}</span>
      </label>

      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('check_every', currentLang)}</span>
          <div class="relative">
            <select id="scanner-interval"
              class="w-full cursor-pointer appearance-none rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 pr-8 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="3">3 minutes</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-3.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 10 6">
              <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('min_score', currentLang)}</span>
          <div class="relative">
            <select id="scanner-min-score"
              class="w-full cursor-pointer appearance-none rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 pr-8 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="80">80 (strict)</option>
              <option value="70">70</option>
              <option value="60">60 (loose)</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-3.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 10 6">
              <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-mute">${t('posted_within', currentLang)}</span>
          <div class="relative">
            <select id="scanner-fresh"
              class="w-full cursor-pointer appearance-none rounded-xl border border-edge bg-obsidian px-3.5 py-2.5 pr-8 text-sm text-ink transition-colors duration-150 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-3.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 10 6">
              <path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button id="scanner-save"
          class="rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.25)] transition-all duration-150 hover:shadow-[0_0_24px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[.98]">
          ${t('save', currentLang)}
        </button>
        <button id="scanner-test"
          class="rounded-xl border border-edge bg-raised px-4 py-2 text-sm font-semibold text-slate-200 transition-colors duration-150 hover:border-brand-500/40 hover:bg-raised/80 hover:text-white active:scale-[.99]">
          ${t('run_test_scan', currentLang)}
        </button>
        <span id="scanner-status" class="text-xs font-bold text-brand-400"></span>
      </div>
    </section>

    <!-- Agency Lead Inbox & Pipeline (Module D) -->
    <section class="space-y-5 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('lead_inbox_title', currentLang)}</h2>
            <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-400 border border-indigo-500/30">AGENCY CRM</span>
          </div>
          <p class="mt-0.5 text-xs text-mute">${t('lead_inbox_desc', currentLang)}</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="export-csv-btn" class="rounded-xl border border-edge bg-raised px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-brand-500/40 hover:text-white transition-all">
            ${t('export_csv_btn', currentLang)}
          </button>
          <button id="export-json-btn" class="rounded-xl border border-edge bg-raised px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-brand-500/40 hover:text-white transition-all">
            ${t('export_json_btn', currentLang)}
          </button>
          <button id="refresh-pipeline-btn" class="rounded-xl border border-edge bg-raised px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-brand-500/40 hover:text-white transition-all">
            ${t('refresh_leads_btn', currentLang)}
          </button>
        </div>
      </div>

      <!-- Pipeline KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-xl border border-edge/80 bg-raised/50 p-3">
          <div class="text-[10px] font-bold uppercase text-slate-400">${t('active_claims_count', currentLang)}</div>
          <div id="kpi-active-claims" class="text-lg font-black text-white mt-0.5">0</div>
        </div>
        <div class="rounded-xl border border-edge/80 bg-raised/50 p-3">
          <div class="text-[10px] font-bold uppercase text-slate-400">${t('pipeline_total_value', currentLang)}</div>
          <div id="kpi-pipeline-value" class="text-lg font-black text-emerald-400 mt-0.5">$0</div>
        </div>
        <div class="rounded-xl border border-edge/80 bg-raised/50 p-3">
          <div class="text-[10px] font-bold uppercase text-slate-400">${t('connects_saved_label', currentLang)}</div>
          <div id="kpi-connects-saved" class="text-lg font-black text-sky-400 mt-0.5">0</div>
        </div>
        <div class="rounded-xl border border-edge/80 bg-raised/50 p-3">
          <div class="text-[10px] font-bold uppercase text-slate-400">${t('capital_protected_label', currentLang)}</div>
          <div id="kpi-dollars-saved" class="text-lg font-black text-brand-400 mt-0.5">$0</div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="flex flex-wrap items-center gap-3">
        <input id="lead-search" type="text" placeholder="Search by title, client, or BD…" class="flex-1 min-w-[200px] rounded-xl border border-edge bg-obsidian px-3.5 py-2 text-xs text-ink placeholder:text-slate-600 focus:border-brand-500/60 focus:outline-none" />
        <select id="lead-status-filter" class="rounded-xl border border-edge bg-obsidian px-3 py-2 text-xs text-ink focus:border-brand-500/60 focus:outline-none">
          <option value="all">${t('filter_all_status', currentLang)}</option>
          <option value="drafting">${t('status_drafting', currentLang)}</option>
          <option value="applied">${t('status_applied', currentLang)}</option>
          <option value="viewing">${t('status_viewing', currentLang)}</option>
          <option value="passed">${t('status_passed', currentLang)}</option>
        </select>
      </div>

      <!-- Leads List Container -->
      <div id="leads-container" class="space-y-3 max-h-[420px] overflow-y-auto pr-1"></div>
    </section>

    <!-- Real-time Webhooks & CRM Sync (Module D) -->
    <section class="space-y-5 rounded-2xl border border-edge bg-panel/90 p-5 shadow-card animate-fade-up">
      <div class="border-b border-edge/60 pb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">${t('webhook_settings_title', currentLang)}</h2>
          <span class="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-400 border border-sky-500/30">SLACK / DISCORD / CRM</span>
        </div>
        <p class="mt-0.5 text-xs text-mute">${t('webhook_settings_desc', currentLang)}</p>
      </div>

      <!-- Slack Endpoint -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="slack-url" class="text-xs font-semibold text-mute">${t('slack_webhook_label', currentLang)}</label>
          <button id="test-slack-btn" type="button" class="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
            ${t('test_webhook_btn', currentLang)}
          </button>
        </div>
        <input id="slack-url" type="url" placeholder="https://hooks.slack.com/services/T.../B.../X..." autocomplete="off" spellcheck="false" class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2 text-xs text-ink placeholder:text-slate-600 focus:border-brand-500/60 focus:outline-none" />
      </div>

      <!-- Discord Endpoint -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="discord-url" class="text-xs font-semibold text-mute">${t('discord_webhook_label', currentLang)}</label>
          <button id="test-discord-btn" type="button" class="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            ${t('test_webhook_btn', currentLang)}
          </button>
        </div>
        <input id="discord-url" type="url" placeholder="https://discord.com/api/webhooks/123.../..." autocomplete="off" spellcheck="false" class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2 text-xs text-ink placeholder:text-slate-600 focus:border-brand-500/60 focus:outline-none" />
      </div>

      <!-- Custom Webhook Endpoint -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="custom-url" class="text-xs font-semibold text-mute">${t('custom_webhook_label', currentLang)}</label>
          <button id="test-custom-btn" type="button" class="text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-colors">
            ${t('test_webhook_btn', currentLang)}
          </button>
        </div>
        <input id="custom-url" type="url" placeholder="https://api.youragency.com/leads/webhook" autocomplete="off" spellcheck="false" class="w-full rounded-xl border border-edge bg-obsidian px-3.5 py-2 text-xs text-ink placeholder:text-slate-600 focus:border-brand-500/60 focus:outline-none" />
      </div>

      <!-- Trigger Rules & Threshold -->
      <div class="grid sm:grid-cols-2 gap-3 pt-2">
        <label class="flex items-center gap-3 cursor-pointer rounded-xl border border-edge/80 bg-raised/40 p-3 hover:border-brand-500/30 transition-colors">
          <input id="notify-claim" type="checkbox" class="h-4 w-4 rounded border-edge text-brand-500 focus:ring-0 focus:outline-none" />
          <span class="text-xs text-slate-200">${t('notify_claim_label', currentLang)}</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer rounded-xl border border-edge/80 bg-raised/40 p-3 hover:border-brand-500/30 transition-colors">
          <input id="notify-applied" type="checkbox" class="h-4 w-4 rounded border-edge text-brand-500 focus:ring-0 focus:outline-none" />
          <span class="text-xs text-slate-200">${t('notify_applied_label', currentLang)}</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer rounded-xl border border-edge/80 bg-raised/40 p-3 hover:border-brand-500/30 transition-colors">
          <input id="notify-high-value" type="checkbox" class="h-4 w-4 rounded border-edge text-brand-500 focus:ring-0 focus:outline-none" />
          <span class="text-xs text-slate-200">${t('notify_high_value_label', currentLang)}</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer rounded-xl border border-edge/80 bg-raised/40 p-3 hover:border-brand-500/30 transition-colors">
          <input id="notify-collision" type="checkbox" class="h-4 w-4 rounded border-edge text-brand-500 focus:ring-0 focus:outline-none" />
          <span class="text-xs text-slate-200">${t('notify_collision_label', currentLang)}</span>
        </label>
      </div>

      <div class="flex items-center justify-between gap-4 pt-1">
        <label class="flex items-center gap-3">
          <span class="text-xs font-semibold text-mute">${t('high_value_threshold_label', currentLang)}</span>
          <input id="high-value-threshold" type="number" min="100" step="100" value="1000" class="w-28 rounded-xl border border-edge bg-obsidian px-3 py-1.5 text-xs text-ink font-mono" />
        </label>

        <div class="flex items-center gap-3">
          <button id="save-webhooks-btn" class="rounded-xl bg-gradient-to-r from-brand-300 via-teal-300 to-brand-500 px-4 py-2 text-xs font-black text-slate-950 shadow hover:shadow-lg transition-all">
            ${t('save', currentLang)}
          </button>
          <span id="webhook-save-status" class="text-xs font-bold text-brand-400"></span>
        </div>
      </div>
    </section>
  `

  const langSaveStatus = document.getElementById('lang-save-status')

  // Interactive Language Grid cards
  document.querySelectorAll<HTMLButtonElement>('button[data-option-lang]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const selected = btn.dataset.optionLang as SupportedLocale
      if (!selected) return
      await setLanguage(selected)
      if (langSaveStatus) {
        langSaveStatus.textContent = `${t('saved', selected)} ✓`
      }
      // Re-render settings in new language
      void initOptions()
    })
  })

  const licenseStatus = document.getElementById('license-status')
  const buyButton = document.getElementById('buy') as HTMLButtonElement | null
  const saveStatus = document.getElementById('save-status')
  const enabledCb = document.getElementById('byok-enabled') as HTMLInputElement | null
  const providerSel = document.getElementById('provider') as HTMLSelectElement | null
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement | null

  async function refreshLicense(): Promise<void> {
    if (!licenseStatus) return
    try {
      const paid = await syncLicense()
      if (buyButton) buyButton.hidden = paid
      licenseStatus.textContent = paid
        ? t('license_status_pro', currentLang)
        : t('license_status_free', currentLang)
    } catch {
      const paid = await getCachedLicense()
      if (buyButton) buyButton.hidden = paid
      licenseStatus.textContent = paid
        ? t('license_status_pro', currentLang)
        : t('license_status_unknown', currentLang)
    }
  }

  document.getElementById('buy')?.addEventListener('click', () => {
    if (openUpgradeFlow()) return
    if (licenseStatus) {
      licenseStatus.textContent =
        'Payment window unavailable — verify the ExtensionPay extension ID in src/monetization/extpay.ts.'
    }
  })

  document.getElementById('recheck')?.addEventListener('click', () => {
    void syncLicense(true).then((paid) => {
      if (licenseStatus) {
        licenseStatus.textContent = paid
          ? t('license_status_pro', currentLang)
          : t('license_status_free', currentLang)
      }
    }).catch(() => void refreshLicense())
  })

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
    saveStatus.className = 'text-xs font-bold text-brand-400'
    saveStatus.textContent = 'Saved ✓'
    window.setTimeout(() => {
      if (saveStatus) saveStatus.textContent = ''
    }, 1600)
  })

  document.getElementById('byok-test')?.addEventListener('click', async () => {
    if (!saveStatus || !providerSel || !apiKeyInput) return
    const already = await hasAiOrigins()
    const granted = already ? true : await requestAiOrigins()
    if (!granted) {
      saveStatus.className = 'text-xs text-amber-300'
      saveStatus.textContent = 'Host permission denied — cannot test.'
      return
    }

    let apiKey = apiKeyInput.value.trim()
    if (!apiKey) {
      const byok = await loadByok()
      apiKey = byok.apiKey
    }

    if (!apiKey) {
      saveStatus.className = 'text-xs text-red-400'
      saveStatus.textContent = 'Enter an API key first.'
      return
    }

    saveStatus.className = 'text-xs text-mute'
    saveStatus.textContent = 'Testing connection…'

    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'BYOK_POLISH',
        prompt: 'Connection verification ping. Respond with: OK',
        provider: providerSel.value as Provider,
        apiKey
      })) as { ok?: boolean; text?: string } | undefined

      if (!res) throw new Error('No response from background worker.')
      if (res.ok) {
        saveStatus.className = 'text-xs font-bold text-brand-400'
        saveStatus.textContent = 'Connection verified ✓'
        window.setTimeout(() => {
          if (saveStatus && saveStatus.textContent === 'Connection verified ✓') {
            saveStatus.textContent = ''
          }
        }, 3200)
      } else {
        saveStatus.className = 'text-xs text-red-400'
        saveStatus.textContent = `Test failed: ${res.text || 'API rejected key'}`
      }
    } catch (err) {
      saveStatus.className = 'text-xs text-red-400'
      saveStatus.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`
    }
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
    scannerStatus.className = isError ? 'text-xs text-red-400' : 'text-xs font-bold text-brand-400'
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

  const accountTierLabel = document.getElementById('account-tier-label')
  const accountTierBadge = document.getElementById('account-tier-badge')
  const cloudSyncStatus = document.getElementById('cloud-sync-status')
  const accountUserEmail = document.getElementById('account-user-email')
  const teamInfoBox = document.getElementById('team-info-box')
  const teamNameLabel = document.getElementById('team-name-label')
  const teamSeatsBadge = document.getElementById('team-seats-badge')
  const teamIntelCount = document.getElementById('team-intel-count')
  const accountTokenInput = document.getElementById('account-token-input') as HTMLInputElement | null
  const accountConnectBtn = document.getElementById('account-connect-btn')
  const accountSyncBtn = document.getElementById('account-sync-btn')
  const accountDisconnectBtn = document.getElementById('account-disconnect-btn')
  const accountStatusMsg = document.getElementById('account-status-msg')

  const metricCollisionsPrevented = document.getElementById('metric-collisions-prevented')
  const metricConnectsSaved = document.getElementById('metric-connects-saved')
  const metricDollarsSaved = document.getElementById('metric-dollars-saved')
  const teamPipelineList = document.getElementById('team-pipeline-list')
  const simulateTeamActivityBtn = document.getElementById('simulate-team-activity-btn')
  const clearTeamPipelineBtn = document.getElementById('clear-team-pipeline-btn')

  function flashAccountStatus(msg: string, isError: boolean): void {
    if (!accountStatusMsg) return
    accountStatusMsg.className = isError ? 'text-xs text-red-400' : 'text-xs font-bold text-brand-400'
    accountStatusMsg.textContent = msg
    window.setTimeout(() => {
      if (accountStatusMsg) accountStatusMsg.textContent = ''
    }, 3200)
  }

  async function refreshAccount(): Promise<void> {
    const profile = await getUserProfile()
    const tier = await getAccountTier()
    const syncState = await getSyncState()
    const teamIntel = await getTeamSharedIntel()
    const metrics = await getTeamCollisionMetrics()
    const activities = await getTeamActivities()

    if (accountTierLabel && accountTierBadge) {
      if (tier === 'agency') {
        accountTierLabel.textContent = t('tier_agency', currentLang)
        accountTierBadge.className =
          'inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
      } else if (tier === 'pro_freelancer') {
        accountTierLabel.textContent = t('tier_pro', currentLang)
        accountTierBadge.className =
          'inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
      } else {
        accountTierLabel.textContent = t('tier_free', currentLang)
        accountTierBadge.className =
          'inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-400'
      }
    }

    if (accountUserEmail) {
      accountUserEmail.textContent = profile.email || profile.userId
    }

    if (cloudSyncStatus) {
      if (syncState.syncStatus === 'synced') {
        const timeStr = syncState.lastSyncedAt
          ? new Date(syncState.lastSyncedAt).toLocaleTimeString()
          : ''
        cloudSyncStatus.className = 'font-bold text-brand-400 flex items-center gap-1.5'
        cloudSyncStatus.innerHTML = `<span class="h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span> ${t('sync_status_synced', currentLang)} ${timeStr ? `(${timeStr})` : ''}`
      } else if (syncState.syncStatus === 'syncing') {
        cloudSyncStatus.className = 'font-bold text-amber-300 flex items-center gap-1.5'
        cloudSyncStatus.innerHTML =
          '<span class="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span> Syncing…'
      } else if (syncState.syncStatus === 'error') {
        cloudSyncStatus.className = 'font-bold text-red-400 flex items-center gap-1.5'
        cloudSyncStatus.innerHTML = `<span class="h-2 w-2 rounded-full bg-red-400"></span> ${syncState.errorMessage || 'Sync error'}`
      } else {
        cloudSyncStatus.className = 'font-bold text-slate-400 flex items-center gap-1.5'
        cloudSyncStatus.innerHTML = `<span class="h-2 w-2 rounded-full bg-slate-500"></span> ${t('sync_status_offline', currentLang)}`
      }
    }

    if (teamInfoBox) {
      if (tier === 'agency') {
        teamInfoBox.classList.remove('hidden')
        if (teamNameLabel) teamNameLabel.textContent = profile.teamName || 'Agency Workspace'
        if (teamSeatsBadge)
          teamSeatsBadge.textContent = `${profile.activeSeats ?? 1} / ${profile.seatLimit ?? 10} seats`
        if (teamIntelCount) teamIntelCount.textContent = `${teamIntel.length} flagged clients`
      } else {
        teamInfoBox.classList.add('hidden')
      }
    }

    if (metricCollisionsPrevented) {
      metricCollisionsPrevented.textContent = String(metrics.collisionsPrevented)
    }
    if (metricConnectsSaved) {
      metricConnectsSaved.textContent = String(metrics.connectsSaved)
    }
    if (metricDollarsSaved) {
      metricDollarsSaved.textContent = `$${metrics.dollarsSaved.toFixed(2)}`
    }

    const optionsShareBtn = document.getElementById('options-share-savings-btn')
    if (optionsShareBtn && !optionsShareBtn.dataset.bound) {
      optionsShareBtn.dataset.bound = 'true'
      optionsShareBtn.addEventListener('click', async () => {
        const count = await getConnectsSaved()
        const dollars = count * DOLLARS_PER_CONNECT
        const isPaid = await getCachedLicense()
        const roi = isPaid && dollars >= 9.99 ? (dollars / 9.99).toFixed(1) : undefined
        openShareModal(
          {
            connectsSaved: count,
            dollarsSaved: dollars,
            proRoiMultiplier: roi,
            locale: currentLang
          },
          currentLang
        )
      })
    }

    if (teamPipelineList) {
      if (activities.length === 0) {
        teamPipelineList.innerHTML = `
          <div class="rounded-xl border border-white/5 bg-obsidian/30 p-4 text-center text-xs text-mute">
            ${t('team_pipeline_empty', currentLang)}
          </div>`
      } else {
        teamPipelineList.innerHTML = activities
          .map((item) => {
            const statusColor =
              item.status === 'applied'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : item.status === 'drafting'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
            const timeAgo = formatTimeAgo(item.updatedAt)
            return `
              <div class="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-obsidian/50 p-3 hover:border-purple-500/30 transition-colors">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="rounded px-1.5 py-0.5 text-[9.5px] font-black uppercase font-mono border ${statusColor}">
                      ${item.status}
                    </span>
                    <span class="text-xs font-bold text-white truncate">${escapeHtml(item.jobTitle)}</span>
                  </div>
                  <div class="text-[11px] text-mute flex items-center gap-2 mt-1">
                    <span>👤 <b class="text-slate-200">${escapeHtml(item.memberName)}</b></span>
                    <span>•</span>
                    <span>${escapeHtml(timeAgo)}</span>
                    ${item.clientName ? `<span>•</span><span>🏢 ${escapeHtml(item.clientName)}</span>` : ''}
                  </div>
                </div>
                <button type="button" data-release-job="${escapeHtml(item.jobId)}"
                  class="flex-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                  ${t('clear_btn', currentLang)}
                </button>
              </div>`
          })
          .join('')

        teamPipelineList.querySelectorAll<HTMLButtonElement>('[data-release-job]').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation()
            const jid = btn.getAttribute('data-release-job')
            if (jid) {
              await releaseJobClaim(jid)
              await refreshAccount()
            }
          })
        })
      }
    }

    if (accountDisconnectBtn) {
      if (profile.tier !== 'free' || profile.licenseToken) {
        accountDisconnectBtn.classList.remove('hidden')
      } else {
        accountDisconnectBtn.classList.add('hidden')
      }
    }
  }

  accountConnectBtn?.addEventListener('click', async () => {
    const token = accountTokenInput?.value.trim()
    if (!token) {
      flashAccountStatus('Enter a token first.', true)
      return
    }
    const res = await loginWithToken(token)
    if (res.success) {
      if (accountTokenInput) accountTokenInput.value = ''
      flashAccountStatus(
        `Connected as ${res.profile.tier === 'agency' ? 'Agency Team' : 'Pro Freelancer'} ✓`,
        false
      )
      await triggerCloudSync()
      await refreshAccount()
    } else {
      flashAccountStatus(res.error || 'Connection failed', true)
    }
  })

  accountSyncBtn?.addEventListener('click', async () => {
    flashAccountStatus('Syncing cloud data…', false)
    const res = await triggerCloudSync()
    if (res.syncStatus === 'synced') {
      flashAccountStatus('Cloud sync completed ✓', false)
    } else if (res.syncStatus === 'offline') {
      flashAccountStatus('Offline mode (Upgrade to Pro/Agency for cloud sync)', false)
    } else {
      flashAccountStatus(res.errorMessage || 'Sync failed', true)
    }
    await refreshAccount()
  })

  accountDisconnectBtn?.addEventListener('click', async () => {
    await logoutAccount()
    flashAccountStatus('Account disconnected', false)
    await refreshAccount()
  })

  simulateTeamActivityBtn?.addEventListener('click', async () => {
    await seedSampleTeamActivities()
    flashAccountStatus('Simulated agency team activity seeded ✓', false)
    await refreshAccount()
  })

  clearTeamPipelineBtn?.addEventListener('click', async () => {
    await clearAllTeamActivities()
    flashAccountStatus('Team pipeline cleared', false)
    await refreshAccount()
  })

  // --- Module B: Voice Profile & Case Studies Studio Wiring ---
  const voiceToneSelect = app.querySelector<HTMLSelectElement>('#voice-tone-select')
  const voiceCustomInstructions = app.querySelector<HTMLInputElement>('#voice-custom-instructions')
  const voiceSaveStatus = app.querySelector<HTMLElement>('#voice-save-status')
  const toneSampleInput = app.querySelector<HTMLTextAreaElement>('#tone-sample-input')
  const toneAnalyzeBtn = app.querySelector<HTMLButtonElement>('#tone-analyze-btn')
  const toneAnalysisBadge = app.querySelector<HTMLElement>('#tone-analysis-badge')
  const toneTraitsDisplay = app.querySelector<HTMLElement>('#tone-traits-display')

  const seedCaseStudiesBtn = app.querySelector<HTMLButtonElement>('#seed-case-studies-btn')
  const csTitleInput = app.querySelector<HTMLInputElement>('#cs-title-input')
  const csTagsInput = app.querySelector<HTMLInputElement>('#cs-tags-input')
  const csProblemInput = app.querySelector<HTMLInputElement>('#cs-problem-input')
  const csMetricsInput = app.querySelector<HTMLInputElement>('#cs-metrics-input')
  const csLinkInput = app.querySelector<HTMLInputElement>('#cs-link-input')
  const addCaseStudyBtn = app.querySelector<HTMLButtonElement>('#add-case-study-btn')
  const caseStudiesList = app.querySelector<HTMLElement>('#case-studies-list')

  function flashVoiceStatus(msg: string): void {
    if (!voiceSaveStatus) return
    voiceSaveStatus.textContent = msg
    window.setTimeout(() => {
      voiceSaveStatus.textContent = ''
    }, 2500)
  }

  async function loadVoiceSettings(): Promise<void> {
    const profile = await loadVoiceProfile()
    if (voiceToneSelect) voiceToneSelect.value = profile.tone
    if (voiceCustomInstructions) voiceCustomInstructions.value = profile.customInstructions || ''
    if (profile.derivedTraits && toneTraitsDisplay) {
      toneTraitsDisplay.classList.remove('hidden')
      toneTraitsDisplay.textContent = `Pace: ${profile.derivedTraits.sentenceLength} · Style: ${profile.derivedTraits.formality} · Focus: ${profile.derivedTraits.focusAngle}`
    }
  }

  async function saveCurrentVoiceProfile(): Promise<void> {
    const current = await loadVoiceProfile()
    const tone = (voiceToneSelect?.value as VoiceTone) || 'direct_engineer'
    const customInstructions = voiceCustomInstructions?.value.trim() || undefined
    await saveVoiceProfile({
      ...current,
      tone,
      customInstructions
    })
    flashVoiceStatus(t('saved', currentLang))
  }

  voiceToneSelect?.addEventListener('change', () => {
    void saveCurrentVoiceProfile()
  })

  voiceCustomInstructions?.addEventListener('blur', () => {
    void saveCurrentVoiceProfile()
  })

  toneAnalyzeBtn?.addEventListener('click', async () => {
    const sample = toneSampleInput?.value.trim()
    if (!sample) {
      if (toneAnalysisBadge) toneAnalysisBadge.textContent = 'Paste proposal text first.'
      return
    }

    if (toneAnalyzeBtn) {
      toneAnalyzeBtn.disabled = true
      toneAnalyzeBtn.textContent = t('analyzing_tone', currentLang)
    }

    const result: ToneAnalysisResult = analyzeWritingTone(sample)

    if (toneAnalysisBadge) {
      toneAnalysisBadge.textContent = `Tone: ${result.derivedTone.toUpperCase()} · ${result.metricsFrequency.toUpperCase()} Proof`
    }

    if (toneTraitsDisplay) {
      toneTraitsDisplay.classList.remove('hidden')
      toneTraitsDisplay.textContent = `Sentences: ${result.detectedSentences} (avg ${result.avgSentenceLength} wps) · Formality: ${result.formality} · Focus: ${result.focusAngle}`
    }

    if (voiceToneSelect) {
      voiceToneSelect.value = result.derivedTone
    }

    const current = await loadVoiceProfile()
    await saveVoiceProfile({
      ...current,
      tone: result.derivedTone,
      sampleText: sample.slice(0, 1000),
      derivedTraits: result
    })

    if (toneAnalyzeBtn) {
      toneAnalyzeBtn.disabled = false
      toneAnalyzeBtn.textContent = `✓ ${t('tone_analyzed_success', currentLang)}`
      setTimeout(() => {
        toneAnalyzeBtn.textContent = t('analyze_tone_btn', currentLang)
      }, 2500)
    }

    flashVoiceStatus(t('tone_analyzed_success', currentLang))
  })

  async function renderCaseStudies(): Promise<void> {
    if (!caseStudiesList) return
    const studies = await loadCaseStudies()
    if (studies.length === 0) {
      caseStudiesList.innerHTML = `
        <div class="rounded-xl border border-dashed border-edge p-6 text-center text-xs text-mute">
          ${t('case_studies_empty', currentLang)}
        </div>`
      return
    }

    caseStudiesList.innerHTML = studies
      .map((cs) => {
        const tags = Array.isArray(cs.tags) ? cs.tags : []
        const tagBadges = tags
          .map((tg) => `<span class="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">${escapeHtml(tg)}</span>`)
          .join('')
        return `
          <div class="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-obsidian/70 p-3 hover:border-indigo-500/40 transition-colors">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-white">${escapeHtml(cs.title)}</span>
                ${tagBadges}
              </div>
              <p class="text-[11.5px] text-slate-300 leading-snug">
                <span class="text-mute font-semibold">${t('case_study_problem_prefix', currentLang)}</span> ${escapeHtml(cs.problemSolved)}
              </p>
              <p class="text-[11.5px] text-emerald-300 font-medium leading-snug">
                <span class="text-mute font-semibold">${t('case_study_receipts_prefix', currentLang)}</span> ${escapeHtml(cs.metricsOutcome)}
              </p>
              ${cs.proofLink ? `<a href="${escapeHtml(cs.proofLink)}" target="_blank" rel="noreferrer" class="text-[10.5px] text-indigo-400 hover:underline">${t('case_study_proof_link', currentLang)}</a>` : ''}
            </div>
            <button type="button" data-delete-cs="${escapeHtml(cs.id)}"
              class="flex-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              title="${t('clear_btn', currentLang)}">
              🗑️
            </button>
          </div>`
      })
      .join('')

    caseStudiesList.querySelectorAll<HTMLButtonElement>('[data-delete-cs]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-cs')
        if (id) {
          await deleteCaseStudy(id)
          flashVoiceStatus(t('case_study_deleted', currentLang))
          await renderCaseStudies()
        }
      })
    })
  }

  seedCaseStudiesBtn?.addEventListener('click', async () => {
    await seedSampleCaseStudies()
    flashVoiceStatus(t('seed_case_studies_success', currentLang))
    await renderCaseStudies()
  })

  addCaseStudyBtn?.addEventListener('click', async () => {
    const title = csTitleInput?.value.trim()
    const problem = csProblemInput?.value.trim()
    const metrics = csMetricsInput?.value.trim()
    const tagsRaw = csTagsInput?.value.trim() || ''
    const link = csLinkInput?.value.trim() || undefined

    if (!title || !problem || !metrics) {
      flashVoiceStatus('Title, Problem, and Metrics are required.')
      return
    }

    const tags = tagsRaw
      .split(/[,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    await addCaseStudy({
      title,
      tags: tags.length > 0 ? tags : ['General'],
      problemSolved: problem,
      metricsOutcome: metrics,
      proofLink: link
    })

    if (csTitleInput) csTitleInput.value = ''
    if (csTagsInput) csTagsInput.value = ''
    if (csProblemInput) csProblemInput.value = ''
    if (csMetricsInput) csMetricsInput.value = ''
    if (csLinkInput) csLinkInput.value = ''

    flashVoiceStatus(t('case_study_saved', currentLang))
    await renderCaseStudies()
  })

  function initBidSimulator(): void {
    const budgetSlider = document.querySelector<HTMLInputElement>('#sim-budget-slider')
    const hireRateSlider = document.querySelector<HTMLInputElement>('#sim-hirerate-slider')
    const proposalsSlider = document.querySelector<HTMLInputElement>('#sim-proposals-slider')

    const budgetVal = document.querySelector<HTMLElement>('#sim-budget-val')
    const hireRateVal = document.querySelector<HTMLElement>('#sim-hirerate-val')
    const proposalsVal = document.querySelector<HTMLElement>('#sim-proposals-val')

    const strategyBadge = document.querySelector<HTMLElement>('#sim-strategy-badge')
    const recommendedBidEl = document.querySelector<HTMLElement>('#sim-recommended-bid')
    const roiRatioEl = document.querySelector<HTMLElement>('#sim-roi-ratio')
    const winProbEl = document.querySelector<HTMLElement>('#sim-win-prob')
    const orgProbEl = document.querySelector<HTMLElement>('#sim-org-prob')
    const evEl = document.querySelector<HTMLElement>('#sim-expected-value')
    const breakEvenEl = document.querySelector<HTMLElement>('#sim-breakeven')
    const verdictEl = document.querySelector<HTMLElement>('#sim-verdict')
    const curveContainer = document.querySelector<HTMLElement>('#sim-curve-container')

    if (!budgetSlider || !hireRateSlider || !proposalsSlider) return

    const updateSimulation = () => {
      const budget = Number(budgetSlider.value)
      const hireRate = Number(hireRateSlider.value)
      const proposals = Number(proposalsSlider.value)

      if (budgetVal) budgetVal.textContent = `$${budget.toLocaleString()}`
      if (hireRateVal) hireRateVal.textContent = `${hireRate}%`
      if (proposalsVal) proposalsVal.textContent = `${proposals} proposals`

      const intel = calculateBidIntelligence({
        budget: { type: 'fixed', minUsd: budget, maxUsd: budget },
        clientHireRatePct: hireRate,
        clientPaymentVerified: true,
        clientTotalSpendUsd: budget * 3,
        proposalCount: proposals
      })

      const strategyKey =
        intel.strategy === 'AGGRESSIVE_TOP_SLOT'
          ? 'bid_strategy_aggressive'
          : intel.strategy === 'TACTICAL_BOOST'
            ? 'bid_strategy_tactical'
            : intel.strategy === 'ORGANIC_SWEET_SPOT'
              ? 'bid_strategy_organic'
              : 'bid_strategy_skip'

      const badgeColor =
        intel.strategy === 'AGGRESSIVE_TOP_SLOT'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : intel.strategy === 'TACTICAL_BOOST'
            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
            : intel.strategy === 'ORGANIC_SWEET_SPOT'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border-red-500/40'

      if (strategyBadge) {
        strategyBadge.className = `rounded px-2 py-0.5 text-[10px] font-black uppercase font-mono border ${badgeColor}`
        strategyBadge.textContent = t(strategyKey, currentLang)
      }

      if (recommendedBidEl) {
        recommendedBidEl.textContent =
          intel.recommendedBid > 0
            ? `Recommended: ${intel.recommendedBid} Connects ($${intel.connectsCostUsd.toFixed(2)})`
            : `Recommended: 0 Connects (Organic)`
      }

      if (roiRatioEl) {
        roiRatioEl.textContent = `${intel.roiRatio}x Projected ROI`
      }

      if (winProbEl) winProbEl.textContent = `${intel.winProbabilityPct}%`
      if (orgProbEl) orgProbEl.textContent = `${intel.organicWinProbabilityPct}%`
      if (evEl) evEl.textContent = `+$${intel.expectedValueUsd > 0 ? intel.expectedValueUsd.toFixed(0) : '0'}`
      if (breakEvenEl) breakEvenEl.textContent = `${intel.breakEvenWinRatePct}%`
      if (verdictEl) verdictEl.textContent = intel.verdictSummary

      if (curveContainer) {
        const maxProb = Math.max(...intel.curve.map((p) => p.winProbabilityPct), 1)
        curveContainer.innerHTML = intel.curve
          .map((p) => {
            const heightPct = Math.max(10, Math.round((p.winProbabilityPct / maxProb) * 100))
            const isRec = p.bidConnects === intel.recommendedBid
            const isOrg = p.bidConnects === 0
            const fillClass = isRec
              ? 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]'
              : isOrg
                ? 'bg-emerald-500'
                : 'bg-slate-700'
            return `
              <div class="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                   title="${p.bidConnects} Connects: ${p.winProbabilityPct}% win, +$${p.expectedValueUsd} EV">
                <div class="w-full rounded-t transition-all duration-200 ${fillClass}" style="height:${heightPct}%"></div>
                <span class="text-[9px] font-mono text-slate-400 mt-1">${p.bidConnects}c</span>
              </div>`
          })
          .join('')
      }
    }

    budgetSlider.addEventListener('input', updateSimulation)
    hireRateSlider.addEventListener('input', updateSimulation)
    proposalsSlider.addEventListener('input', updateSimulation)
    updateSimulation()
  }

  async function initLeadInbox(): Promise<void> {
    const container = document.getElementById('leads-container')
    const kpiActiveClaims = document.getElementById('kpi-active-claims')
    const kpiPipelineValue = document.getElementById('kpi-pipeline-value')
    const kpiConnectsSaved = document.getElementById('kpi-connects-saved')
    const kpiDollarsSaved = document.getElementById('kpi-dollars-saved')
    const searchInput = document.getElementById('lead-search') as HTMLInputElement | null
    const statusFilter = document.getElementById('lead-status-filter') as HTMLSelectElement | null
    const exportCsvBtn = document.getElementById('export-csv-btn')
    const exportJsonBtn = document.getElementById('export-json-btn')
    const refreshBtn = document.getElementById('refresh-pipeline-btn')

    if (!container) return

    let allActivities = await getTeamActivities()
    const collisionMetrics = await getTeamCollisionMetrics()

    const updateKpis = (activities: typeof allActivities) => {
      const active = activities.filter((a) => a.status === 'drafting' || a.status === 'applied')
      const totalPipelineUsd = activities.reduce((sum, a) => sum + (a.dealValueUsd ?? 500), 0)

      if (kpiActiveClaims) kpiActiveClaims.textContent = String(active.length)
      if (kpiPipelineValue) kpiPipelineValue.textContent = formatUsd(totalPipelineUsd)
      if (kpiConnectsSaved) kpiConnectsSaved.textContent = String(collisionMetrics.connectsSaved)
      if (kpiDollarsSaved) kpiDollarsSaved.textContent = formatUsd(collisionMetrics.dollarsSaved)
    }

    const renderLeads = () => {
      const filter = statusFilter?.value || 'all'
      const query = (searchInput?.value || '').toLowerCase().trim()

      const filtered = allActivities.filter((item) => {
        if (filter !== 'all' && item.status !== filter) return false
        if (query) {
          const matchTitle = item.jobTitle.toLowerCase().includes(query)
          const matchClient = (item.clientName || '').toLowerCase().includes(query)
          const matchMember = item.memberName.toLowerCase().includes(query)
          if (!matchTitle && !matchClient && !matchMember) return false
        }
        return true
      })

      updateKpis(allActivities)

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="rounded-xl border border-dashed border-edge/80 p-6 text-center text-xs text-mute">
            ${t('team_pipeline_empty', currentLang)}
          </div>`
        return
      }

      container.innerHTML = filtered
        .map((act) => {
          const isApplied = act.status === 'applied'
          const isDrafting = act.status === 'drafting'
          const isViewing = act.status === 'viewing'
          const statusBg = isApplied
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            : isDrafting
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : isViewing
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : 'bg-slate-700/40 border-slate-600 text-slate-400'

          const dealStr = formatUsd(act.dealValueUsd ?? 500)
          const timeStr = formatTimeAgo(act.updatedAt)

          return `
            <div class="rounded-xl border border-edge bg-raised/50 p-4 transition-all hover:border-brand-500/30">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <span class="rounded px-2 py-0.5 text-[10px] font-extrabold uppercase border ${statusBg}">
                    ${act.status}
                  </span>
                  <span class="text-xs font-bold text-emerald-400 font-mono">${dealStr}</span>
                </div>
                <div class="text-[11px] text-slate-400">
                  Claimed by <b class="text-slate-200">${escapeHtml(act.memberName)}</b> (${timeStr})
                </div>
              </div>

              <div class="text-sm font-bold text-white mb-1">
                ${
                  act.jobUrl
                    ? `<a href="${act.jobUrl}" target="_blank" class="hover:text-brand-400 hover:underline transition-colors">${escapeHtml(act.jobTitle)} ↗</a>`
                    : escapeHtml(act.jobTitle)
                }
              </div>

              <div class="text-xs text-mute flex flex-wrap items-center gap-3 mb-3">
                ${act.clientName ? `<span>Client: <b class="text-slate-300">${escapeHtml(act.clientName)}</b></span>` : ''}
                ${act.hireRatePct !== undefined && act.hireRatePct !== null ? `<span>Hire Rate: <b class="text-slate-300">${act.hireRatePct}%</b></span>` : ''}
                ${act.totalSpendUsd !== undefined && act.totalSpendUsd !== null ? `<span>Spend: <b class="text-slate-300">${formatUsd(act.totalSpendUsd)}</b></span>` : ''}
              </div>

              <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-edge/40">
                ${
                  act.status !== 'applied'
                    ? `<button type="button" data-act-applied="${act.jobId}" class="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold transition-all">
                        ✓ ${t('status_applied', currentLang)}
                      </button>`
                    : ''
                }
                <button type="button" data-act-release="${act.jobId}" class="rounded-lg border border-edge bg-raised hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition-all">
                  ✕ ${t('status_passed', currentLang)}
                </button>
                <button type="button" data-act-copy="${act.jobId}" class="rounded-lg border border-edge bg-raised hover:border-brand-500/40 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition-all">
                  📋 Copy Lead
                </button>
              </div>
            </div>`
        })
        .join('')

      container.querySelectorAll<HTMLButtonElement>('button[data-act-applied]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const jobId = btn.dataset.actApplied
          if (!jobId) return
          const existing = allActivities.find((a) => a.jobId === jobId)
          if (existing) {
            await claimJobForTeam({
              jobId: existing.jobId,
              jobTitle: existing.jobTitle,
              status: 'applied',
              jobUrl: existing.jobUrl,
              clientName: existing.clientName,
              dealValueUsd: existing.dealValueUsd,
              budget: existing.budget,
              hireRatePct: existing.hireRatePct,
              totalSpendUsd: existing.totalSpendUsd,
              paymentVerified: existing.paymentVerified
            })
            allActivities = await getTeamActivities()
            renderLeads()
          }
        })
      })

      container.querySelectorAll<HTMLButtonElement>('button[data-act-release]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const jobId = btn.dataset.actRelease
          if (!jobId) return
          await releaseJobClaim(jobId)
          allActivities = await getTeamActivities()
          renderLeads()
        })
      })

      container.querySelectorAll<HTMLButtonElement>('button[data-act-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const jobId = btn.dataset.actCopy
          if (!jobId) return
          const item = allActivities.find((a) => a.jobId === jobId)
          if (!item) return
          const summary = `Upwork Lead: ${item.jobTitle}\nValue: ${formatUsd(item.dealValueUsd ?? 500)}\nStatus: ${item.status}\nAssigned: ${item.memberName}\nURL: ${item.jobUrl || 'N/A'}`
          await navigator.clipboard.writeText(summary)
          btn.textContent = '✓ Copied!'
          setTimeout(() => {
            btn.textContent = '📋 Copy Lead'
          }, 1500)
        })
      })
    }

    searchInput?.addEventListener('input', renderLeads)
    statusFilter?.addEventListener('change', renderLeads)

    refreshBtn?.addEventListener('click', async () => {
      allActivities = await getTeamActivities()
      renderLeads()
    })

    exportCsvBtn?.addEventListener('click', () => {
      if (allActivities.length === 0) return
      const headers = ['Job ID', 'Job Title', 'Client Name', 'Deal Value USD', 'Status', 'Assigned BD', 'Member Email', 'Upwork URL', 'Updated At']
      const rows = allActivities.map((a) => [
        `"${a.jobId}"`,
        `"${(a.jobTitle || '').replace(/"/g, '""')}"`,
        `"${(a.clientName || 'Anonymous').replace(/"/g, '""')}"`,
        a.dealValueUsd ?? 500,
        `"${a.status}"`,
        `"${(a.memberName || '').replace(/"/g, '""')}"`,
        `"${a.memberEmail || ''}"`,
        `"${a.jobUrl || ''}"`,
        `"${new Date(a.updatedAt).toISOString()}"`
      ])
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `gigradar-agency-leads-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    })

    exportJsonBtn?.addEventListener('click', async () => {
      if (allActivities.length === 0) return
      await navigator.clipboard.writeText(JSON.stringify(allActivities, null, 2))
      if (exportJsonBtn) {
        exportJsonBtn.textContent = '✓ Copied JSON!'
        setTimeout(() => {
          exportJsonBtn.textContent = t('export_json_btn', currentLang)
        }, 1800)
      }
    })

    renderLeads()
  }

  async function initWebhookSettings(): Promise<void> {
    const slackInput = document.getElementById('slack-url') as HTMLInputElement | null
    const discordInput = document.getElementById('discord-url') as HTMLInputElement | null
    const customInput = document.getElementById('custom-url') as HTMLInputElement | null
    const notifyClaim = document.getElementById('notify-claim') as HTMLInputElement | null
    const notifyApplied = document.getElementById('notify-applied') as HTMLInputElement | null
    const notifyHighValue = document.getElementById('notify-high-value') as HTMLInputElement | null
    const notifyCollision = document.getElementById('notify-collision') as HTMLInputElement | null
    const thresholdInput = document.getElementById('high-value-threshold') as HTMLInputElement | null
    const saveBtn = document.getElementById('save-webhooks-btn')
    const statusEl = document.getElementById('webhook-save-status')

    const testSlackBtn = document.getElementById('test-slack-btn')
    const testDiscordBtn = document.getElementById('test-discord-btn')
    const testCustomBtn = document.getElementById('test-custom-btn')

    const cfg = await loadWebhookConfig()

    if (slackInput) slackInput.value = cfg.slackWebhookUrl || ''
    if (discordInput) discordInput.value = cfg.discordWebhookUrl || ''
    if (customInput) customInput.value = cfg.customWebhookUrl || ''
    if (notifyClaim) notifyClaim.checked = cfg.notifyOnClaim
    if (notifyApplied) notifyApplied.checked = cfg.notifyOnApplied
    if (notifyHighValue) notifyHighValue.checked = cfg.notifyOnHighValue
    if (notifyCollision) notifyCollision.checked = cfg.notifyOnCollision
    if (thresholdInput) thresholdInput.value = String(cfg.highValueThresholdUsd || 1000)

    saveBtn?.addEventListener('click', async () => {
      const slackUrl = slackInput?.value.trim() || ''
      const discordUrl = discordInput?.value.trim() || ''
      const customUrl = customInput?.value.trim() || ''

      // Request runtime host permissions for configured webhook endpoints via user click gesture
      await requestWebhookPermissions([slackUrl, discordUrl, customUrl])

      const updated: WebhookConfig = {
        slackWebhookUrl: slackUrl,
        discordWebhookUrl: discordUrl,
        customWebhookUrl: customUrl,
        notifyOnClaim: notifyClaim?.checked ?? true,
        notifyOnApplied: notifyApplied?.checked ?? true,
        notifyOnHighValue: notifyHighValue?.checked ?? true,
        notifyOnCollision: notifyCollision?.checked ?? true,
        highValueThresholdUsd: Number(thresholdInput?.value) || 1000
      }
      await saveWebhookConfig(updated)
      if (statusEl) {
        statusEl.textContent = t('webhook_saved', currentLang)
        setTimeout(() => {
          statusEl.textContent = ''
        }, 2200)
      }
    })

    const runTest = async (btn: HTMLElement | null, type: 'slack' | 'discord' | 'custom', input: HTMLInputElement | null) => {
      if (!btn || !input) return
      const url = input.value.trim()
      if (!url) {
        alert('Please enter a webhook URL first')
        return
      }
      await requestWebhookPermissions([url])
      const origText = btn.textContent
      btn.textContent = '⏳ Testing...'
      const res = await sendTestWebhook(type, url)
      btn.textContent = res.success ? '✓ Delivered!' : '✕ Failed'
      setTimeout(() => {
        btn.textContent = origText
      }, 2500)
    }

    testSlackBtn?.addEventListener('click', () => {
      void runTest(testSlackBtn, 'slack', slackInput)
    })
    testDiscordBtn?.addEventListener('click', () => {
      void runTest(testDiscordBtn, 'discord', discordInput)
    })
    testCustomBtn?.addEventListener('click', () => {
      void runTest(testCustomBtn, 'custom', customInput)
    })
  }

  initBidSimulator()
  void initLeadInbox()
  void initWebhookSettings()

  void loadVoiceSettings()
  void renderCaseStudies()

  void refreshAccount()
}

void initOptions()
