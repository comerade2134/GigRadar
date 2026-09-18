import { extensionContextValid } from '../context'
import type { WebhookConfig, WebhookEventPayload, WebhookEventType } from '../types'

export const WEBHOOK_CONFIG_KEY = 'gigradar:webhook_config'

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  slackWebhookUrl: '',
  discordWebhookUrl: '',
  customWebhookUrl: '',
  notifyOnClaim: true,
  notifyOnApplied: true,
  notifyOnHighValue: true,
  notifyOnCollision: true,
  highValueThresholdUsd: 1000
}

export async function loadWebhookConfig(): Promise<WebhookConfig> {
  if (!extensionContextValid()) return { ...DEFAULT_WEBHOOK_CONFIG }
  try {
    const res = await chrome.storage.local.get(WEBHOOK_CONFIG_KEY)
    const stored = res[WEBHOOK_CONFIG_KEY] as Partial<WebhookConfig> | undefined
    return {
      ...DEFAULT_WEBHOOK_CONFIG,
      ...(stored || {})
    }
  } catch {
    return { ...DEFAULT_WEBHOOK_CONFIG }
  }
}

export async function saveWebhookConfig(config: WebhookConfig): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [WEBHOOK_CONFIG_KEY]: config })
}

export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function formatEventLabel(type: WebhookEventType): string {
  switch (type) {
    case 'job_applied':
      return '🚀 Proposal Submitted'
    case 'job_claimed':
      return '✍️ Lead Claimed / Drafting'
    case 'high_value_lead':
      return '💎 High-Value Lead Detected'
    case 'collision_prevented':
      return '🛡️ Duplicate Bid Collision Prevented'
    default:
      return '📌 Upwork Lead Update'
  }
}

export function formatSlackBlocks(payload: WebhookEventPayload) {
  const eventLabel = formatEventLabel(payload.eventType)
  const clientInfo = payload.clientName
    ? `${payload.clientName} (${payload.hireRatePct ?? 0}% hire, ${formatUsd(payload.totalSpendUsd ?? 0)} spend)`
    : 'Unknown Client'

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${eventLabel}: ${payload.jobTitle.slice(0, 80)}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status:*\n${payload.status.toUpperCase()}`
        },
        {
          type: 'mrkdwn',
          text: `*Assigned Teammate:*\n${payload.memberName}`
        },
        {
          type: 'mrkdwn',
          text: `*Estimated Value:*\n${formatUsd(payload.dealValueUsd ?? 500)}`
        },
        {
          type: 'mrkdwn',
          text: `*Client:*\n${clientInfo}`
        }
      ]
    }
  ]

  if (payload.notes) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*BD Notes:* ${payload.notes}`
      }
    })
  }

  if (payload.jobUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Upwork Job',
            emoji: true
          },
          url: payload.jobUrl,
          style: 'primary'
        }
      ]
    })
  }

  return {
    text: `${eventLabel}: ${payload.jobTitle} - $${payload.dealValueUsd ?? 500}`,
    blocks
  }
}

export function formatDiscordEmbed(payload: WebhookEventPayload) {
  const eventLabel = formatEventLabel(payload.eventType)

  let color = 0x6366f1 // Indigo default
  if (payload.eventType === 'job_applied') color = 0x10b981 // Emerald
  else if (payload.eventType === 'job_claimed') color = 0xf59e0b // Amber
  else if (payload.eventType === 'collision_prevented') color = 0xef4444 // Red
  else if (payload.eventType === 'high_value_lead') color = 0x8b5cf6 // Purple

  const fields = [
    {
      name: 'Deal Value',
      value: formatUsd(payload.dealValueUsd ?? 500),
      inline: true
    },
    {
      name: 'Status',
      value: payload.status.toUpperCase(),
      inline: true
    },
    {
      name: 'Assigned BD',
      value: payload.memberName,
      inline: true
    }
  ]

  if (payload.clientName || payload.hireRatePct !== undefined) {
    fields.push({
      name: 'Client Details',
      value: `${payload.clientName || 'Anonymous'} (${payload.hireRatePct ?? 0}% hire rate, ${formatUsd(payload.totalSpendUsd ?? 0)} spend)`,
      inline: false
    })
  }

  if (payload.notes) {
    fields.push({
      name: 'Notes',
      value: payload.notes,
      inline: false
    })
  }

  return {
    embeds: [
      {
        title: `${eventLabel}: ${payload.jobTitle.slice(0, 100)}`,
        url: payload.jobUrl,
        description: `GigRadar Agency Lead Update for team BDs.`,
        color,
        fields,
        footer: {
          text: 'GigRadar Agency Operating System'
        },
        timestamp: new Date(payload.timestamp).toISOString()
      }
    ]
  }
}

