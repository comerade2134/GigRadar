import { SELECTORS, queryAll, queryFirst } from '../config/selectors'
import { computeRedFlags, feedAlert, scoreClient } from '../engine/scoring'
import { addConnectsSaved, CONNECTS_PER_SKIP } from '../engine/metrics'
import { extractClientName } from '../engine/name-extractor'
import { scanScamSignals } from '../engine/red-flags'
import { analyzeSentiment } from '../engine/sentiment'
import {
  extractJobId,
  findJobDetailsContainer,
  parseCardProfile,
  parseContainerEnrichment,
  parseDrawerProfile,
  parseProposalCount
} from './parse'
import type { CardParseResult } from './parse'
import { mountBadge } from './badge'
import { mountInlineCard, openDetailModal } from './modal'
import type {
  ActivityStats,
  ClientSignals,
  EnrichmentData,
  JobMeta,
  TrueRateBenchmark
} from '../types'

const DETAIL_TRIGGER_ID = 'gigradar-detail-trigger'

const skipSeen = new WeakSet<HTMLElement>()
const skipCounted = new WeakSet<HTMLElement>()
let skipObserver: IntersectionObserver | null = null

function ensureSkipObserver(): void {
  if (skipObserver) return
  skipObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        if (entry.isIntersecting) {
          skipSeen.add(el)
          continue
        }
        if (skipSeen.has(el) && !skipCounted.has(el)) {
          skipCounted.add(el)
          void addConnectsSaved(CONNECTS_PER_SKIP)
        }
      }
    },
    { threshold: 0.6 }
  )
}

const SIDEBAR_CHAIN = [
  '[data-qa="client-company-profile"]',
  '.client-biography',
  '[data-test="client-info"]',
  '[class*="client-info"]',
  '[class*="client-bio"]',
  '[class*="job-details"] aside section',
  'aside section[class*="client"]'
]

let activeData: EnrichmentData | null = null
let lastAutoOpenedJobId: string | null = null
let currentDrawerKey: string | null = null

function isJobDetailPage(): boolean {
  return /\/jobs\//.test(window.location.pathname)
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    window.getComputedStyle(el).visibility !== 'hidden'
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function debounce(fn: () => void, waitMs: number): () => void {
  let timer: number | undefined
  return () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(fn, waitMs)
  }
}

