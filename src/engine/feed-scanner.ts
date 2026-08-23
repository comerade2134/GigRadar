export interface ScannerSettings {
  enabled: boolean
  rssUrl: string
  intervalMin: number
  minScore: number
  freshMinutes: number
}

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  enabled: false,
  rssUrl: '',
  intervalMin: 3,
  minScore: 80,
  freshMinutes: 5
}

export interface RssJobItem {
  jobId: string
  title: string
  url: string
  description: string
  pubDateMs: number | null
}

const SCANNER_KEY = 'gigradar:scanner'
const SEEN_KEY = 'gigradar:notified'
const SEEN_TTL_MS = 48 * 60 * 60 * 1000

export async function loadScannerSettings(): Promise<ScannerSettings> {
  try {
    const result = await chrome.storage.local.get(SCANNER_KEY)
    const stored = result[SCANNER_KEY] as Partial<ScannerSettings> | undefined
    if (!stored) return { ...DEFAULT_SCANNER_SETTINGS }
    return {
      enabled: !!stored.enabled,
      rssUrl: typeof stored.rssUrl === 'string' ? stored.rssUrl : '',
      intervalMin:
        typeof stored.intervalMin === 'number' && stored.intervalMin >= 1
          ? stored.intervalMin
          : DEFAULT_SCANNER_SETTINGS.intervalMin,
      minScore:
        typeof stored.minScore === 'number'
          ? Math.min(Math.max(stored.minScore, 0), 100)
          : DEFAULT_SCANNER_SETTINGS.minScore,
      freshMinutes:
        typeof stored.freshMinutes === 'number' && stored.freshMinutes >= 1
          ? stored.freshMinutes
          : DEFAULT_SCANNER_SETTINGS.freshMinutes
    }
  } catch {
    return { ...DEFAULT_SCANNER_SETTINGS }
  }
}

export async function saveScannerSettings(settings: ScannerSettings): Promise<void> {
  await chrome.storage.local.set({ [SCANNER_KEY]: settings })
}

export async function readSeenJobs(): Promise<Record<string, number>> {
  try {
    const result = await chrome.storage.local.get(SEEN_KEY)
    const stored = result[SEEN_KEY]
    return stored && typeof stored === 'object' ? (stored as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export async function markJobsSeen(jobIds: readonly string[]): Promise<void> {
  if (jobIds.length === 0) return
  const seen = await readSeenJobs()
  const now = Date.now()
  for (const id of jobIds) seen[id] = now
  for (const [id, ts] of Object.entries(seen)) {
    if (now - ts > SEEN_TTL_MS) delete seen[id]
  }
  await chrome.storage.local.set({ [SEEN_KEY]: seen })
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))
}

function pickTag(block: string, tag: string): string | null {
  const match = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,
    'i'
  ).exec(block)
  return match ? decodeEntities(match[1]).trim() : null
}

export function extractJobIdFromLink(url: string): string {
  try {
    const tilde = /~([0-9a-z]{8,})/i.exec(new URL(url).pathname)
    return tilde ? tilde[1] : url
  } catch {
    return url
  }
}

export function parseRssItems(xml: string): RssJobItem[] {
  const items: RssJobItem[] = []
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRe.exec(xml)) != null) {
    const block = match[1]
    const link = pickTag(block, 'link') ?? ''
    if (!link.includes('/jobs/')) continue

    let title = pickTag(block, 'title') ?? ''
    title = title.replace(/\s*[-–|]\s*Upwork\s*$/i, '').trim()

    items.push({
      jobId: extractJobIdFromLink(link),
      title,
      url: link,
      description: (pickTag(block, 'description') ?? '').slice(0, 2000),
      pubDateMs: parsePubDate(pickTag(block, 'pubDate'))
    })
  }
  return items
}

function parsePubDate(raw: string | null): number | null {
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? null : ms
}

function parseMoneyValue(raw: string): number | null {
  const value = parseFloat(raw.replace(/,/g, ''))
  return Number.isNaN(value) || value <= 0 ? null : value
}

export function extractRssBudget(text: string): {
  type: 'hourly' | 'fixed'
  midpointUsd: number
} | null {
  const rangeHourly =
    /\$\s*([\d.,]+)\s*[-–—]\s*\$\s*([\d.,]+)[^\n$]{0,24}(?:\/\s*hr|hourly|per hour)/i.exec(text)
  if (rangeHourly) {
    const lo = parseMoneyValue(rangeHourly[1])
    const hi = parseMoneyValue(rangeHourly[2])
    if (lo != null && hi != null && hi >= lo) {
      return { type: 'hourly', midpointUsd: (lo + hi) / 2 }
    }
  }
  const singleHourly =
    /\$\s*([\d.,]+)\s*(?:\/\s*hr|per\s+hour|hourly)/i.exec(text)
  if (singleHourly) {
    const value = parseMoneyValue(singleHourly[1])
    if (value != null) return { type: 'hourly', midpointUsd: value }
  }
  const fixed = /\$\s*([\d.,]+)/.exec(text)
  if (fixed) {
    const value = parseMoneyValue(fixed[1])
    if (value != null && value >= 50) return { type: 'fixed', midpointUsd: value }
  }
  return null
}

export function scoreRssJob(item: RssJobItem): number {
  let score = 0
  const haystack = `${item.title}\n${item.description}`

  const budget = extractRssBudget(haystack)
  if (budget?.type === 'hourly') {
    const mid = budget.midpointUsd
    if (mid >= 50) score += 55
    else if (mid >= 35) score += 45
    else if (mid >= 25) score += 30
    else if (mid >= 15) score += 15
    else score += 5
  } else if (budget?.type === 'fixed') {
    const amount = budget.midpointUsd
    if (amount >= 5000) score += 55
    else if (amount >= 2000) score += 48
    else if (amount >= 1000) score += 35
    else if (amount >= 500) score += 22
    else score += 10
  }

  if (/\b(urgent|asap|immediately|start today|this week)\b/i.test(haystack)) score += 12
  if (/\b(long[- ]term|ongoing|recurring|retainer)\b/i.test(haystack)) score += 10
  if (/\b(senior|expert|lead)\b/i.test(item.title)) score += 8
  if (item.description.length > 300) score += 5
  if (/\b(milestone|weekly payment|funded)\b/i.test(haystack)) score += 5

  return Math.min(score, 100)
}

export function formatBudgetLabel(text: string): string | null {
  const budget = extractRssBudget(text)
  if (!budget) return null
  const usd = budget.midpointUsd
  if (budget.type === 'hourly') {
    return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}/hr`
  }
  return usd >= 1000 ? `$${(usd / 1000).toFixed(usd >= 10_000 ? 0 : 1)}k` : `$${usd.toFixed(0)}`
}
