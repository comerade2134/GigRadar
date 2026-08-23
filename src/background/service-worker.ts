import ExtPay from '../vendor/extpay.module'
import { EXTPAY_EXTENSION_ID } from '../monetization/extpay-core'
import {
  loadScannerSettings,
  markJobsSeen,
  parseRssItems,
  readSeenJobs,
  scoreRssJob,
  formatBudgetLabel,
  type ScannerSettings
} from '../engine/feed-scanner'

ExtPay(EXTPAY_EXTENSION_ID).startBackground()

const SCAN_ALARM = 'gigradar-feed-scan'

chrome.runtime.onInstalled.addListener(() => {
  void syncAlarm()
})
chrome.runtime.onStartup.addListener(() => {
  void syncAlarm()
})

async function syncAlarm(): Promise<void> {
  try {
    const settings = await loadScannerSettings()
    const existing = await chrome.alarms.get(SCAN_ALARM)
    if (!settings.enabled || !settings.rssUrl) {
      if (existing) await chrome.alarms.clear(SCAN_ALARM)
      return
    }
    if (
      !existing ||
      existing.periodInMinutes !== settings.intervalMin
    ) {
      await chrome.alarms.create(SCAN_ALARM, {
        periodInMinutes: Math.max(settings.intervalMin, 1)
      })
    }
  } catch {
    return
  }
}

const pendingNotificationUrls = new Map<string, string>()

interface ScanOutcome {
  fetched: boolean
  notified: number
  error?: string
}

async function runFeedScan(): Promise<ScanOutcome> {
  let settings: ScannerSettings
  try {
    settings = await loadScannerSettings()
  } catch {
    return { fetched: false, notified: 0, error: 'settings unavailable' }
  }
  if (!settings.enabled || !settings.rssUrl) {
    return { fetched: false, notified: 0 }
  }

  let xml: string
  try {
    const response = await fetch(settings.rssUrl, {
      credentials: 'include',
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
    })
    if (!response.ok) {
      return { fetched: false, notified: 0, error: `RSS ${response.status}` }
    }
    xml = await response.text()
  } catch (error) {
    return {
      fetched: false,
      notified: 0,
      error: String(error instanceof Error ? error.message : error)
    }
  }

  const items = parseRssItems(xml)
  const seen = await readSeenJobs()
  const now = Date.now()
  const freshMs = settings.freshMinutes * 60_000

  const hits = items.filter((item) => {
    if (seen[item.jobId] != null) return false
    if (item.pubDateMs == null || now - item.pubDateMs > freshMs) return false
    return scoreRssJob(item) >= settings.minScore
  })

  if (hits.length === 0) {
    await markJobsSeen(items.map((item) => item.jobId))
    return { fetched: true, notified: 0 }
  }

  for (const item of hits) {
    const budgetLabel = formatBudgetLabel(`${item.title}\n${item.description}`)
    try {
      const notificationId = await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: `🔥 Fresh High-Intent Job: ${item.title.slice(0, 80)}`,
        message: `${budgetLabel ? `(${budgetLabel} budget)` : 'New posting'} — Be First to Bid!`,
        priority: 2,
        requireInteraction: false
      })
      pendingNotificationUrls.set(notificationId ?? item.jobId, item.url)
    } catch {
      break
    }
  }

  await markJobsSeen(items.map((item) => item.jobId))
  return { fetched: true, notified: hits.length }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) void runFeedScan()
})

chrome.notifications.onClicked.addListener((notificationId) => {
  const url = pendingNotificationUrls.get(notificationId)
  pendingNotificationUrls.delete(notificationId)
  if (url) void chrome.tabs.create({ url })
})

interface ByokPolishMessage {
  type: 'BYOK_POLISH'
  prompt: string
  provider: 'openai' | 'anthropic'
  apiKey: string
}

const SYSTEM_PROMPT =
  'You write concise Upwork proposal openers. Given a freelancer note, rewrite it into 2-3 tight sentences: warm greeting, specific relevance to the job, one smart question. No fluff, no buzzwords.'

async function callOpenAi(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    })
  })
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned an empty completion.')
  return text
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    content?: Array<{ text?: string }>
  }
  const text = data.content?.[0]?.text?.trim()
  if (!text) throw new Error('Anthropic returned an empty message.')
  return text
}

async function handleByokPolish(
  message: ByokPolishMessage
): Promise<{ ok: boolean; text: string }> {
  try {
    const text =
      message.provider === 'anthropic'
        ? await callAnthropic(message.prompt, message.apiKey)
        : await callOpenAi(message.prompt, message.apiKey)
    return { ok: true, text }
  } catch (error) {
    return { ok: false, text: String(error instanceof Error ? error.message : error) }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return

  const type = (message as { type?: string }).type

  if (type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return
  }

  if (type === 'BYOK_POLISH') {
    handleByokPolish(message as ByokPolishMessage).then(sendResponse)
    return true
  }

  if (type === 'SCANNER_SETTINGS_UPDATED') {
    void syncAlarm()
    sendResponse({ ok: true })
    return
  }

  if (type === 'SCANNER_SCAN_NOW') {
    void runFeedScan().then(sendResponse)
    return true
  }
})