function truncate(value: string, max = 26): string {
  const clean = value.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function firstVisible(chain: readonly string[]): HTMLElement | null {
  for (const el of queryAll(document.body, chain)) {
    if (isVisible(el)) return el
  }
  return null
}

function pickTrueRate(
  current: TrueRateBenchmark | null | undefined,
  incoming: TrueRateBenchmark | null | undefined
): TrueRateBenchmark | null {
  if (!current) return incoming ?? null
  if (!incoming) return current
  return incoming.sampleCount >= current.sampleCount ? incoming : current
}

const INTEL_CACHE_PREFIX = 'gigradar:intel:'
let lastCachedJobId: string | null = null
let cacheWriteCount = 0

async function pruneIntelCache(): Promise<void> {
  try {
    const all = await chrome.storage.local.get(null)
    const cutoff = Date.now() - 7 * 86_400_000
    const stale = Object.entries(all).filter(([key, value]) => {
      if (!key.startsWith(INTEL_CACHE_PREFIX)) return false
      const savedAt = (value as { savedAt?: number } | null)?.savedAt
      return typeof savedAt !== 'number' || savedAt < cutoff
    })
    if (stale.length > 0) {
      await chrome.storage.local.remove(stale.map(([key]) => key))
    }
  } catch {
    return
  }
}

async function saveIntelCache(data: EnrichmentData): Promise<void> {
  const jobId = data.meta.jobId
  if (!jobId || jobId === lastCachedJobId) return
  lastCachedJobId = jobId

  try {
    await chrome.storage.local.set({
      [`${INTEL_CACHE_PREFIX}${jobId}`]: {
        title: data.meta.title,
        url: data.meta.url,
        description: data.meta.descriptionSnippet,
        clientName: data.nameGuess?.name ?? null,
        savedAt: Date.now()
      }
    })
    cacheWriteCount += 1
    if (cacheWriteCount % 25 === 0) await pruneIntelCache()
  } catch {
    return
  }
}

function buildEnrichment(parsed: CardParseResult): EnrichmentData {
  const signals: ClientSignals = { ...parsed.signals }
  let activity = parsed.activity
  let budget = parsed.budget
  let trueRate: TrueRateBenchmark | null = parsed.trueRate
  let feedbacks = parsed.meta.feedbacks
  let scamHaystack = `${parsed.meta.title}\n${parsed.meta.descriptionSnippet}`

  if (isJobDetailPage()) {
    const container = findJobDetailsContainer()
    const detail = container ? parseContainerEnrichment(container) : null
    if (detail) {
      Object.assign(signals, detail.signalsPatch)
      if (detail.feedbacks.length > 0) feedbacks = detail.feedbacks
      activity = detail.activity ?? activity
      budget = detail.budget ?? budget
      trueRate = pickTrueRate(trueRate, detail.trueRate)
      scamHaystack = `${container?.innerText ?? ''}\n${scamHaystack}`
    }
  }

  const scam = scanScamSignals(scamHaystack)
  const sentiment = analyzeSentiment(feedbacks)
  const score = scoreClient(signals)
  const flags = computeRedFlags({
    signals,
    proposalCount: parsed.meta.proposalCount,
    activity,
    budget,
    trueRate,
    sentiment,
    scamMatched: scam.matched
  })

  return {
    meta: { ...parsed.meta, feedbacks },
    signals,
    score,
    flags,
    nameGuess: extractClientName(feedbacks),
    activity,
    budget,
    trueRate,
    sentiment
  }
}

function setActive(data: EnrichmentData): void {
  activeData = data
  refreshTrigger()
  void saveIntelCache(data)
}

function scanFeed(): void {
  const cards = queryAll(document.body, SELECTORS.jobCard)
  for (const card of cards) {
    if (!card.isConnected || card.querySelector('[data-gigradar-badge]')) continue

    const parsed = parseCardProfile(card)
    if (!parsed) continue

    const signals = parsed.signals
    const hasVisibleData =
      signals.hireRatePct != null ||
      signals.totalSpendUsd != null ||
      signals.paymentVerified != null

    const scam = scanScamSignals(
      `${parsed.meta.title}\n${parsed.meta.descriptionSnippet}`
    )
    const preview = hasVisibleData ? scoreClient(signals) : null
    const previewFlags = computeRedFlags({
      signals,
      proposalCount: parsed.meta.proposalCount,
      scamMatched: scam.matched
    })
    const alert = feedAlert(signals, parsed.meta.proposalCount, scam.matched)

    const host = mountBadge(
      card,
      {
        score: preview?.score ?? null,
        tier: preview?.tier ?? null,
        flagCount: previewFlags.length,
        alert
      },
      () => {
        const fresh = parseCardProfile(card) ?? parsed
        openDetailModal(buildEnrichment(fresh))
      }
    )

    if (previewFlags.length > 0) {
      ensureSkipObserver()
      skipObserver!.observe(host)
    }
  }
}

function drawerKey(drawer: HTMLElement): string {
  const anchor =
    drawer.querySelector<HTMLAnchorElement>('a[href*="/jobs/"]') ?? null
  if (anchor) return extractJobId(anchor.href)
  const title =
    drawer.querySelector('h1')?.textContent ??
    drawer.querySelector('h2')?.textContent ??
    ''
  return title.trim().slice(0, 64)
}

async function findSidebarWithRetry(attempts = 8): Promise<HTMLElement | null> {
  for (let i = 0; i < attempts; i++) {
    const sidebar = firstVisible(SIDEBAR_CHAIN)
    if (sidebar) return sidebar
    await delay(300)
  }
  return null
}

const SIGNAL_KEYS = [
  'hireRatePct',
  'totalSpendUsd',
  'paymentVerified',
  'daysSinceLastHire'
] as const

let lazyTimer: number | undefined
let refreshTarget: HTMLElement | null = null

function signalsFingerprint(signals: ClientSignals): string {
  return SIGNAL_KEYS.map((key) => String(signals[key] ?? '·')).join('|')
}

const ACTIVITY_KEYS = [
  'proposalsCount',
  'interviewingCount',
  'invitesSentCount',
  'unansweredInvitesCount'
] as const

function activityFingerprint(activity: ActivityStats | null | undefined): string {
  if (!activity) return '∅'
  return ACTIVITY_KEYS.map((key) => String(activity[key] ?? '·')).join('|')
}

function enrichmentFingerprint(data: EnrichmentData): string {
  return [
    signalsFingerprint(data.signals),
    data.meta.feedbacks.length,
    activityFingerprint(data.activity),
    data.trueRate?.sampleCount ?? -1,
    data.flags.map((flag) => flag.text).join('§')
  ].join('#')
}

function stopLazyRefresh(): void {
  if (lazyTimer !== undefined) {
    window.clearTimeout(lazyTimer)
    lazyTimer = undefined
  }
  refreshTarget = null
}

function startLazyRefresh(container: HTMLElement): void {
  stopLazyRefresh()
  refreshTarget = container
  let attempts = 0

  const tick = (): void => {
    lazyTimer = undefined
    const target = refreshTarget
    if (!target || !target.isConnected || !document.body.contains(target)) {
      stopLazyRefresh()
      return
    }

    const parsed = parseDrawerProfile(target)
    if (parsed && activeData && parsed.meta.jobId === activeData.meta.jobId) {
      const merged: ClientSignals = { ...activeData.signals }
      const patch = parsed.signals
      const writable = merged as Record<(typeof SIGNAL_KEYS)[number], number | boolean>
      for (const key of SIGNAL_KEYS) {
        const value = patch[key]
        if (value != null) writable[key] = value
      }

      const mergedActivity: ActivityStats = {
        ...(activeData.activity ?? {
          proposalsCount: null,
          interviewingCount: null,
          invitesSentCount: null,
          unansweredInvitesCount: null
        })
      }
      const activityPatch = parsed.activity ?? activeData.activity
      if (activityPatch) {
        const writableActivity = mergedActivity as Record<
          (typeof ACTIVITY_KEYS)[number],
          number | null
        >
        for (const key of ACTIVITY_KEYS) {
          const value = activityPatch[key]
          if (value != null) writableActivity[key] = value
        }
      }
      const hasActivityValues = Object.values(mergedActivity).some((v) => v != null)

      const feedbacks = Array.from(
        new Set([...activeData.meta.feedbacks, ...parsed.meta.feedbacks])
      )
      const proposalCount =
        parsed.meta.proposalCount ?? activeData.meta.proposalCount
      const budget = parsed.budget ?? activeData.budget ?? null
      const trueRate = pickTrueRate(activeData.trueRate, parsed.trueRate)
      const scam = scanScamSignals(target.innerText ?? '')
      const sentiment = analyzeSentiment(feedbacks)

      const before = enrichmentFingerprint(activeData)
      const candidateFlags = computeRedFlags({
        signals: merged,
        proposalCount,
        activity: hasActivityValues ? mergedActivity : null,
        budget,
        trueRate,
        sentiment,
        scamMatched: scam.matched
      })

      const after = [
        signalsFingerprint(merged),
        feedbacks.length,
        activityFingerprint(hasActivityValues ? mergedActivity : null),
        trueRate?.sampleCount ?? -1,
        candidateFlags.map((flag) => flag.text).join('§')
      ].join('#')

      if (after !== before) {
        const refreshed: EnrichmentData = {
          meta: { ...activeData.meta, proposalCount, feedbacks },
          signals: merged,
          score: scoreClient(merged),
          flags: candidateFlags,
          nameGuess: extractClientName(feedbacks),
          activity: hasActivityValues ? mergedActivity : null,
          budget,
          trueRate,
          sentiment
        }
        setActive(refreshed)

        if (document.querySelector('[data-gigradar-modal]') != null) {
          openDetailModal({ ...refreshed }, { docked: true })
        }
        const inlineHost = document.querySelector<HTMLElement>('[data-gigradar-inline]')
        if (inlineHost?.parentElement?.isConnected) {
          mountInlineCard(
            inlineHost.parentElement,
            { ...refreshed },
            () => openDetailModal({ ...refreshed }, {})
          )
        }
      }
    }

    attempts += 1
    if (attempts < 12) {
      lazyTimer = window.setTimeout(tick, 900)
    } else {
      stopLazyRefresh()
    }
  }

  lazyTimer = window.setTimeout(tick, 1100)
}

function handleNativeDrawer(drawer: HTMLElement): void {  const parsed = parseDrawerProfile(drawer)

  let data: EnrichmentData | null = null
  if (parsed) {
    data = buildEnrichment(parsed)
  } else if (activeData) {
    data = activeData
  }
  if (!data) return

  setActive(data)

  void (async () => {
    const sidebar = await findSidebarWithRetry()
    if (!drawer.isConnected || !document.body.contains(drawer)) return

    if (sidebar) {
      mountInlineCard(sidebar, data!, () =>
        openDetailModal({ ...data! }, {})
      )
    } else {
      openDetailModal({ ...data! }, { docked: true })
    }
  })()

  startLazyRefresh(drawer)
}

function scanForDrawer(): void {
  const drawer = queryFirst(document.body, SELECTORS.jobDrawer)

  if (!drawer || !isConnectedVisible(drawer)) {
    currentDrawerKey = null
    stopLazyRefresh()
    return
  }

  const key = drawerKey(drawer)
  if (key !== currentDrawerKey) {
    currentDrawerKey = key
    handleNativeDrawer(drawer)
    return
  }

  const inlineMissing = !document.querySelector('[data-gigradar-inline]')
  const dockedMissing = document.querySelector('[data-gigradar-modal]') == null
  if (inlineMissing && dockedMissing && activeData) {
    const sidebar = firstVisible(SIDEBAR_CHAIN)
    if (sidebar) {
      mountInlineCard(sidebar, activeData, () =>
        openDetailModal({ ...activeData! }, {})
      )
    }
  }
}

function isConnectedVisible(el: HTMLElement): boolean {
  return el.isConnected && isVisible(el)
}

function openFromDetailPage(): void {
  const container = findJobDetailsContainer()

  if (!container) {
    if (activeData) openDetailModal({ ...activeData }, { docked: true })
    return
  }

  const detail = parseContainerEnrichment(container) ?? {
    signalsPatch: {},
    feedbacks: []
  }
  const containerText = container.innerText ?? ''
  const proposalsLine = /[^\n]*\bproposals?\b[^\n]*/i.exec(containerText)?.[0]
  const postedLine = /^[^\n]*posted[^\n]*$/im.exec(containerText)?.[0]

  const descriptionEl =
    container.querySelector<HTMLElement>('[data-test="job-description"]') ??
    container.querySelector<HTMLElement>('.job-description')

  const signals: ClientSignals = {
    hireRatePct: null,
    totalSpendUsd: null,
    paymentVerified: null,
    daysSinceLastHire: null,
    ...detail.signalsPatch
  }

  const scam = scanScamSignals(
    `${containerText}\n${(descriptionEl?.textContent ?? '').slice(0, 2000)}`
  )
  const sentiment = analyzeSentiment(detail.feedbacks)

  const meta: JobMeta = {
    jobId: extractJobId(window.location.href),
    title:
      container.querySelector('h1')?.textContent?.trim() ||
      document.title ||
      'Upwork job',
    url: window.location.href,
    proposalCount: parseProposalCount(proposalsLine ?? null),
    postedText: postedLine ? postedLine.trim().slice(0, 60) : null,
    descriptionSnippet: (descriptionEl?.textContent ?? '').trim().slice(0, 400),
    feedbacks: detail.feedbacks
  }

  const score = scoreClient(signals)
  const flags = computeRedFlags({
    signals,
    proposalCount: meta.proposalCount,
    activity: detail.activity,
    budget: detail.budget,
    trueRate: detail.trueRate,
    sentiment,
    scamMatched: scam.matched
  })
  const data: EnrichmentData = {
    meta,
    signals,
    score,
    flags,
    nameGuess: null,
    activity: detail.activity,
    budget: detail.budget,
    trueRate: detail.trueRate,
    sentiment
  }

  setActive(data)
  openDetailModal(data, { docked: true })
  startLazyRefresh(container)
}

async function handleDetailRoute(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    if (document.querySelector('h1')) break
    await delay(400)
  }

  const jobId = extractJobId(window.location.href)
  if (lastAutoOpenedJobId === jobId) {
    openFromDetailPage()
    return
  }

  lastAutoOpenedJobId = jobId
  openFromDetailPage()
}

