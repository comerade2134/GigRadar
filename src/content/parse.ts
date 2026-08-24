import { SELECTORS, queryAll, queryFirst, queryFirstText } from '../config/selectors'
import type { ActivityStats, ClientSignals, JobBudget, JobMeta, RatingSummary, TrueRateBenchmark } from '../types'

const EXCLUDED_SCOPE_SELECTOR =
  '[data-qa="sidebar"], [data-test="filters-sidebar"], [data-test="search-filters"], aside[class*="filter"]'

const SPEND_ELEMENT_SELECTOR = [
  '[data-qa="client-spend"]',
  '[data-test="total-spent"]',
  '[data-test="client-spend"]'
].join(', ')

const CLIENT_BLOCK_CHAIN = [
  '[data-qa="client-company-profile"]',
  '[data-test="client-stats"]',
  '.client-biography',
  '.air3-card-section:has(h2)',
  'section:has(h2)',
  '[data-qa="client-spend"]',
  '[data-test="client-info"]',
  '[class*="client-info"]',
  'aside'
]

function queryScopedFirstOf(
  root: HTMLElement,
  selectors: readonly string[]
): HTMLElement | null {
  for (const selector of selectors) {
    const hit = queryScoped(root, selector)
    if (hit) return hit
  }
  return null
}

function findClientBlock(scope: HTMLElement): HTMLElement | null {
  return queryScopedFirstOf(scope, CLIENT_BLOCK_CHAIN)
}

function findAboutClientBlock(scope: HTMLElement): HTMLElement | null {
  try {
    const headings = scope.querySelectorAll<HTMLElement>('h2, h3')
    for (const heading of Array.from(headings)) {
      if (!ABOUT_CLIENT_RE.test(heading.textContent ?? '')) continue
      const card =
        heading.closest<HTMLElement>('.up-card-section') ??
        heading.closest<HTMLElement>('section') ??
        heading.closest<HTMLElement>('[class*="up-card"]') ??
        heading.parentElement
      if (card && notInExcluded(card)) return card
    }

    // "About the client" is not always a real heading element — fall back to
    // any element whose direct text nodes carry the label.
    const candidates = scope.querySelectorAll<HTMLElement>('div, span, p')
    for (const el of Array.from(candidates)) {
      const ownText = Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' ')
        .trim()
      if (!ABOUT_CLIENT_RE.test(ownText)) continue
      const card =
        el.closest<HTMLElement>('.up-card-section') ??
        el.closest<HTMLElement>('section') ??
        el.parentElement
      if (card && notInExcluded(card)) return card
    }
  } catch {
    return null
  }
  return null
}

// Generic chains like 'section:has(h2)' can match the drawer's MAIN content
// columns (Attachment / Skills / Activity) before anything client-related —
// verify evidence before trusting a structural hit.
export function findClientBlockVerified(scope: HTMLElement): HTMLElement | null {
  const about = findAboutClientBlock(scope)
  if (about) return about
  const structural = findClientBlock(scope)
  return structural != null && hasClientEvidence(structural) ? structural : null
}

const FEEDBACK_SECTION_SELECTOR = [
  '[data-qa="client-job-history"]',
  '[class*="job-history"]',
  '[data-test="feedback-list"]',
  '[class*="air3-review"]',
  '[class*="feedback-list"]'
].join(', ')

const CLIENT_HISTORY_CHAIN = [
  '[data-qa="client-job-history"]',
  '[data-test="client-job-history"]',
  '[data-test="client-history"]',
  '[data-qa="client-company-profile"]',
  '[class*="about-client"]',
  '[class*="job-history"]'
]

function findClientHistory(scope: HTMLElement): HTMLElement | null {
  const direct = queryScopedFirstOf(scope, CLIENT_HISTORY_CHAIN)
  if (direct) return direct
  const parent = scope.parentElement
  if (parent && !parent.isSameNode(document.body)) {
    return queryScopedFirstOf(parent, CLIENT_HISTORY_CHAIN)
  }
  return null
}