export function formatCustomJson(payload: WebhookEventPayload) {
  return {
    source: 'gigradar',
    version: '0.3.2',
    event: payload.eventType,
    job: {
      id: payload.jobId,
      title: payload.jobTitle,
      url: payload.jobUrl || null,
      dealValueUsd: payload.dealValueUsd ?? null,
      budget: payload.budget ?? null
    },
    client: {
      name: payload.clientName || null,
      hireRatePct: payload.hireRatePct ?? null,
      totalSpendUsd: payload.totalSpendUsd ?? null,
      paymentVerified: payload.paymentVerified ?? null
    },
    team: {
      memberName: payload.memberName,
      memberEmail: payload.memberEmail || null,
      status: payload.status,
      notes: payload.notes || null
    },
    timestamp: payload.timestamp,
    isoTime: new Date(payload.timestamp).toISOString()
  }
}

export function shouldDispatch(payload: WebhookEventPayload, config: WebhookConfig): boolean {
  if (payload.eventType === 'job_claimed' && !config.notifyOnClaim) return false
  if (payload.eventType === 'job_applied' && !config.notifyOnApplied) return false
  if (payload.eventType === 'collision_prevented' && !config.notifyOnCollision) return false

  if (payload.eventType === 'high_value_lead') {
    if (!config.notifyOnHighValue) return false
    const deal = payload.dealValueUsd ?? 0
    if (deal < config.highValueThresholdUsd) return false
  }

  return true
}

export async function requestWebhookPermissions(urls: string[]): Promise<boolean> {
  if (!extensionContextValid() || typeof chrome === 'undefined' || !chrome.permissions) {
    return true
  }
  const origins: string[] = []
  for (const url of urls) {
    if (!url || !url.startsWith('http')) continue
    try {
      const parsed = new URL(url)
      origins.push(`${parsed.protocol}//${parsed.host}/*`)
    } catch {
      // ignore invalid URL
    }
  }
  if (origins.length === 0) return true
  try {
    const has = await chrome.permissions.contains({ origins })
    if (has) return true
    return await chrome.permissions.request({ origins })
  } catch {
    return false
  }
}

async function postJson(url: string, body: unknown, timeoutMs = 5000): Promise<boolean> {
  // When running inside extension context (content script or options page),
  // route via background service worker to circumvent webpage CORS & CSP restrictions.
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.sendMessage === 'function' &&
    typeof window !== 'undefined'
  ) {
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'WEBHOOK_POST',
        url,
        body,
        timeoutMs
      })) as { ok?: boolean } | undefined
      if (response && typeof response.ok === 'boolean') {
        return response.ok
      }
    } catch {
      // Fall through to direct fetch in test / headless / fallback environments
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timer)
    return res.ok || res.status === 204
  } catch {
    clearTimeout(timer)
    return false
  }
}

export async function dispatchWebhooks(
  payload: WebhookEventPayload,
  overrideConfig?: WebhookConfig
): Promise<{ slack: boolean; discord: boolean; custom: boolean }> {
  const config = overrideConfig || (await loadWebhookConfig())
  const results = { slack: false, discord: false, custom: false }

  if (!shouldDispatch(payload, config)) {
    return results
  }

  const tasks: Promise<void>[] = []

  if (config.slackWebhookUrl && config.slackWebhookUrl.startsWith('http')) {
    tasks.push(
      (async () => {
        const body = formatSlackBlocks(payload)
        results.slack = await postJson(config.slackWebhookUrl!, body)
      })()
    )
  }

  if (config.discordWebhookUrl && config.discordWebhookUrl.startsWith('http')) {
    tasks.push(
      (async () => {
        const body = formatDiscordEmbed(payload)
        results.discord = await postJson(config.discordWebhookUrl!, body)
      })()
    )
  }

  if (config.customWebhookUrl && config.customWebhookUrl.startsWith('http')) {
    tasks.push(
      (async () => {
        const body = formatCustomJson(payload)
        results.custom = await postJson(config.customWebhookUrl!, body)
      })()
    )
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }

  return results
}

export async function sendTestWebhook(
  type: 'slack' | 'discord' | 'custom',
  url: string
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'Invalid webhook URL' }
  }

  const testPayload: WebhookEventPayload = {
    eventType: 'high_value_lead',
    jobId: '~test_lead_001',
    jobTitle: 'Full-Stack Next.js & Stripe Infrastructure Project',
    jobUrl: 'https://www.upwork.com/jobs/~test_lead_001',
    clientName: 'Nexus Global Brands',
    dealValueUsd: 4500,
    hireRatePct: 88,
    totalSpendUsd: 65000,
    paymentVerified: true,
    memberName: 'Alex (Agency BD)',
    memberEmail: 'alex@agency.internal',
    status: 'drafting',
    notes: 'Testing GigRadar Webhook Integration from extension options.',
    timestamp: Date.now()
  }

  let body: unknown
  if (type === 'slack') {
    body = formatSlackBlocks(testPayload)
  } else if (type === 'discord') {
    body = formatDiscordEmbed(testPayload)
  } else {
    body = formatCustomJson(testPayload)
  }

  const ok = await postJson(url, body)
  if (ok) {
    return { success: true, message: 'Webhook delivered successfully!' }
  }
  return { success: false, message: 'Failed to deliver webhook. Check URL and CORS/endpoint status.' }
}