function ensureTrigger(): HTMLElement {
  let trigger = document.getElementById(DETAIL_TRIGGER_ID)

  if (!trigger) {
    trigger = document.createElement('div')
    trigger.id = DETAIL_TRIGGER_ID
    trigger.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483645',
      'display:none',
      'align-items:center',
      'gap:8px',
      'max-width:min(340px,60vw)',
      'padding:10px 16px',
      'border-radius:12px',
      'background:rgba(13,15,18,.96)',
      'border:1px solid rgba(16,185,129,.35)',
      'color:#F3F4F6',
      'font-family:Inter,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'font-size:12.5px',
      'cursor:pointer',
      'box-shadow:0 6px 22px rgba(0,0,0,.45), 0 0 18px rgba(16,185,129,.15), inset 0 1px 0 rgba(255,255,255,.06)',
      'transition:transform .12s ease, box-shadow .16s ease'
    ].join(';')
    trigger.innerHTML = `
      <span style="background:linear-gradient(90deg,#34D399,#10B981);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;flex:none">GigRadar Intel</span>
      <span data-gr-title style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9CA3AF;font-weight:600"></span>`
    trigger.addEventListener('mouseenter', () => {
      trigger!.style.transform = 'translateY(-1px)'
      trigger!.style.boxShadow =
        '0 10px 30px rgba(0,0,0,.55), 0 0 26px rgba(16,185,129,.28)'
    })
    trigger.addEventListener('mouseleave', () => {
      trigger!.style.transform = 'translateY(0)'
      trigger!.style.boxShadow =
        '0 6px 22px rgba(0,0,0,.45), 0 0 18px rgba(16,185,129,.15)'
    })
    trigger.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (activeData) openDetailModal({ ...activeData }, { docked: true })
      else openFromDetailPage()
    })
    document.body.appendChild(trigger)
  }

  return trigger
}