const ABOUT_CLIENT_RE = /about the client/i
const STATS_EVIDENCE_RE = /\btotal\s+spent\b|\bhire\s+rate\b|\bpayment\s+verif|\bavg\s+hourly\s+rate\s+paid\b|\bof\s+\d+\s+reviews?\b/i
const CLIENT_EVIDENCE_SELECTOR = [
  '[data-qa="client-info"]',
  '[data-qa="client-company-profile"]',
  '[data-test="client-stats"]'
].join(', ')

export function hasClientEvidence(scope: HTMLElement): boolean {
  try {
    if (scope.querySelector(CLIENT_EVIDENCE_SELECTOR) != null) return true
  } catch {
    return false
  }

  const text = scope.innerText ?? ''
  if (ABOUT_CLIENT_RE.test(text) || STATS_EVIDENCE_RE.test(text)) return true

  const headings = scope.querySelectorAll<HTMLElement>('h2, h3')
  for (const heading of Array.from(headings)) {
    if (ABOUT_CLIENT_RE.test(heading.textContent ?? '')) return true
  }
  return false
}

// The drawer's client sidebar renders inside one of these shells depending on
// surface (search slider vs /jobs/ modal). Never trust a single guess — probe
// all three and prefer whichever actually carries client evidence.
const SLIDER_SCOPE_CHAIN = [
  '[role="dialog"]',
  '.air3-slider',
  '[data-qa="job-details"]',
  '[data-test*="jobdetails" i]',
  '[data-qa="job-details-modal"]',
  '.air3-slider-panel'
]

export function findActiveSliderScope(): HTMLElement | null {
  const candidates: HTMLElement[] = []
  for (const selector of SLIDER_SCOPE_CHAIN) {
    try {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        if (!el.isConnected || !isVisible(el) || !notInExcluded(el)) continue
        candidates.push(el)
      }
    } catch {
      continue
    }
  }
  return (
    candidates.find((el) => el !== undefined && hasClientEvidence(el)) ??
    candidates[0] ??
    null
  )
}

export function resolveDrawerTarget(preferred: HTMLElement): HTMLElement {
  if (hasClientEvidence(preferred)) return preferred
  const scope = findActiveSliderScope()
  return scope && scope !== preferred && hasClientEvidence(scope) ? scope : preferred
}

// Upwork renames its slider shell regularly — detect the OPEN drawer by
// scanning every known container shape, keeping only visible candidates that
// actually hold a job (heading or job anchor), then preferring the tightest
// one that carries client evidence. Falls back to URL heuristics last.
const DRAWER_CANDIDATE_CHAIN = [
  '[data-test="job-details-modal"]',
  '.air3-slider',
  'aside[aria-label="Job details"]',
  '[data-test*="jobdetails" i]',
  '[data-qa="job-details-modal"]',
  '.air3-slider-panel',
  '[role="dialog"][aria-label*="job" i]'
]

export function findOpenDrawer(): HTMLElement | null {
  const candidates: HTMLElement[] = []
  for (const selector of DRAWER_CANDIDATE_CHAIN) {
    try {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        if (!el.isConnected || !isVisible(el) || !notInExcluded(el)) continue
        if (!el.querySelector('h1, h2, a[href*="/jobs/"]')) continue
        candidates.push(el)
      }
    } catch {
      continue
    }
  }
  if (candidates.length > 0) {
    const withEvidence = candidates.filter((el) => hasClientEvidence(el))
    const pool = withEvidence.length > 0 ? withEvidence : candidates
    // Nested shells (slider wrapping modal) both qualify — take the tightest.
    return pool.reduce((best, el) => {
      const bestArea = best.getBoundingClientRect().width * best.getBoundingClientRect().height
      const elArea = el.getBoundingClientRect().width * el.getBoundingClientRect().height
      return elArea < bestArea ? el : best
    })
  }
  return findDrawerByStructure()
}

const DRAWER_LABEL_RE = /about the client/i

function elementOwnText(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ')
    .trim()
}

// The drawer shell is the smallest ancestor of the client sidebar that also
// holds the job heading or a job anchor — no class names required, survives
// any Upwork redesign.
function smallestSharedShell(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from.parentElement
  while (node && node !== document.body) {
    if (node.querySelector('h1, a[href*="/jobs/"]')) return node
    node = node.parentElement
  }
  return null
}

