import type { Provider } from '../types'
import { extensionContextValid } from '../context'

export interface ByokSettings {
  enabled: boolean
  provider: Provider
  apiKey: string
}

const STORAGE_KEY = 'gigradar:byok'

export const DEFAULT_BYOK: ByokSettings = {
  enabled: false,
  provider: 'openai',
  apiKey: ''
}

export async function loadByok(): Promise<ByokSettings> {
  if (!extensionContextValid()) return { ...DEFAULT_BYOK }
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY] as Partial<ByokSettings> | undefined
  if (!stored) return { ...DEFAULT_BYOK }
  return {
    enabled: !!stored.enabled,
    provider: stored.provider === 'anthropic' ? 'anthropic' : 'openai',
    apiKey: typeof stored.apiKey === 'string' ? stored.apiKey : ''
  }
}

export async function saveByok(settings: ByokSettings): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}

export async function requestAiOrigins(): Promise<boolean> {
  if (!extensionContextValid()) return false
  return chrome.permissions.request({
    origins: ['https://api.openai.com/*', 'https://api.anthropic.com/*']
  })
}

export async function hasAiOrigins(): Promise<boolean> {
  if (!extensionContextValid()) return false
  return chrome.permissions.contains({
    origins: ['https://api.openai.com/*', 'https://api.anthropic.com/*']
  })
}

export interface PolishHookContext {
  title: string
  description?: string
  clientName?: string | null
  techStack?: string[]
  budget?: string | null
  trueRate?: number | null
}

export function formatPolishPrompt(
  baseHook: string,
  context: string | PolishHookContext
): string {
  const ctx: PolishHookContext =
    typeof context === 'string' ? { title: context } : context

  const promptLines = [
    `Job Title: ${ctx.title}`,
    ctx.description ? `Job Context / Description: ${ctx.description.slice(0, 600)}` : '',
    ctx.clientName ? `Client First Name: ${ctx.clientName}` : '',
    ctx.techStack && ctx.techStack.length > 0 ? `Required Tech Stack: ${ctx.techStack.join(', ')}` : '',
    ctx.budget ? `Job Budget: ${ctx.budget}` : '',
    ctx.trueRate != null ? `Historical Client Hourly Rate: $${ctx.trueRate.toFixed(2)}/hr` : '',
    `\nBase Draft Hook:\n"${baseHook}"`
  ].filter(Boolean)

  return promptLines.join('\n\n')
}

export async function polishHook(
  baseHook: string,
  context: string | PolishHookContext
): Promise<{ ok: boolean; text: string }> {
  const settings = await loadByok()
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, text: 'BYOK is not configured. Add your API key in Settings.' }
  }
  if (!extensionContextValid()) {
    return { ok: false, text: 'GigRadar was reloaded — refresh this page and try again.' }
  }

  const prompt = formatPolishPrompt(baseHook, context)
  const message = {
    type: 'BYOK_POLISH',
    prompt,
    provider: settings.provider,
    apiKey: settings.apiKey
  }

  try {
    const response = (await chrome.runtime.sendMessage(message)) as
      | { ok: boolean; text: string }
      | undefined
    return response ?? { ok: false, text: 'No response from service worker.' }
  } catch (error) {
    return { ok: false, text: String(error instanceof Error ? error.message : error) }
  }
}

export async function generateClientDossierSummary(data: {
  title: string
  description: string
  hireRatePct: number | null
  totalSpendUsd: number | null
  ratingAvg: number | null
  ratingCount: number | null
  companyName: string | null
  companyDomain: string | null
  techStack: string[]
  feedbacks: string[]
}): Promise<{ ok: boolean; text: string }> {
  const settings = await loadByok()
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, text: 'BYOK is not configured. Add your API key in Settings.' }
  }
  if (!extensionContextValid()) {
    return { ok: false, text: 'GigRadar was reloaded — refresh this page and try again.' }
  }

  const prompt = [
    `Job Title: ${data.title}`,
    `Description: ${data.description.slice(0, 1000)}`,
    `Client Spend: ${data.totalSpendUsd != null ? `$${data.totalSpendUsd.toLocaleString()}` : 'Unknown'}`,
    `Hire Rate: ${data.hireRatePct != null ? `${data.hireRatePct}%` : 'Unknown'}`,
    `Rating: ${data.ratingAvg != null ? `${data.ratingAvg.toFixed(2)} (${data.ratingCount ?? 0} reviews)` : 'Unknown'}`,
    `Identified Company: ${data.companyName ?? 'Unknown'} (${data.companyDomain ? `Domain: ${data.companyDomain}` : 'No domain'})`,
    `Tech Stack: ${data.techStack.length > 0 ? data.techStack.join(', ') : 'Not specified'}`,
    `Past Client Feedback / Reviews:\n${data.feedbacks.slice(0, 6).map((f) => `- "${f.slice(0, 200)}"`).join('\n') || 'None visible'}`
  ].join('\n\n')

  const message = {
    type: 'BYOK_CLIENT_DOSSIER',
    prompt,
    provider: settings.provider,
    apiKey: settings.apiKey
  }

  try {
    const response = (await chrome.runtime.sendMessage(message)) as
      | { ok: boolean; text: string }
      | undefined
    return response ?? { ok: false, text: 'No response from service worker.' }
  } catch (error) {
    return { ok: false, text: String(error instanceof Error ? error.message : error) }
  }
}
