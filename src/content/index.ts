import { SELECTORS, queryAll } from '../config/selectors'
import { extensionContextValid } from '../context'
import { computeRedFlags, feedAlert, scoreClient } from '../engine/scoring'
import { addConnectsSaved, CONNECTS_PER_SKIP } from '../engine/metrics'
import { extractClientName } from '../engine/name-extractor'
import { scanScamSignals } from '../engine/red-flags'
import { analyzeSentiment } from '../engine/sentiment'
import { resolveCurrentIntel } from '../engine/active-intel'
import { mergeIntelCacheEntry, type IntelCacheEntry } from '../engine/intel-cache'
import { buildClientDossier } from '../engine/client-dossier'
import {
  extractJobId,
  findClientBlockVerified,
  findJobDetailsContainer,
  findOpenDrawer,
  isDrawerRoute,
  isInvalidJobTitle,
  parseCardProfile,
  parseContainerEnrichment,
  parseDrawerProfile,
  parseProposalCount,
  normalizeJobId,
  resolveDrawerTarget,
  waitForDrawerClient,
  type DrawerClientWaiter
} from './parse'
import type { CardParseResult } from './parse'
import { mountBadge, type TeamAlertInfo } from './badge'
import {
  closeDetailModal,
  isDetailModalOpen,
  mountInlineCard,
  openDetailModal
} from './modal'
import type {
  ActivityStats,
  ClientSignals,
  EnrichmentData,
  JobMeta,
  TeamJobActivity,
  TrueRateBenchmark,
  UserProfile
} from '../types'
import { getLanguage, subscribeLanguageChange, type SupportedLocale } from '../i18n'
import { isProposalPage, scanProposalPage } from './proposal-autofill'
import {
  getTeamActivities,
  formatTimeAgo,
  TEAM_ACTIVITIES_KEY
} from '../cloud/team-tracker'
import { getUserProfile, ACCOUNT_STORAGE_KEY } from '../cloud/account'

const DETAIL_TRIGGER_ID = 'gigradar-detail-trigger'

const DWELL_THRESHOLD_MS = 1000
const SKIPPED_JOBS_KEY = 'gigradar:skipped_jobs'
const SKIPPED_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

const cardVisibleSince = new WeakMap<HTMLElement, number>()
const countedJobIds = new Set<string>()
let skipObserver: IntersectionObserver | null = null

async function hasCountedJobRecently(jobId: string): Promise<boolean> {
  if (countedJobIds.has(jobId)) return true
  if (!extensionContextValid()) return false
  try {
    const data = await chrome.storage.local.get(SKIPPED_JOBS_KEY)
    const record = (data[SKIPPED_JOBS_KEY] || {}) as Record<string, number>
    const now = Date.now()
    if (record[jobId] && now - record[jobId] < SKIPPED_EXPIRY_MS) {
      countedJobIds.add(jobId)
      return true
    }
  } catch {
    return false
  }
  return false
}

async function markJobCounted(jobId: string): Promise<void> {
  countedJobIds.add(jobId)
  if (!extensionContextValid()) return
  try {
    const data = await chrome.storage.local.get(SKIPPED_JOBS_KEY)
    const record = (data[SKIPPED_JOBS_KEY] || {}) as Record<string, number>
    const now = Date.now()
    record[jobId] = now
    for (const [id, ts] of Object.entries(record)) {
      if (now - ts > SKIPPED_EXPIRY_MS) {
        delete record[id]
      }
    }
    await chrome.storage.local.set({ [SKIPPED_JOBS_KEY]: record })
  } catch {
    // ignore
  }
}