function findDrawerByStructure(): HTMLElement | null {
  if (!isDrawerRoute()) return null
  try {
    const labelCandidates = document.querySelectorAll<HTMLElement>('h2, h3, div, span, p')
    for (const el of Array.from(labelCandidates)) {
      if (!el.isConnected) continue
      if (!DRAWER_LABEL_RE.test(elementOwnText(el))) continue
      const shell = smallestSharedShell(el)
      if (shell && isVisible(shell) && notInExcluded(shell)) return shell
    }

    // Brand-new client: no "About the client" section yet. Climb from the job
    // heading to the first ancestor sized like a full-height slider panel.
    const heading = document.querySelector<HTMLElement>('h1')
    if (heading) {
      let node: HTMLElement | null = heading.parentElement
      while (node && node !== document.body) {
        const rect = node.getBoundingClientRect()
        if (rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.6) {
          return notInExcluded(node) ? node : null
        }
        node = node.parentElement
      }
    }
  } catch {
    return null
  }
  return null
}

export function isDrawerRoute(): boolean {
  return /\/(nx\/search\/)?jobs\/(details\/)?~/.test(window.location.pathname)
}

export interface DrawerClientWaiter {
  cancel(): void
}

export function waitForDrawerClient(
  container: HTMLElement,
  onReady: () => void,
  onGiveUp?: () => void,
  attempts = 5,
  intervalMs = 300
): DrawerClientWaiter {
  let done = false
  let tries = 0
  let timer: number | undefined
  let probeQueued = false
  let scopeObserver: MutationObserver | null = null

  const finish = (): void => {
    done = true
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timer = undefined
    }
    observer.disconnect()
    scopeObserver?.disconnect()
    scopeObserver = null
  }

  const evidenceSeen = (): boolean => {
    if (container.isConnected && document.body.contains(container)) {
      if (hasClientEvidence(container)) return true
    }
    const scope = findActiveSliderScope()
    return !!scope && hasClientEvidence(scope)
  }

  const probe = (): void => {
    probeQueued = false
    if (done) return

    const containerDead =
      !container.isConnected || !document.body.contains(container)
    const scope = findActiveSliderScope()
    if (containerDead && !scope) {
      finish()
      return
    }
    attachScopeWatcher(scope)

    if (evidenceSeen()) {
      finish()
      onReady()
      return
    }
    tries += 1
    if (tries >= attempts) {
      finish()
      onGiveUp?.()
      return
    }
    timer = window.setTimeout(tick, intervalMs)
  }

  const tick = (): void => probe()

  const scheduleProbe = (): void => {
    if (done || probeQueued) return
    probeQueued = true
    if (timer !== undefined) window.clearTimeout(timer)
    timer = window.setTimeout(probe, 60)
  }

  // The client sidebar may land inside a slider shell other than the node we
  // were handed — watch that shell's mutations too so convergence is instant.
  const attachScopeWatcher = (scope: HTMLElement | null): void => {
    if (!scope || scope === container || scopeObserver) return
    scopeObserver = new MutationObserver(scheduleProbe)
    try {
      scopeObserver.observe(scope, { childList: true, subtree: true })
    } catch {
      scopeObserver = null
    }
  }

  const observer = new MutationObserver(scheduleProbe)
  try {
    observer.observe(container, { childList: true, subtree: true })
  } catch {
    // container may already be detached — polling below still runs its course
  }

  timer = window.setTimeout(tick, 0)

  return {
    cancel(): void {
      finish()
    }
  }
}

const DETAIL_ROOT_CHAIN = [
  '[data-test="job-details-modal"]',
  '.air3-slider',
  'aside[aria-label="Job details"]',
  '[data-test="job-details"]',
  'main',
  '[role="main"]'
]

function notInExcluded(el: Element): boolean {
  return el.closest(EXCLUDED_SCOPE_SELECTOR) == null
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function queryScoped(root: HTMLElement, selector: string): HTMLElement | null {
  try {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      if (notInExcluded(el)) return el
    }
  } catch {
    return null
  }
  return null
}