function refreshTrigger(): void {
  const shouldShow = !!activeData || isJobDetailPage()

  if (!shouldShow) {
    document.getElementById(DETAIL_TRIGGER_ID)?.remove()
    return
  }

  const trigger = ensureTrigger()
  trigger.style.display = 'flex'

  const titleSpan = trigger.querySelector('[data-gr-title]')
  if (titleSpan) {
    const label =
      activeData?.meta.title ??
      findJobDetailsContainer()?.querySelector('h1')?.textContent ??
      ''
    titleSpan.textContent = label ? truncate(label) : ''
  }
}

function installTitlePassthrough(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      const anchor = target.closest(
        'h2 a[href*="/jobs/"], a.up-n-link[href*="/jobs/"], ' +
          SELECTORS.titleLink.join(', ')
      ) as HTMLAnchorElement | null
      if (!anchor) return

      const card = anchor.closest(
        SELECTORS.jobCard.join(', ')
      ) as HTMLElement | null
      if (!card) return

      const parsed = parseCardProfile(card)
      if (!parsed) return

      setActive(buildEnrichment(parsed))
    },
    true
  )
}

function patchHistory(): void {
  const emit = (): void => {
    window.setTimeout(onUrlChange, 0)
  }

  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method]
    Object.defineProperty(history, method, {
      value: function (
        this: History,
        data: unknown,
        unused: string,
        url?: string | URL | null
      ) {
        original.call(this, data as History['state'], unused, url)
        emit()
      },
      configurable: true,
      writable: true
    })
  }
  window.addEventListener('popstate', emit)
}

function onUrlChange(): void {
  scheduledScan()
  if (/\/jobs\/~/.test(window.location.pathname)) {
    void handleDetailRoute()
  }
}

function runScan(): void {
  try {
    scanFeed()
  } catch {
    window.setTimeout(scanFeed, 1500)
  }
  try {
    scanForDrawer()
  } catch {
    window.setTimeout(scanForDrawer, 1500)
  }
  try {
    refreshTrigger()
  } catch {
    window.setTimeout(refreshTrigger, 1500)
  }
}

const scheduledScan = debounce(runScan, 250)

const observer = new MutationObserver(scheduledScan)

function start(): void {
  patchHistory()
  installTitlePassthrough()
  observer.observe(document.body, { childList: true, subtree: true })
  runScan()
  onUrlChange()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