function ensureSkipObserver(): void {
  if (skipObserver) return
  skipObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        const now = Date.now()

        if (entry.isIntersecting) {
          if (!cardVisibleSince.has(el)) {
            cardVisibleSince.set(el, now)
          }
          continue
        }

        // Card scrolled out of viewport. Check if user dwelt for >= 1.0s before scrolling away.
        const enterTime = cardVisibleSince.get(el)
        if (enterTime !== undefined) {
          cardVisibleSince.delete(el)
          const dwell = now - enterTime
          const jobId = el.dataset.gigradarJobId
          if (dwell >= DWELL_THRESHOLD_MS && jobId) {
            void (async () => {
              const alreadyCounted = await hasCountedJobRecently(jobId)
              if (!alreadyCounted) {
                await markJobCounted(jobId)
                await addConnectsSaved(CONNECTS_PER_SKIP)
              }
            })()
          }
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

// Every feed card is fully parsed at scan time — remember those snapshots so a
// drawer opened by clicking anywhere on the card (not just the title link)
// can still seed the panel with the card's stats.
const CARD_CACHE_LIMIT = 48
const cardParses = new Map<string, CardParseResult>()
const badgeEntries = new Map<string, { card: HTMLElement; host: HTMLElement }>()

let currentLocale: SupportedLocale = 'en'
void getLanguage().then((loc) => {
  currentLocale = loc
})

subscribeLanguageChange((newLocale) => {
  currentLocale = newLocale
  for (const [, entry] of badgeEntries.entries()) {
    if (entry.card.isConnected) {
      entry.host.remove()
    }
  }
  badgeEntries.clear()
  scanFeed()
})

let cachedTeamActivities: TeamJobActivity[] = []
let currentUserId = 'local_anonymous'

void getUserProfile().then((p) => {
  currentUserId = p.userId || 'local_anonymous'
})
void getTeamActivities().then((acts) => {
  cachedTeamActivities = acts
})

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return
    let needsRescan = false

    if (changes[TEAM_ACTIVITIES_KEY]) {
      cachedTeamActivities = (changes[TEAM_ACTIVITIES_KEY].newValue as TeamJobActivity[]) || []
      needsRescan = true
    }
    if (changes[ACCOUNT_STORAGE_KEY]) {
      const p = changes[ACCOUNT_STORAGE_KEY].newValue as UserProfile | undefined
      if (p) {
        currentUserId = p.userId || 'local_anonymous'
      }
      needsRescan = true
    }

    if (needsRescan) {
      for (const [, entry] of badgeEntries.entries()) {
        if (entry.card.isConnected) {
          entry.host.remove()
        }
      }
      badgeEntries.clear()
      scanFeed()
    }
  })
}

function rememberCardParse(parsed: CardParseResult): void {
  if (!parsed.meta.jobId) return
  if (cardParses.has(parsed.meta.jobId)) {
    cardParses.delete(parsed.meta.jobId)
  }
  cardParses.set(parsed.meta.jobId, parsed)
  while (cardParses.size > CARD_CACHE_LIMIT) {
    const oldest = cardParses.keys().next().value
    if (oldest === undefined) break
    cardParses.delete(oldest)
  }
}

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
let cacheWriteCount = 0