export function parseMoney(text: string | null): number | null {
  if (!text) return null
  const cleaned = text.replace(/,/g, '')
  const match = /\$\s*([\d.]+)\s*(k|m)?\b/i.exec(cleaned)
  if (!match) return null
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return null
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') return Math.round(value * 1_000)
  if (suffix === 'm') return Math.round(value * 1_000_000)
  return Math.round(value)
}

export function parsePercent(text: string | null): number | null {
  if (!text) return null
  const match = /(\d+(?:\.\d+)?)\s*%/.exec(text)
  if (!match) return null
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return null
  return Math.min(Math.max(value, 0), 100)
}

export function parseProposalCount(text: string | null): number | null {
  if (!text) return null
  const range = /(\d+)\s*(?:to|-|–)\s*(\d+)/i.exec(text)
  if (range) return parseInt(range[2], 10)
  const plus = /(\d+)\s*\+/i.exec(text)
  if (plus) return parseInt(plus[1], 10)
  const plain = /(\d+)/.exec(text.replace(/,/g, ''))
  return plain ? parseInt(plain[1], 10) : null
}

const UNITS: Record<string, number> = {
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  week: 7,
  month: 30,
  year: 365
}

export function parseRelativeDays(text: string | null): number | null {
  if (!text) return null
  const lower = text.toLowerCase()
  if (lower.includes('just now') || lower.includes('today')) return 0
  if (lower.includes('yesterday')) return 1
  if (lower.includes('last week')) return 7
  if (lower.includes('last month')) return 30
  const match = new RegExp('(\\d+)\\s*\\+?\\s*(minute|hour|day|week|month|year)').exec(
    lower
  )
  if (!match) return null
  const n = parseInt(match[1], 10)
  const unitKey =
    Object.keys(UNITS).find((u) => match[2].startsWith(u.slice(0, 4))) ?? 'day'
  return Math.max(0, Math.round(n * UNITS[unitKey]))
}

export function normalizeJobId(id: string): string {
  const trimmed = (id ?? '').trim()
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? ''
  return withoutQuery.replace(/\/+$/, '').replace(/^~/, '')
}

export function extractJobId(url: string): string {
  try {
    const path = new URL(url).pathname
    const tilde = /~([0-9a-z]{8,})/i.exec(path)
    if (tilde) return normalizeJobId(tilde[1])
    const segment = path.split('/').filter(Boolean).pop()
    return normalizeJobId(segment ?? path)
  } catch {
    return normalizeJobId(url)
  }
}

export function matchHireRate(text: string): number | null {
  const patterns: RegExp[] = [
    /(\d+(?:\.\d+)?)\s*%\s*hire\s*rate/i,
    /hire\s*rate[^%\n]{0,24}(\d+(?:\.\d+)?)\s*%/i
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      return Math.min(Math.max(parseFloat(match[1]), 0), 100)
    }
  }
  return null
}

export function extractAvgHourlyPaid(text: string): number | null {
  const match =
    /\$\s*(\d[\d.]*)\s*\/\s*hr\s+avg\s+hourly\s+rate\s+paid/i.exec(text) ??
    /\$\s*(\d[\d.]*)\s+avg\s+hourly\s+rate\s+paid/i.exec(text)
  if (!match) return null
  const value = parseFloat(match[1])
  return Number.isNaN(value) || value <= 0 ? null : Math.round(value * 100) / 100
}

export function extractRatingSummary(text: string): RatingSummary | null {
  const match = /(\d(?:\.\d+)?)\s*of\s*(\d+)\s+reviews?/i.exec(text)
  if (!match) return null
  const avg = parseFloat(match[1])
  const count = parseInt(match[2], 10)
  if (Number.isNaN(avg) || Number.isNaN(count) || count <= 0) return null
  return { avg, count }
}

