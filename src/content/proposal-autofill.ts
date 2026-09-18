import { SELECTORS, queryAll, queryFirst } from '../config/selectors'
import { extensionContextValid } from '../context'
import { normalizeJobId } from './parse'
import {
  detectTags,
  generateHookVariants,
  SKILL_LABELS,
  type HookVariant
} from '../engine/templates'
import {
  checkTeamCollision,
  claimJobForTeam,
  formatTimeAgo
} from '../cloud/team-tracker'
import { getAccountTier } from '../cloud/account'
import { generateAutopilotProposal } from '../autopilot/autopilot-engine'
import { matchCaseStudiesForJob } from '../autopilot/case-studies'
import { calculateBidIntelligence, estimateDealValue } from '../engine/bid-intelligence'
import type { IntelCacheEntry } from '../engine/intel-cache'
import type { JobBudget } from '../types'
import { getLanguage, t } from '../i18n'

const INTEL_CACHE_PREFIX = 'gigradar:intel:'
const INTEL_TTL_MS = 7 * 86_400_000
const TOOLBAR_ID = 'gigradar-autofill-toolbar'

function extractJobIdFromUrl(): string {
  try {
    const tilde = /~([0-9a-z]{8,})/i.exec(window.location.pathname)
    if (tilde) return normalizeJobId(tilde[1])
    return normalizeJobId(
      window.location.pathname.split('/').filter(Boolean).pop() ?? ''
    )
  } catch {
    return ''
  }
}