async function pruneIntelCache(): Promise<void> {
  if (!extensionContextValid()) return
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
  if (!extensionContextValid()) return
  const jobId = data.meta.jobId
  if (!jobId) return

  try {
    const key = `${INTEL_CACHE_PREFIX}${jobId}`
    const stored = await chrome.storage.local.get(key)
    const existing = stored[key] as IntelCacheEntry | undefined
    const next = mergeIntelCacheEntry(existing, data, Date.now())
    await chrome.storage.local.set({ [key]: next })
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
  let rating = parsed.rating
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
      rating = detail.rating ?? rating
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

  const dossier = buildClientDossier({
    feedbacks,
    description: `${parsed.meta.title}\n${parsed.meta.descriptionSnippet}`,
    contractTitles: [parsed.meta.title]
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
    sentiment,
    rating,
    dossier
  }
}

function setActive(data: EnrichmentData): void {
  activeData = data
  refreshTrigger()
  const badgeEntry = badgeEntries.get(data.meta.jobId)
  if (badgeEntry?.card.isConnected) {
    badgeEntry.host.remove()
    const host = mountBadge(
      badgeEntry.card,
      {
        score: data.score.scored ? data.score.score : null,
        tier: data.score.scored ? data.score.tier : null,
        flagCount: data.flags.length,
        provisional: Object.values(data.signals).some((value) => value == null),
        alert: feedAlert(data.signals, data.meta.proposalCount, false, currentLocale),
        locale: currentLocale
      },
      () => {
        const current = resolveCurrentIntel(activeData, data.meta.jobId, data)
        openDetailModal({ ...current }, { locale: currentLocale })
      }
    )
    badgeEntries.set(data.meta.jobId, { card: badgeEntry.card, host })
  } else if (badgeEntry) {
    badgeEntries.delete(data.meta.jobId)
  }
  const inlineHost = document.querySelector<HTMLElement>('[data-gigradar-inline]')
  if (
    inlineHost?.dataset.gigradarJobId === data.meta.jobId &&
    inlineHost.parentElement?.isConnected
  ) {
    mountInlineCard(inlineHost.parentElement, { ...data }, () => {
      const current = resolveCurrentIntel(activeData, data.meta.jobId, data)
      openDetailModal({ ...current }, { locale: currentLocale })
    })
  }
  void saveIntelCache(data)
}

function pruneDisconnectedBadges(): void {
  for (const [jobId, entry] of badgeEntries.entries()) {
    if (!entry.card.isConnected || !entry.host.isConnected) {
      if (skipObserver && entry.host) {
        try {
          skipObserver.unobserve(entry.host)
        } catch {
          // host may already be gone
        }
      }
      badgeEntries.delete(jobId)
    }
  }
}

function getDistinctJobIds(el: HTMLElement): Set<string> {
  const links = el.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]')
  const ids = new Set<string>()
  for (const a of Array.from(links)) {
    const id = extractJobId(a.href)
    if (id) ids.add(id)
  }
  return ids
}

const CARD_CONTAINER_SELECTOR = [
  'article.job-tile-responsive',
  'article.job-tile',
  '[data-test="job-tile"]',
  '[data-test="JobTile"]',
  '[data-qa="job-tile"]',
  'section.job-tile-responsive',
  '[data-ev-label="search_result_item"]',
  'article',
  '.air3-card'
].join(', ')

function findJobCardForLink(link: HTMLElement): HTMLElement | null {
  const card = link.closest<HTMLElement>(CARD_CONTAINER_SELECTOR)
  if (card && card !== document.body && card.tagName !== 'MAIN') {
    const outer = card.parentElement?.closest<HTMLElement>(CARD_CONTAINER_SELECTOR)
    if (
      outer &&
      outer !== document.body &&
      outer.tagName !== 'MAIN' &&
      getDistinctJobIds(outer).size === 1
    ) {
      return outer
    }
    return card
  }
  return null
}

function scanFeed(): void {
  pruneDisconnectedBadges()

  // 1. Candidate cards from standard selector chains
  const queriedCards = queryAll(document.body, SELECTORS.jobCard)

  // 2. Discover cards directly from all job heading links on page as fallback
  const fallbackCards: HTMLElement[] = []
  const jobLinks = document.querySelectorAll<HTMLAnchorElement>(
    'h2 a[href*="/jobs/"], h3 a[href*="/jobs/"], [data-test*="title"] a[href*="/jobs/"], a[data-test="job-tile-title-link"], .job-tile-title a'
  )
  for (const link of Array.from(jobLinks)) {
    // If link is already inside an enriched card with an active badge, skip immediately
    const existingHost = link.closest('[data-gigradar-card="true"]')
    if (existingHost && existingHost.querySelector('[data-gigradar-badge]')) {
      continue
    }
    const card = findJobCardForLink(link)
    if (card) fallbackCards.push(card)
  }

  const allRaw = Array.from(new Set([...queriedCards, ...fallbackCards]))

  // FAST SKIP: Discard any card that is already processed and has an active mounted badge
  const unmountedRaw = allRaw.filter((card) => {
    if (!card.isConnected) return false
    if (card.dataset.gigradarCard === 'true' && card.querySelector('[data-gigradar-badge]')) {
      return false
    }
    return true
  })

  if (unmountedRaw.length === 0) return

  // 3. Keep strictly cards that contain links for EXACTLY 1 distinct job ID
  // (instantly eliminates feed wrappers, search result containers, sections with 10+ jobs)
  const singleJobCards = unmountedRaw.filter((card) => {
    return card.isConnected && getDistinctJobIds(card).size === 1
  })

  // 4. For nested containers of the same job (e.g. outer <article> and inner <section>),
  // keep the outermost container
  const cards = singleJobCards.filter((card) => {
    return !singleJobCards.some((other) => other !== card && other.contains(card))
  })

  for (const card of cards) {
    if (!card.isConnected) continue
    if (card.querySelector('[data-gigradar-badge]')) continue

    const parsed = parseCardProfile(card)
    if (!parsed || !parsed.meta.jobId) continue

    // If an active badge already exists for this exact job, don't mount another
    const existing = badgeEntries.get(parsed.meta.jobId)
    if (existing?.host.isConnected && existing.card.isConnected) {
      continue
    }

    card.dataset.gigradarCard = 'true'
    card.dataset.gigradarJobId = parsed.meta.jobId
    rememberCardParse(parsed)

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
    const alert = feedAlert(signals, parsed.meta.proposalCount, scam.matched, currentLocale)

    const normalizedId = normalizeJobId(parsed.meta.jobId).toLowerCase()
    const teamActivity = cachedTeamActivities.find(
      (item) =>
        normalizeJobId(item.jobId).toLowerCase() === normalizedId &&
        item.expiresAt > Date.now() &&
        item.status !== 'passed'
    )

    let teamAlert: TeamAlertInfo | null = null
    if (teamActivity && teamActivity.memberId !== currentUserId) {
      teamAlert = {
        memberName: teamActivity.memberName,
        status: teamActivity.status as 'drafting' | 'applied' | 'viewing',
        timeAgo: formatTimeAgo(teamActivity.updatedAt)
      }
    }

    const host = mountBadge(
      card,
      {
        score: preview?.score ?? null,
        tier: preview?.tier ?? null,
        flagCount: previewFlags.length,
        provisional: Object.values(signals).some((value) => value == null),
        alert,
        teamAlert,
        locale: currentLocale
      },
      () => {
        const fresh = parseCardProfile(card) ?? parsed
        openDetailModal(buildEnrichment(fresh), { locale: currentLocale })
      }
    )
    badgeEntries.set(parsed.meta.jobId, { card, host })

    if (previewFlags.length > 0) {
      ensureSkipObserver()
      host.dataset.gigradarJobId = parsed.meta.jobId
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
let lazyGen = 0
let activeWaiter: DrawerClientWaiter | null = null

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
    data.flags.map((flag) => flag.text).join('§'),
    data.rating ? `★${data.rating.avg}` : '-'
  ].join('#')
}

function stopLazyRefresh(): void {
  lazyGen += 1
  if (lazyTimer !== undefined) {
    window.clearTimeout(lazyTimer)
    lazyTimer = undefined
  }
  activeWaiter?.cancel()
  activeWaiter = null
  refreshTarget = null
}

function mergeTick(target: HTMLElement): void {
  const effectiveTarget = resolveDrawerTarget(target)
  const parsed = parseDrawerProfile(effectiveTarget)
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
    const scam = scanScamSignals(effectiveTarget.innerText ?? '')
    const sentiment = analyzeSentiment(feedbacks)
    const rating = parsed.rating ?? activeData.rating ?? null

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
      candidateFlags.map((flag) => flag.text).join('§'),
      rating ? `★${rating.avg}` : '-'
    ].join('#')

    if (after !== before) {
      const dossier = buildClientDossier({
        feedbacks,
        description: `${activeData.meta.title}\n${activeData.meta.descriptionSnippet}`,
        contractTitles: [activeData.meta.title]
      })
      const refreshed: EnrichmentData = {
        meta: { ...activeData.meta, proposalCount, feedbacks },
        signals: merged,
        score: scoreClient(merged),
        flags: candidateFlags,
        nameGuess: extractClientName(feedbacks),
        activity: hasActivityValues ? mergedActivity : null,
        budget,
        trueRate,
        sentiment,
        rating,
        dossier
      }
      setActive(refreshed)

      if (document.querySelector('[data-gigradar-modal]') != null) {
        openDetailModal({ ...refreshed }, { docked: true, settled: true })
      }
    }
  }
}