function labeledSpend(text: string): number | null {
  const patterns: RegExp[] = [
    /\$\s*([\d,]+(?:\.\d+)?[kKmM]?)\s*total\s+spent/i,
    /(\$[\d,.]+[km]?)\s+total\s+spent/i,
    /(?:total\s+spent|total\s+spend|lifetime\s+spent)[^\d$]{0,20}\$\s?([\d.,]+)\s?(k|m)?\b/i,
    /\$\s?([\d.,]+)\s?(k|m)?\b[^$\n]{0,16}\bspent\b/i
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const value = parseMoney(match[0])
      // "$0 spent" is explicit, meaningful data — keep it, only reject junk.
      if (value != null && value >= 0 && /\d/.test(match[0])) return value
    }
  }
  return null
}

export function extractClientSpend(scope: HTMLElement): number | null {
  const spendEl = queryScoped(scope, SPEND_ELEMENT_SELECTOR)
  if (spendEl) {
    const direct = parseMoney(spendEl.innerText)
    if (direct != null && direct > 0) return direct
    const labeled = labeledSpend(spendEl.innerText ?? '')
    if (labeled != null) return labeled
  }

  const clientBlock = findClientBlock(scope)
  if (clientBlock) {
    const labeled = labeledSpend(clientBlock.innerText ?? '')
    if (labeled != null) return labeled
  }

  return labeledSpend(scope.innerText ?? '')
}

export function detectPaymentVerified(root: ParentNode): boolean | null {
  const badge = root.querySelector<HTMLElement>(
    SELECTORS.paymentVerified.join(', ')
  )
  if (badge) {
    const label = `${badge.getAttribute('aria-label') ?? ''} ${badge.textContent ?? ''}`
      .toLowerCase()
      .trim()
    if (label.includes('unverified')) return false
    if (label.includes('verif')) return true
  }

  if (!(root instanceof HTMLElement)) return null
  const lowered = (root.innerText ?? '').toLowerCase()
  if (lowered.includes('payment method not verified') || lowered.includes('payment unverified')) {
    return false
  }
  if (lowered.includes('payment verified') || lowered.includes('payment method verified')) {
    return true
  }

  const icons = root.querySelectorAll('svg[aria-label], [role="img"][aria-label]')
  for (const icon of Array.from(icons)) {
    const label = (icon.getAttribute('aria-label') ?? '').toLowerCase().trim()
    if (!label) continue
    if (label.includes('unverified')) return false
    if (label.includes('verified')) return true
  }
  return null
}

export function collectFeedbacks(root: HTMLElement): string[] {
  const section = queryScoped(root, FEEDBACK_SECTION_SELECTOR)
  if (!section) return []

  const texts = new Set<string>()
  const items = queryAll(section, SELECTORS.feedbackItem)

  if (items.length > 0) {
    for (const item of items) {
      const text = item.textContent?.trim() ?? ''
      if (text.length > 8) texts.add(text)
    }
    return [...texts]
  }

  const lines = (section.innerText ?? '').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 12) texts.add(trimmed)
  }
  return [...texts]
}

const ACTIVITY_HEADING = /^activity on this job/i
const ACTIVITY_WINDOW_LINES = 14

function countFromPool(pool: readonly string[], label: RegExp): number | null {
  for (let i = 0; i < pool.length; i++) {
    if (!label.test(pool[i])) continue
    const inline = /(\d[\d,]*)/.exec(pool[i].replace(label, '').trim())
    if (inline) return parseInt(inline[1].replace(/,/g, ''), 10)
    const next = pool[i + 1]
    if (next && /^\d[\d,]*$/.test(next.trim())) {
      return parseInt(next.trim().replace(/,/g, ''), 10)
    }
  }
  return null
}

