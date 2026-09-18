import { extensionContextValid } from '../context'

export const EXTPAY_EXTENSION_ID = 'gigradar'

// Early-bird ladder: bump PRO_PRICE (and flip the tagline off) once the
// first 50 licenses are sold. Keep this copy in sync with the ExtPay plan.
export const PRO_PRICE = '$9.99'
export const PRO_PRICE_NOTE = 'First 50 freelancers · then $19.99'

const LICENSE_KEY = 'gigradar:license'
export const LICENSE_TTL_MS = 24 * 60 * 60 * 1000

export interface CachedLicense {
  paid: boolean
  checkedAt: number
}

export function isCachedLicenseFresh(
  cached: CachedLicense | undefined,
  now = Date.now()
): boolean {
  return (
    cached != null &&
    typeof cached.checkedAt === 'number' &&
    cached.checkedAt <= now &&
    now - cached.checkedAt < LICENSE_TTL_MS
  )
}

export function shouldRefreshLicense(
  cached: CachedLicense | undefined,
  force: boolean,
  now = Date.now()
): boolean {
  return force || !isCachedLicenseFresh(cached, now)
}

export async function readCachedLicense(): Promise<CachedLicense | undefined> {
  if (!extensionContextValid()) return undefined
  const result = await chrome.storage.local.get(LICENSE_KEY)
  const cached = result[LICENSE_KEY] as Partial<CachedLicense> | undefined
  if (typeof cached?.paid !== 'boolean' || typeof cached.checkedAt !== 'number') {
    return undefined
  }
  return { paid: cached.paid, checkedAt: cached.checkedAt }
}

export async function writeCachedLicense(paid: boolean): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({
    [LICENSE_KEY]: { paid, checkedAt: Date.now() } satisfies CachedLicense
  })
}

export async function getCachedLicense(): Promise<boolean> {
  const cached = await readCachedLicense()
  return !!cached?.paid
}