function resolveScanVerdict(): void {
  if (!activeData) return
  if (document.querySelector('[data-gigradar-modal]') == null) return
  // Scan window closed with nothing found — replace the SCANNING state with
  // an honest NO DATA instead of leaving it pending forever.
  openDetailModal({ ...activeData }, { docked: true, settled: true })
}

function startLazyRefresh(container: HTMLElement): void {
  stopLazyRefresh()
  const gen = lazyGen
  refreshTarget = container
  let attempts = 0

  const alive = (): boolean =>
    gen === lazyGen &&
    !!refreshTarget &&
    refreshTarget.isConnected &&
    document.body.contains(refreshTarget)

  const tick = (): void => {
    lazyTimer = undefined
    if (!alive()) {
      stopLazyRefresh()
      return
    }
    mergeTick(refreshTarget!)
    attempts += 1
    if (attempts < 12) {
      lazyTimer = window.setTimeout(tick, 900)
    } else {
      stopLazyRefresh()
      resolveScanVerdict()
    }
  }

  // Fast phase: the drawer sidebar renders asynchronously on /nx/search/jobs.
  // Converge the moment client evidence lands (max 5 probes, 300ms apart)
  // instead of sleeping a full second and locking NO DATA into the panel.
  activeWaiter = waitForDrawerClient(
    container,
    () => {
      if (alive()) tick()
    },
    () => {
      if (alive()) tick()
    },
    5,
    300
  )
}