async function loadIntelCache(jobId: string): Promise<IntelCacheEntry | null> {
  if (!jobId || !extensionContextValid()) return null
  try {
    const key = `${INTEL_CACHE_PREFIX}${jobId}`
    const result = await chrome.storage.local.get(key)
    const entry = result[key] as IntelCacheEntry | undefined
    if (!entry || typeof entry.title !== 'string' || entry.title.length === 0) return null
    if (Date.now() - (entry.savedAt ?? 0) > INTEL_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

function scrapeProposalContext(): { title: string; description: string } {
  const heading =
    document.querySelector('h1') ??
    document.querySelector('[data-test="job-title"]') ??
    document.querySelector('h2')
  const descriptionEl =
    document.querySelector<HTMLElement>('[data-test="job-description"]') ??
    document.querySelector<HTMLElement>('[class*="job-description"]')
  return {
    title: heading?.textContent?.trim().slice(0, 200) || 'Upwork job',
    description: (descriptionEl?.textContent ?? '').trim().slice(0, 1200)
  }
}

function setNativeValue(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function draftScreeningAnswer(
  question: string,
  jobTitle: string,
  jobDescription: string
): string {
  const cleanQuestion = question.trim().replace(/\s+/g, ' ')
  const topic =
    cleanQuestion.length > 90 ? `${cleanQuestion.slice(0, 89)}…` : cleanQuestion
  const tags = detectTags(jobTitle, `${jobTitle} ${jobDescription} ${cleanQuestion}`)
  const skill = SKILL_LABELS[tags[0] ?? 'web']
  return (
    `Regarding "${topic}" — I've worked extensively on ${skill}, and this maps directly to how I would approach your project. ` +
    `I can walk you through relevant specifics on a quick call, start immediately, and keep you updated daily.`
  )
}

const TOOLBAR_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .bar {
    display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
    margin: 8px 0;
    padding: 9px 12px;
    border-radius: 12px;
    background: #0D0F12;
    border: 1px solid rgba(16,185,129,.35);
    box-shadow: 0 4px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
    font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    width: max-content; max-width: 100%;
  }
  .brand {
    font-weight: 800; font-size: 10.5px; letter-spacing: .04em;
    background: linear-gradient(90deg, #34D399, #10B981);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    margin-right: 2px;
  }
  button {
    font-family: inherit;
    border-radius: 9px; cursor: pointer;
    transition: all .14s ease;
  }
  .autopilot {
    padding: 8px 15px;
    border: 1px solid rgba(129,140,248,.5);
    background: linear-gradient(180deg, #6366F1, #4338CA);
    color: #FFFFFF;
    font-size: 12px; font-weight: 800;
    box-shadow: 0 3px 12px rgba(99,102,241,.32), inset 0 1px 0 rgba(255,255,255,.2);
  }
  .autopilot:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .autopilot:active { transform: scale(.97); }
  .fill {
    padding: 8px 15px;
    border: none;
    background: linear-gradient(180deg, #34D399, #059669);
    color: #0D0F12;
    font-size: 12px; font-weight: 800;
    box-shadow: 0 3px 12px rgba(16,185,129,.28), inset 0 1px 0 rgba(255,255,255,.2);
  }
  .fill:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .fill:active { transform: scale(.97); }
  .variant {
    padding: 6px 11px;
    border: 1px solid #262C37;
    background: #161A22;
    color: #E5E7EB;
    font-size: 11px; font-weight: 700;
  }
  .variant:hover { background: #1D222C; border-color: #3A4250; }
  .status { font-size: 11px; font-weight: 700; color: #6EE7B7; }
`

const QUESTION_BTN_STYLES = [
  'display:inline-flex;align-items:center;gap:5px',
  'margin:4px 0 6px;padding:5px 11px',
  'border-radius:999px;border:1px solid rgba(16,185,129,.45)',
  'background:rgba(16,185,129,.09);color:#34D399',
  'font-family:Inter,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  'font-size:11px;font-weight:800;cursor:pointer',
  'transition:all .14s ease'
].join(';')

let hookCache: HookVariant[] = []

async function resolveHooks(): Promise<{
  hooks: HookVariant[]
  context: { title: string; description: string }
}> {
  const jobId = extractJobIdFromUrl()
  const cached = await loadIntelCache(jobId)
  const fallback = scrapeProposalContext()
  const context = cached
    ? {
        title: cached.title,
        description: cached.description || fallback.description
      }
    : fallback
  const clientName = cached?.clientName ?? null
  return {
    hooks: generateHookVariants({
      jobId: jobId || context.title,
      title: context.title,
      description: context.description,
      clientName
    }),
    context
  }
}

function findCoverLetter(): HTMLTextAreaElement | null {
  const el = queryFirst(document.body, SELECTORS.coverLetter)
  if (el instanceof HTMLTextAreaElement) return el
  return document.querySelector<HTMLTextAreaElement>(
    'form textarea:not([id*="question" i])'
  )
}

function fillCoverLetter(hook: HookVariant, statusEl: HTMLElement | null): void {
  const textarea = findCoverLetter()
  if (!textarea) {
    if (statusEl) statusEl.textContent = 'Cover letter field not found'
    return
  }
  setNativeValue(textarea, hook.text)
  textarea.focus()
  if (statusEl) {
    statusEl.textContent = `Option ${hook.label} filled ✓`
    window.setTimeout(() => {
      statusEl.textContent = ''
    }, 2200)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const COLLISION_BANNER_ID = 'gigradar-team-collision-banner'

async function checkAndMountCollisionBanner(target: HTMLElement): Promise<void> {
  const jobId = extractJobIdFromUrl()
  if (!jobId || !extensionContextValid()) return

  const tier = await getAccountTier()
  const collision = await checkTeamCollision(jobId)

  // If agency tier and unassigned, auto-claim as drafting
  if (tier === 'agency' && !collision.isClaimed) {
    const ctx = scrapeProposalContext()
    const budget = scrapeProposalBudget()
    const dealValueUsd = estimateDealValue(budget)
    await claimJobForTeam({
      jobId,
      jobTitle: ctx.title,
      status: 'drafting',
      jobUrl: window.location.href,
      budget,
      dealValueUsd
    })
  }

  // If collision exists with another teammate
  if (collision.isClaimed && !collision.isCurrentMember) {
    if (document.getElementById(COLLISION_BANNER_ID)) return

    const host = document.createElement('div')
    host.id = COLLISION_BANNER_ID
    const shadow = host.attachShadow({ mode: 'closed' })

    const style = document.createElement('style')
    style.textContent = `
      :host { all: initial; display: block; width: 100%; margin: 12px 0 16px; }
      * { box-sizing: border-box; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .box {
        padding: 14px 18px;
        border-radius: 12px;
        background: rgba(225, 29, 72, 0.12);
        border: 1px solid rgba(244, 63, 94, 0.6);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 18px rgba(244, 63, 94, 0.2);
        color: #F3F4F6;
      }
      .head {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 13px; font-weight: 800; color: #FECDD3; margin-bottom: 6px;
      }
      .desc {
        font-size: 12px; line-height: 1.5; color: #E2E8F0; margin-bottom: 12px;
      }
      .desc b { color: #FFFFFF; font-weight: 700; }
      .btns { display: flex; gap: 8px; flex-wrap: wrap; }
      .btn {
        padding: 7px 14px; border-radius: 8px; font-size: 11.5px; font-weight: 700;
        cursor: pointer; border: none; transition: all 0.15s ease;
      }
      .btn-takeover {
        background: #8B5CF6; color: #FFFFFF;
      }
      .btn-takeover:hover { background: #7C3AED; }
      .btn-applied {
        background: #10B981; color: #07090C; font-weight: 800;
      }
      .btn-applied:hover { background: #059669; color: #FFFFFF; }
    `

    const act = collision.activity!
    const timeAgo = formatTimeAgo(act.updatedAt)
    const box = document.createElement('div')
    box.className = 'box'
    box.innerHTML = `
      <div class="head">
        <span>🛑 TEAM COLLISION WARNING</span>
        <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(244,63,94,0.25);border:1px solid rgba(244,63,94,0.5);">${act.status.toUpperCase()}</span>
      </div>
      <div class="desc">
        Teammate <b>${escapeHtml(act.memberName)}</b> is already <b>${escapeHtml(act.status)}</b> on this job (${escapeHtml(timeAgo)}).
        Submitting this proposal will burn 12–16 Connects ($1.80–$2.40) and send duplicate agency proposals.
      </div>
      <div class="btns">
        <button type="button" id="gr-takeover-btn" class="btn btn-takeover">⚡ Take Over (Claim Drafting)</button>
        <button type="button" id="gr-mark-applied-btn" class="btn btn-applied">✅ Mark as Applied</button>
      </div>
    `

    box.querySelector('#gr-takeover-btn')?.addEventListener('click', async () => {
      const ctx = scrapeProposalContext()
      const budget = scrapeProposalBudget()
      const dealValueUsd = estimateDealValue(budget)
      await claimJobForTeam({
        jobId,
        jobTitle: ctx.title,
        status: 'drafting',
        jobUrl: window.location.href,
        budget,
        dealValueUsd
      })
      host.remove()
    })

    box.querySelector('#gr-mark-applied-btn')?.addEventListener('click', async () => {
      const ctx = scrapeProposalContext()
      const budget = scrapeProposalBudget()
      const dealValueUsd = estimateDealValue(budget)
      await claimJobForTeam({
        jobId,
        jobTitle: ctx.title,
        status: 'applied',
        jobUrl: window.location.href,
        budget,
        dealValueUsd
      })
      host.remove()
    })

    shadow.append(style, box)
    target.insertAdjacentElement('beforebegin', host)
  }
}

const BID_INTEL_CARD_ID = 'gigradar-bid-intelligence-card'

function scrapeProposalBudget(): JobBudget | null {
  try {
    const text = document.body.innerText
    const hourlyMatch =
      /\$([0-9.]+)\s*-\s*\$([0-9.]+)\s*\/hr/i.exec(text) ||
      /\$([0-9.]+)\s*\/hr/i.exec(text)
    if (hourlyMatch) {
      const min = parseFloat(hourlyMatch[1])
      const max = hourlyMatch[2] ? parseFloat(hourlyMatch[2]) : min
      return { type: 'hourly', minUsd: min, maxUsd: max }
    }
    const fixedMatch =
      /(?:budget|fixed[- ]price)[:\s]*\$([0-9,]+)/i.exec(text) ||
      /\$([0-9,]+)\s*(?:fixed[- ]price|budget)/i.exec(text)
    if (fixedMatch) {
      const amount = parseFloat(fixedMatch[1].replace(/,/g, ''))
      return { type: 'fixed', minUsd: amount, maxUsd: amount }
    }
  } catch {
    // ignore
  }
  return null
}

function scrapeProposalCount(): number | null {
  try {
    const text = document.body.innerText
    const match =
      /proposals:\s*([0-9]+)\s*to\s*([0-9]+)/i.exec(text) ||
      /([0-9]+)\+?\s*proposals/i.exec(text)
    if (match) {
      return parseInt(match[2] || match[1], 10)
    }
  } catch {
    // ignore
  }
  return null
}

function findUpworkBoostInput(): HTMLInputElement | null {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      'input[type="number"], input[type="text"], input'
    )
  )
  for (const input of inputs) {
    const name = (input.getAttribute('name') ?? '').toLowerCase()
    const aria = (input.getAttribute('aria-label') ?? '').toLowerCase()
    const testId = (input.getAttribute('data-test') ?? '').toLowerCase()
    const qa = (input.getAttribute('data-qa') ?? '').toLowerCase()
    const placeholder = (input.getAttribute('placeholder') ?? '').toLowerCase()
    if (
      name.includes('boost') ||
      name.includes('bid') ||
      aria.includes('boost') ||
      aria.includes('bid') ||
      testId.includes('boost') ||
      testId.includes('bid') ||
      qa.includes('boost') ||
      qa.includes('bid') ||
      placeholder.includes('bid')
    ) {
      return input
    }
  }
  return null
}

function applyBoostBidNative(amount: number): boolean {
  const input = findUpworkBoostInput()
  if (!input) return false
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set
  if (setter) setter.call(input, String(amount))
  else input.value = String(amount)

  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.focus()
  return true
}

async function checkAndMountBidIntelligenceCard(
  target: HTMLElement
): Promise<void> {
  if (document.getElementById(BID_INTEL_CARD_ID)) return

  const jobId = extractJobIdFromUrl()
  const cached = await loadIntelCache(jobId)
  const locale = await getLanguage()

  const budget = cached?.budget || scrapeProposalBudget()
  const proposalCount = cached?.proposalCount || scrapeProposalCount()
  const hireRate = cached?.hireRatePct ?? null
  const paymentVerified = cached?.paymentVerified ?? null
  const totalSpend = cached?.totalSpendUsd ?? null

  const intel = calculateBidIntelligence({
    budget,
    clientHireRatePct: hireRate,
    clientPaymentVerified: paymentVerified,
    clientTotalSpendUsd: totalSpend,
    proposalCount
  })

  const host = document.createElement('div')
  host.id = BID_INTEL_CARD_ID
  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; display: block; width: 100%; margin: 10px 0 16px; }
    * { box-sizing: border-box; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .card {
      border-radius: 14px;
      background: #0B0E14;
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      padding: 14px 16px;
      color: #E2E8F0;
    }
    .top-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
      color: #818CF8; display: flex; align-items: center; gap: 6px;
    }
    .badge {
      font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px;
      text-transform: uppercase; letter-spacing: .04em; border: 1px solid;
    }
    .badge-tactical { background: rgba(99, 102, 241, 0.2); color: #A5B4FC; border-color: rgba(99, 102, 241, 0.4); }
    .badge-aggressive { background: rgba(245, 158, 11, 0.2); color: #FCD34D; border-color: rgba(245, 158, 11, 0.4); }
    .badge-organic { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; border-color: rgba(16, 185, 129, 0.4); }
    .badge-skip { background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border-color: rgba(239, 68, 68, 0.4); }

    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;
      margin-bottom: 12px;
    }
    .tile {
      background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px; padding: 8px 10px;
    }
    .tile-lbl { font-size: 9.5px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
    .tile-val { font-size: 15px; font-weight: 900; margin-top: 2px; font-family: ui-monospace, monospace; }
    .tile-val small { font-size: 10px; font-weight: 600; color: #94A3B8; }

    .text-emerald { color: #34D399; }
    .text-brand { color: #60A5FA; }
    .text-indigo { color: #A5B4FC; }
    .text-amber { color: #FBBF24; }

    .verdict {
      font-size: 11.5px; line-height: 1.45; color: #CBD5E1;
      background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;
    }

    .curve-row {
      display: flex; gap: 4px; align-items: flex-end; height: 48px; margin-bottom: 12px;
      padding: 0 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .bar-col {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
      height: 100%; position: relative; cursor: pointer;
    }
    .bar-col:hover .bar-fill { filter: brightness(1.25); }
    .bar-fill {
      width: 100%; border-radius: 3px 3px 0 0; background: #374151;
      transition: height 0.2s ease, background-color 0.2s ease;
    }
    .bar-fill.active { background: #6366F1; box-shadow: 0 0 8px rgba(99, 102, 241, 0.6); }
    .bar-fill.organic { background: #10B981; }
    .bar-lbl { font-size: 8px; color: #64748B; margin-top: 3px; font-family: ui-monospace, monospace; }

    .actions-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .apply-btn {
      padding: 8px 16px; border-radius: 9px; font-size: 12px; font-weight: 800; cursor: pointer;
      border: 1px solid rgba(129, 140, 248, 0.6);
      background: linear-gradient(180deg, #6366F1, #4338CA);
      color: #FFFFFF; box-shadow: 0 3px 12px rgba(99, 102, 241, 0.35);
      transition: all 0.14s ease;
    }
    .apply-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .apply-btn:active { transform: scale(0.97); }
    .organic-badge {
      font-size: 11.5px; font-weight: 700; color: #34D399;
      display: flex; align-items: center; gap: 5px;
    }
    .status-msg { font-size: 11px; font-weight: 700; color: #34D399; }
  `

  const badgeClass =
    intel.strategy === 'AGGRESSIVE_TOP_SLOT'
      ? 'badge-aggressive'
      : intel.strategy === 'TACTICAL_BOOST'
        ? 'badge-tactical'
        : intel.strategy === 'ORGANIC_SWEET_SPOT'
          ? 'badge-organic'
          : 'badge-skip'

  const strategyKey =
    intel.strategy === 'AGGRESSIVE_TOP_SLOT'
      ? 'bid_strategy_aggressive'
      : intel.strategy === 'TACTICAL_BOOST'
        ? 'bid_strategy_tactical'
        : intel.strategy === 'ORGANIC_SWEET_SPOT'
          ? 'bid_strategy_organic'
          : 'bid_strategy_skip'

  const maxProb = Math.max(...intel.curve.map((p) => p.winProbabilityPct), 1)

  const curveBarsHtml = intel.curve
    .map((p) => {
      const heightPct = Math.max(
        8,
        Math.round((p.winProbabilityPct / maxProb) * 100)
      )
      const isRec = p.bidConnects === intel.recommendedBid
      const isOrg = p.bidConnects === 0
      const cls = isRec ? 'active' : isOrg ? 'organic' : ''
      return `
        <div class="bar-col" title="${p.bidConnects} Connects: ${p.winProbabilityPct}% win, +$${p.expectedValueUsd} EV">
          <div class="bar-fill ${cls}" style="height:${heightPct}%"></div>
          <span class="bar-lbl">${p.bidConnects}c</span>
        </div>`
    })
    .join('')

  const card = document.createElement('div')
  card.className = 'card'
  card.innerHTML = `
    <div class="top-bar">
      <div class="brand-title">
        <span>⚡ ${t('bid_intel_title', locale)}</span>
      </div>
      <span class="badge ${badgeClass}">${t(strategyKey, locale)}</span>
    </div>

    <div class="stats-grid">
      <div class="tile">
        <div class="tile-lbl">${t('win_probability_label', locale)}</div>
        <div class="tile-val text-emerald">${intel.winProbabilityPct}% <small>(${intel.organicWinProbabilityPct}% org)</small></div>
      </div>
      <div class="tile">
        <div class="tile-lbl">${t('expected_value_label', locale)}</div>
        <div class="tile-val text-brand">+${intel.expectedValueUsd > 0 ? '$' : ''}${intel.expectedValueUsd.toFixed(0)}</div>
      </div>
      <div class="tile">
        <div class="tile-lbl">${t('optimal_bid_label', locale)}</div>
        <div class="tile-val text-indigo">${intel.recommendedBid}c <small>($${intel.connectsCostUsd.toFixed(2)})</small></div>
      </div>
      <div class="tile">
        <div class="tile-lbl">${t('expected_roi_label', locale)}</div>
        <div class="tile-val text-amber">${intel.roiRatio}x <small>(BE ${intel.breakEvenWinRatePct}%)</small></div>
      </div>
    </div>

    <div class="verdict">${escapeHtml(intel.verdictSummary)}</div>

    <div class="curve-row">
      ${curveBarsHtml}
    </div>

    <div class="actions-bar">
      ${
        intel.recommendedBid > 0
          ? `<button type="button" id="gr-apply-bid-btn" class="apply-btn">
              ${t('apply_optimal_bid_btn', locale)} (${intel.recommendedBid} Connects)
             </button>`
          : `<div class="organic-badge">
              🛡️ ${t('bid_strategy_organic', locale)}: 0 Connects
             </div>`
      }
      <span id="gr-bid-status" class="status-msg"></span>
    </div>
  `

  card.querySelector('#gr-apply-bid-btn')?.addEventListener('click', () => {
    const ok = applyBoostBidNative(intel.recommendedBid)
    const statusEl = card.querySelector<HTMLElement>('#gr-bid-status')
    if (statusEl) {
      statusEl.textContent = ok
        ? t('optimal_bid_applied', locale)
        : 'Could not find Upwork bid field'
      setTimeout(() => {
        statusEl.textContent = ''
      }, 2500)
    }
  })

  shadow.append(style, card)
  target.insertAdjacentElement('beforebegin', host)
}

function mountToolbar(textarea: HTMLTextAreaElement): void {
  if (document.getElementById(TOOLBAR_ID)) return

  const host = document.createElement('div')
  host.id = TOOLBAR_ID
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = TOOLBAR_STYLES

  const bar = document.createElement('div')
  bar.className = 'bar'

  const brand = document.createElement('span')
  brand.className = 'brand'
  brand.textContent = 'GigRadar'

  const autopilotBtn = document.createElement('button')
  autopilotBtn.type = 'button'
  autopilotBtn.className = 'autopilot'
  autopilotBtn.textContent = '🚀 Auto-Fill Full Proposal'

  const fillBtn = document.createElement('button')
  fillBtn.type = 'button'
  fillBtn.className = 'fill'
  fillBtn.textContent = '⚡ Quick Hook'

  const statusEl = document.createElement('span')
  statusEl.className = 'status'

  bar.append(brand, autopilotBtn, fillBtn)

  autopilotBtn.addEventListener('click', async (event) => {
    event.preventDefault()
    event.stopPropagation()
    autopilotBtn.disabled = true
    const prevLabel = autopilotBtn.textContent
    autopilotBtn.textContent = 'Generating…'
    statusEl.textContent = 'Matching case studies…'

    try {
      const jobId = extractJobIdFromUrl()
      const cached = await loadIntelCache(jobId)
      const fallback = scrapeProposalContext()
      const title = cached?.title || fallback.title
      const description = cached?.description || fallback.description
      const clientName = cached?.clientName ?? null

      const match = await matchCaseStudiesForJob({
        title,
        description
      })

      const proposal = await generateAutopilotProposal({
        jobMeta: {
          jobId: jobId || 'upwork-job',
          title,
          descriptionSnippet: description
        },
        clientName,
        caseStudy: match.matched
      })

      setNativeValue(textarea, proposal.fullText)
      textarea.focus()
      const studyInfo = proposal.matchedCaseStudyTitle ? ` [Study: ${proposal.matchedCaseStudyTitle.slice(0, 30)}…]` : ''
      statusEl.textContent = `✓ Full Proposal Injected!${studyInfo}`
      window.setTimeout(() => {
        statusEl.textContent = ''
      }, 4000)
    } catch {
      statusEl.textContent = 'Generation failed'
    } finally {
      autopilotBtn.disabled = false
      autopilotBtn.textContent = prevLabel
    }
  })

  fillBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (hookCache.length === 0) {
      const context = scrapeProposalContext()
      hookCache = generateHookVariants({
        jobId: extractJobIdFromUrl() || context.title,
        title: context.title,
        description: context.description,
        clientName: null
      })
    }
    fillCoverLetter(hookCache[0], statusEl)
  })

  void (async () => {
    const { hooks } = await resolveHooks()
    hookCache = hooks
    for (const hook of hooks) {
      const variantBtn = document.createElement('button')
      variantBtn.type = 'button'
      variantBtn.className = 'variant'
      variantBtn.textContent = `${hook.label}`
      variantBtn.title = `${hook.style} — ${hook.text.slice(0, 80)}…`
      variantBtn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        fillCoverLetter(hook, statusEl)
      })
      bar.appendChild(variantBtn)
    }
  })()

  bar.appendChild(statusEl)
  shadow.append(style, bar)

  const anchorBlock =
    textarea.closest('[data-test="cover-letter-section"]') ??
    textarea.closest('form') ??
    textarea.parentElement
  anchorBlock?.insertAdjacentElement('beforebegin', host)
}

function decorateScreeningQuestions(): void {
  const containers = queryAll(document.body, SELECTORS.screeningQuestion)
  const { title, description } = scrapeProposalContext()

  for (const container of containers) {
    if (container.querySelector('[data-gigradar-answer-btn]')) continue
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) continue

    const labelNode =
      container.querySelector<HTMLElement>('label, h3, h4, [data-test="question-label"]') ??
      container.firstElementChild as HTMLElement | null
    const questionText =
      labelNode?.textContent?.trim() ||
      container.textContent?.trim().slice(0, 160) ||
      'this question'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.gigradarAnswerBtn = ''
    btn.setAttribute('style', QUESTION_BTN_STYLES)
    btn.textContent = '✨ Auto-Draft Answer'
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      setNativeValue(textarea, draftScreeningAnswer(questionText, title, description))
      btn.textContent = '✓ Drafted'
      window.setTimeout(() => {
        btn.textContent = '✨ Auto-Draft Answer'
      }, 1800)
    })

    if (labelNode && labelNode.parentElement === container) {
      labelNode.insertAdjacentElement('afterend', btn)
    } else {
      textarea.insertAdjacentElement('beforebegin', btn)
    }
  }
}

export function isProposalPage(): boolean {
  return /\/(nx|ab)\/proposals\/job\//.test(window.location.pathname)
}

export function scanProposalPage(): void {
  scan()
}

function scan(): void {
  if (!extensionContextValid()) {
    observer.disconnect()
    return
  }
  if (!isProposalPage()) return
  const textarea = findCoverLetter()
  if (textarea && isVisible(textarea)) {
    mountToolbar(textarea)
    const anchor =
      (textarea.closest('[data-test="cover-letter-section"]') ??
      textarea.closest('form') ??
      textarea.parentElement) as HTMLElement | null
    if (anchor) {
      void checkAndMountCollisionBanner(anchor)
      void checkAndMountBidIntelligenceCard(anchor)
    }
  }
  decorateScreeningQuestions()
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function debounce(fn: () => void, waitMs: number): () => void {
  let timer: number | undefined
  return () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(fn, waitMs)
  }
}

const scheduledScan = debounce(scan, 400)
const observer = new MutationObserver(scheduledScan)

function start(): void {
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
  let lastUrl = window.location.href
  window.setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      document.getElementById(TOOLBAR_ID)?.remove()
      document.getElementById(COLLISION_BANNER_ID)?.remove()
      document.getElementById(BID_INTEL_CARD_ID)?.remove()
      scheduledScan()
    }
  }, 800)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
