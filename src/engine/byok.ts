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

export async function polishHook(
  baseHook: string,
  jobTitle: string
): Promise<{ ok: boolean; text: string }> {
  const settings = await loadByok()
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, text: 'BYOK is not configured. Add your API key in Settings.' }
  }
  if (!extensionContextValid()) {
    return { ok: false, text: 'GigRadar was reloaded — refresh this page and try again.' }
  }

  const message = {
    type: 'BYOK_POLISH',
    prompt: `Job title: ${jobTitle}\n\nBase opener:\n${baseHook}`,
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