function seedDrawerParse(parsed: CardParseResult): CardParseResult {
  const known =
    activeData && activeData.meta.jobId === parsed.meta.jobId
      ? activeData
      : cardParses.get(parsed.meta.jobId) ?? recentClickedCard()
  if (!known) return parsed

  const s = parsed.signals
  const k = known.signals
  return {
    ...parsed,
    signals: {
      hireRatePct: s.hireRatePct ?? k.hireRatePct,
      totalSpendUsd: s.totalSpendUsd ?? k.totalSpendUsd,
      paymentVerified: s.paymentVerified ?? k.paymentVerified,
      daysSinceLastHire: s.daysSinceLastHire ?? k.daysSinceLastHire
    },
    budget: parsed.budget ?? known.budget ?? null,
    trueRate: parsed.trueRate ?? known.trueRate ?? null,
    rating: parsed.rating ?? known.rating ?? null,
    meta: {
      ...parsed.meta,
      title:
        parsed.meta.title && parsed.meta.title !== 'Upwork job'
          ? parsed.meta.title
          : known.meta.title || parsed.meta.title,
      proposalCount: parsed.meta.proposalCount ?? known.meta.proposalCount
    }
  }
}

function handleNativeDrawer(drawer: HTMLElement, expanded = false): void {
  const parsed = parseDrawerProfile(drawer)

  let data: EnrichmentData | null = null
  if (parsed) {
    // Seed the drawer parse with whatever the feed card already knew so the
    // panel opens instantly with real numbers while the async sidebar loads.
    data = buildEnrichment(seedDrawerParse(parsed))
  } else if (activeData) {
    data = activeData
  }
  if (!data) return

  setActive(data)
  openDetailModal(
    { ...data! },
    { docked: true, scanning: true, expanded }
  )

  void (async () => {
    const sidebar = (await findSidebarWithRetry()) ?? findClientBlockVerified(drawer)
    if (!drawer.isConnected || !document.body.contains(drawer)) return

    if (sidebar) {
      const current = resolveCurrentIntel(activeData, data!.meta.jobId, data!)
      mountInlineCard(sidebar, current, () => {
        const current = resolveCurrentIntel(activeData, data!.meta.jobId, data!)
        openDetailModal({ ...current }, {})
      })
    }
  })()

  startLazyRefresh(drawer)
}

function scanForDrawer(): void {
  const drawer = findOpenDrawer()

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
      mountInlineCard(sidebar, activeData, () => {
        const current = resolveCurrentIntel(activeData, activeData!.meta.jobId, activeData!)
        openDetailModal({ ...current }, {})
      })
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
  const jobId = extractJobId(window.location.href)
  const known =
    activeData?.meta.jobId === jobId
      ? activeData
      : cardParses.get(jobId) ?? recentClickedCard()
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
    ...(known?.signals ?? {}),
    ...detail.signalsPatch
  }

  const feedbacks =
    detail.feedbacks.length > 0 ? detail.feedbacks : (known?.meta.feedbacks ?? [])

  const scam = scanScamSignals(
    `${containerText}\n${(descriptionEl?.textContent ?? '').slice(0, 2000)}`
  )
  const sentiment = analyzeSentiment(feedbacks)

  const rawH1 = container.querySelector('h1')?.textContent?.trim()
  const detailTitle =
    (!isInvalidJobTitle(rawH1) ? rawH1 : null) ||
    known?.meta.title ||
    document.title ||
    'Upwork job'
  const title = !isInvalidJobTitle(detailTitle) ? detailTitle : 'Upwork job'

  const meta: JobMeta = {
    jobId,
    title,
    url: window.location.href,
    proposalCount:
      parseProposalCount(proposalsLine ?? null) ?? known?.meta.proposalCount ?? null,
    postedText: postedLine ? postedLine.trim().slice(0, 60) : null,
    descriptionSnippet:
      (descriptionEl?.textContent ?? '').trim().slice(0, 400) ||
      known?.meta.descriptionSnippet ||
      '',
    feedbacks
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
  const dossier = buildClientDossier({
    feedbacks,
    description: `${meta.title}\n${meta.descriptionSnippet}`,
    contractTitles: [meta.title]
  })
  const data: EnrichmentData = {
    meta,
    signals,
    score,
    flags,
    nameGuess: null,
    activity: detail.activity ?? known?.activity ?? null,
    budget: detail.budget ?? known?.budget ?? null,
    trueRate: pickTrueRate(known?.trueRate, detail.trueRate),
    sentiment,
    rating: detail.rating ?? known?.rating ?? null,
    dossier
  }

  setActive(data)
  openDetailModal(data, { docked: true, scanning: true })
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
      'z-index:99998',
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
      // If a drawer is open but wasn't detected through the normal scan path,
      // the pill becomes a self-healing entry point into the full pipeline.
      const drawer = findOpenDrawer()
      if (drawer) {
        handleNativeDrawer(drawer, true)
        return
      }
      if (activeData) {
        openDetailModal({ ...activeData }, { docked: true, expanded: true })
      }
      else openFromDetailPage()
    })
    document.body.appendChild(trigger)
  }

  return trigger
}

