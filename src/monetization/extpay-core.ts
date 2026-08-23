export const EXTPAY_EXTENSION_ID = 'REPLACE_WITH_EXTENSIONPAY_EXTENSION_ID'

const LICENSE_KEY = 'gigradar:license'
export const LICENSE_TTL_MS = 24 * 60 * 60 * 1000

export interface CachedLicense {
  paid: boolean
  checkedAt: number
}

export async function readCachedLicense(): Promise<CachedLicense | undefined> {
  const result = await chrome.storage.local.get(LICENSE_KEY)
  return result[LICENSE_KEY] as CachedLicense | undefined
}

export async function writeCachedLicense(paid: boolean): Promise<void> {
  await chrome.storage.local.set({
    [LICENSE_KEY]: { paid, checkedAt: Date.now() } satisfies CachedLicense
  })
}

export async function getCachedLicense(): Promise<boolean> {
  const cached = await readCachedLicense()
  return !!cached?.paid
}