export function extractActivityStats(scope: HTMLElement): ActivityStats | null {
  const lines = (scope.innerText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const headingIdx = lines.findIndex((line) => ACTIVITY_HEADING.test(line))
  if (headingIdx < 0) return null

  const pool = lines.slice(headingIdx + 1, headingIdx + ACTIVITY_WINDOW_LINES)
  const proposalLine = pool.find((line) => /\bproposals?\b/i.test(line))

  const stats: ActivityStats = {
    proposalsCount: proposalLine ? parseProposalCount(proposalLine) : null,
    interviewingCount: countFromPool(pool, /^interview/i),
    invitesSentCount: countFromPool(pool, /^invites?\s+sent\b/i),
    unansweredInvitesCount: countFromPool(pool, /^unanswered\s+invites?\b/i)
  }

  const hasAny =
    stats.proposalsCount != null ||
    stats.interviewingCount != null ||
    stats.invitesSentCount != null ||
    stats.unansweredInvitesCount != null
  return hasAny ? stats : null
}

export function parseJobBudget(scope: HTMLElement): JobBudget | null {
  const text = scope.innerText ?? ''
  if (!text.includes('$')) return null

  const rangeHourly =
    /\$\s*([\d.,]+)\s*[-–—]\s*\$\s*([\d.,]+)[^\n$]{0,24}(?:\/\s*hr|hourly|per hour)/i.exec(
      text
    )
  if (rangeHourly) {
    const minUsd = parseMoney(`$${rangeHourly[1]}`)
    const maxUsd = parseMoney(`$${rangeHourly[2]}`)
    if (minUsd != null && maxUsd != null && maxUsd >= minUsd) {
      return { type: 'hourly', minUsd, maxUsd }
    }
  }

  const singleHourly =
    /\$\s*([\d.,]+)(?:\s*[-–—]\s*\$\s*[\d.,]+)?\s*(?:\/\s*hr|per\s+hour|hourly)/i.exec(text)
  if (singleHourly) {
    const value = parseMoney(`$${singleHourly[1]}`)
    if (value != null && value > 0) return { type: 'hourly', minUsd: value, maxUsd: value }
  }

  const fixedPatterns: RegExp[] = [
    /\$\s*([\d.,]+)[^\n$]{0,30}\bfixed[\s-]*price\b/i,
    /\bfixed[\s-]*price\b[^\n$]{0,30}\$\s*([\d.,]+)/i,
    /(?:budget|payout)[^\n$]{0,20}\$\s*([\d.,]+)/i
  ]
  for (const pattern of fixedPatterns) {
    const match = pattern.exec(text)
    if (match) {
      const value = parseMoney(`$${match[1]}`)
      if (value != null && value > 0) return { type: 'fixed', minUsd: value, maxUsd: value }
    }
  }
  return null
}

function parseRateFigure(raw: string): number | null {
  const value = parseFloat(raw.replace(/,/g, ''))
  return Number.isNaN(value) || value <= 0 ? null : value
}

function extractRatesFromItem(itemText: string): {
  hourly: number | null
  fixed: number | null
} {
  const hourlyMatch = /\$\s*([\d.,]+)\s*\/?\s*(?:hr|hour)\b/i.exec(itemText)
  if (hourlyMatch) {
    return { hourly: parseRateFigure(hourlyMatch[1]), fixed: null }
  }
  const fixedMatch =
    /\$\s*([\d.,]+)[^\n$]{0,26}\bfixed\b/i.exec(itemText) ??
    /\bfixed(?:[\s-]*price)?\b[^\n$]{0,26}\$\s*([\d.,]+)/i.exec(itemText)
  if (fixedMatch) {
    return { hourly: null, fixed: parseRateFigure(fixedMatch[1]) }
  }
  return { hourly: null, fixed: null }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function computeTrueRate(scope: HTMLElement): TrueRateBenchmark | null {
  const items = queryAll(scope, SELECTORS.feedbackItem).filter((item) =>
    (item.textContent ?? '').includes('$')
  )

  let hourlyRates: number[] = []
  let fixedPayouts: number[] = []

  if (items.length > 0) {
    for (const item of items) {
      const { hourly, fixed } = extractRatesFromItem(item.textContent ?? '')
      if (hourly != null) hourlyRates.push(hourly)
      if (fixed != null) fixedPayouts.push(fixed)
    }
  } else {
    const skipLine = /\b(budget|hourly rate|posted|estimated)\b/i
    const lines = (scope.innerText ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((line) => line.includes('$') && !skipLine.test(line))
    for (const line of lines) {
      const { hourly, fixed } = extractRatesFromItem(line)
      if (hourly != null) hourlyRates.push(hourly)
      if (fixed != null) fixedPayouts.push(fixed)
    }
  }

  hourlyRates = [...new Set(hourlyRates)]
  fixedPayouts = [...new Set(fixedPayouts)]

  const medianHourlyUsd = median(hourlyRates)
  const avgFixedUsd =
    fixedPayouts.length > 0
      ? fixedPayouts.reduce((sum, v) => sum + v, 0) / fixedPayouts.length
      : null

  if (medianHourlyUsd == null && avgFixedUsd == null) return null

  return {
    medianHourlyUsd: medianHourlyUsd != null ? Math.round(medianHourlyUsd * 100) / 100 : null,
    avgFixedUsd: avgFixedUsd != null ? Math.round(avgFixedUsd * 100) / 100 : null,
    sampleCount: hourlyRates.length + fixedPayouts.length
  }
}

function daysFromTimeEl(el: HTMLTimeElement): number | null {  const iso = el.getAttribute('datetime')
  if (iso) {
    const ms = Date.parse(iso)
    if (!Number.isNaN(ms)) {
      return Math.round((Date.now() - ms) / 86_400_000)
    }
  }
  return parseRelativeDays(el.getAttribute('aria-label') ?? el.textContent)
}

export function latestFeedbackDays(root: HTMLElement): number | null {
  const times = Array.from(root.querySelectorAll<HTMLTimeElement>('time'))
  let minDays: number | null = null
  for (const el of times) {
    const inFeedback =
      !!el.closest('[data-qa="client-job-history"]') ||
      !!el.closest('[class*="feedback"]') ||
      !!el.closest('[class*="review"]')
    if (!inFeedback) continue
    const days = daysFromTimeEl(el)
    if (days == null || days < 0 || days > 3650) continue
    minDays = minDays == null ? days : Math.min(minDays, days)
  }
  return minDays
}

export interface CardParseResult {
  meta: JobMeta
  signals: ClientSignals
  activity: ActivityStats | null
  budget: JobBudget | null
  trueRate: TrueRateBenchmark | null
  rating: RatingSummary | null
}

export function parseCardProfile(card: HTMLElement): CardParseResult | null {
  if (!notInExcluded(card)) return null

  const titleLink = queryFirst(card, SELECTORS.titleLink)
  const title = titleLink?.textContent?.trim()
  if (!titleLink || !title) return null

  const href =
    titleLink instanceof HTMLAnchorElement
      ? titleLink.href
      : (titleLink.querySelector('a') as HTMLAnchorElement | null)?.href ?? ''

  const descriptionSnippet =
    queryFirstText(card, SELECTORS.jobDescription)?.slice(0, 400) ?? ''

  const signals: ClientSignals = {
    hireRatePct: parsePercent(queryFirstText(card, SELECTORS.hireRate)),
    totalSpendUsd: extractClientSpend(card),
    paymentVerified: detectPaymentVerified(card),
    daysSinceLastHire: null
  }

  const meta: JobMeta = {
    jobId: extractJobId(href) || title.slice(0, 48),
    title,
    url: href,
    proposalCount: parseProposalCount(queryFirstText(card, SELECTORS.proposals)),
    postedText: queryFirstText(card, SELECTORS.postedTime),
    descriptionSnippet,
    feedbacks: []
  }

  return { meta, signals, activity: null, budget: null, trueRate: null, rating: null }
}

export function parseDrawerProfile(drawer: HTMLElement): CardParseResult | null {
  if (!drawer.isConnected || !notInExcluded(drawer)) return null

  const titleEl =
    queryScoped(drawer, 'h1') ??
    queryScoped(drawer, 'h2') ??
    queryFirst(drawer, SELECTORS.titleLink)
  const title = titleEl?.textContent?.trim() ?? ''

  const anchor = drawer.querySelector<HTMLAnchorElement>('a[href*="/jobs/"]')
  const href = anchor?.href ?? window.location.href

  const clientBlock = findClientBlockVerified(drawer)
  const historyBlock = findClientHistory(drawer)
  const signalSource = clientBlock ?? drawer
  const sourceText = signalSource.innerText ?? ''
  const drawerText = drawer.innerText ?? ''
  const hireSource = [historyBlock?.innerText ?? '', sourceText, drawerText].join('\n')

  const signals: ClientSignals = {
    hireRatePct: matchHireRate(hireSource),
    totalSpendUsd: extractClientSpend(drawer),
    paymentVerified:
      detectPaymentVerified(historyBlock ?? signalSource) ??
      detectPaymentVerified(drawer),
    daysSinceLastHire: latestFeedbackDays(drawer)
  }

  const meta: JobMeta = {
    jobId: extractJobId(href),
    title: title || 'Upwork job',
    url: href,
    proposalCount: parseProposalCount(
      /[^\n]*\bproposals?\b[^\n]*/i.exec(drawerText)?.[0] ?? null
    ),
    postedText:
      /^[^\n]*posted[^\n]*$/im.exec(drawerText)?.[0]?.trim().slice(0, 60) ?? null,
    descriptionSnippet: (
      queryScoped(drawer, '[data-test="job-description"], p')?.textContent ?? ''
    )
      .trim()
      .slice(0, 400),
    feedbacks: collectFeedbacks(drawer)
  }

  let trueRate = historyBlock ? computeTrueRate(historyBlock) : null
  const avgHourlyPaid = extractAvgHourlyPaid(`${sourceText}\n${drawerText}`)
  if (avgHourlyPaid != null) {
    trueRate = trueRate
      ? { ...trueRate, medianHourlyUsd: trueRate.medianHourlyUsd ?? avgHourlyPaid }
      : { medianHourlyUsd: avgHourlyPaid, avgFixedUsd: null, sampleCount: 0 }
  }

  const rating =
    extractRatingSummary(`${historyBlock?.innerText ?? ''}\n${sourceText}`) ??
    extractRatingSummary(drawerText)

  return {
    meta,
    signals,
    activity: extractActivityStats(drawer),
    budget: parseJobBudget(drawer),
    trueRate,
    rating
  }
}

export interface DetailEnrichment {
  signalsPatch: Partial<ClientSignals>
  feedbacks: string[]
  activity?: ActivityStats | null
  budget?: JobBudget | null
  trueRate?: TrueRateBenchmark | null
  rating?: RatingSummary | null
}

export function parseContainerEnrichment(
  container: HTMLElement
): DetailEnrichment | null {
  if (!container.isConnected || !notInExcluded(container)) return null

  const clientBlock = findClientBlockVerified(container)
  const source = clientBlock ?? container
  const sourceText = source.innerText ?? ''

  const patch: Partial<ClientSignals> = {}

  const hireRate = matchHireRate(sourceText)
  if (hireRate != null) patch.hireRatePct = hireRate

  const spend = extractClientSpend(container)
  if (spend != null) patch.totalSpendUsd = spend

  const verified =
    detectPaymentVerified(source) ?? detectPaymentVerified(container)
  if (verified !== null) patch.paymentVerified = verified

  const feedbacks = collectFeedbacks(container)

  const recentDays = latestFeedbackDays(container)
  if (recentDays != null) patch.daysSinceLastHire = recentDays

  let trueRate = computeTrueRate(container)
  const avgHourlyPaid = extractAvgHourlyPaid(sourceText)
  if (avgHourlyPaid != null) {
    trueRate = trueRate
      ? { ...trueRate, medianHourlyUsd: trueRate.medianHourlyUsd ?? avgHourlyPaid }
      : { medianHourlyUsd: avgHourlyPaid, avgFixedUsd: null, sampleCount: 0 }
  }

  return {
    signalsPatch: patch,
    feedbacks,
    activity: extractActivityStats(container),
    budget: parseJobBudget(container),
    trueRate,
    rating: extractRatingSummary(sourceText)
  }
}

export function findJobDetailsContainer(): HTMLElement | null {
  for (const selector of DETAIL_ROOT_CHAIN) {
    try {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        if (!notInExcluded(el) || !el.isConnected || !isVisible(el)) continue
        if (!el.querySelector('h1')) continue
        return el
      }
    } catch {
      continue
    }
  }
  return null
}