function refreshTrigger(): void {
  const shouldShow = !!activeData || isJobDetailPage() || isDrawerRoute()

  if (!shouldShow) {
    document.getElementById(DETAIL_TRIGGER_ID)?.remove()
    return
  }

  const trigger = ensureTrigger()
  trigger.style.display = 'flex'

  const titleSpan = trigger.querySelector('[data-gr-title]')
  if (titleSpan) {
    let label = activeData?.meta.title
    if (isInvalidJobTitle(label)) {
      const h1Text = findJobDetailsContainer()?.querySelector('h1')?.textContent?.trim()
      label = !isInvalidJobTitle(h1Text) ? h1Text : ''
    }
    titleSpan.textContent = label ? truncate(label) : ''
  }
}

// Clicking anywhere on a feed card (title, body, badge) is the strongest
// signal we get about which drawer is about to open — snapshot the card's
// stats so seedDrawerParse can repaint the panel even when Upwork's drawer
// anchor uses an incompatible ID format.
const CLICK_FALLBACK_MS = 3000
let lastCardClick: { parsed: CardParseResult; at: number } | null = null

function recentClickedCard(): CardParseResult | null {
  if (!lastCardClick) return null
  if (Date.now() - lastCardClick.at > CLICK_FALLBACK_MS) return null
  return lastCardClick.parsed
}

function installCardClickTracker(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return
      if (!extensionContextValid()) return

      const card =
        (target.closest(SELECTORS.jobCard.join(', ')) as HTMLElement | null) ??
        findJobCardForLink(target)
      if (!card) return

      if (getDistinctJobIds(card).size !== 1) return

      const parsed = parseCardProfile(card)
      if (!parsed || isInvalidJobTitle(parsed.meta.title)) return

      rememberCardParse(parsed)
      lastCardClick = { parsed, at: Date.now() }
      setActive(buildEnrichment(parsed))
    },
    true
  )
}

function installKeyboardShortcut(): void {
  document.addEventListener(
    'keydown',
    (event) => {
      const key = event.key.toLowerCase()
      const isMac = /mac/i.test(navigator.platform)
      const matches = isMac
        ? event.metaKey && event.shiftKey && key === 'g' && !event.altKey
        : event.altKey && key === 'g' && !event.ctrlKey && !event.metaKey
      if (!matches) return

      event.preventDefault()
      event.stopPropagation()
      if (isDetailModalOpen()) {
        closeDetailModal()
        return
      }

      if (activeData) {
        openDetailModal({ ...activeData }, { docked: true, expanded: true })
        return
      }

      const drawer = findOpenDrawer()
      if (drawer) handleNativeDrawer(drawer, true)
      else if (isJobDetailPage()) openFromDetailPage()
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
  if (isProposalPage()) {
    scanProposalPage()
  }
}

function runScan(): void {
  if (!extensionContextValid()) {
    observer.disconnect()
    return
  }
  if (isProposalPage()) {
    try {
      scanProposalPage()
    } catch {
      window.setTimeout(scanProposalPage, 1000)
    }
    return
  }
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
  installCardClickTracker()
  installKeyboardShortcut()
  observer.observe(document.body, { childList: true, subtree: true })
  runScan()
  onUrlChange()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
