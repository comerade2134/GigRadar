import ExtPay from '../vendor/extpay.module'
import {
  EXTPAY_EXTENSION_ID,
  isCachedLicenseFresh,
  readCachedLicense,
  shouldRefreshLicense,
  writeCachedLicense
} from './extpay-core'

const extpay = ExtPay(EXTPAY_EXTENSION_ID)

export { EXTPAY_EXTENSION_ID, getCachedLicense, PRO_PRICE, PRO_PRICE_NOTE } from './extpay-core'

export async function syncLicense(force = false): Promise<boolean> {
  const cached = await readCachedLicense()
  if (!shouldRefreshLicense(cached, force)) return cached!.paid

  let paid: boolean
  try {
    const user = await extpay.getUser()
    paid = !!user.paid || user.subscriptionStatus === 'active'
  } catch {
    return !!cached?.paid
  }

  await writeCachedLicense(paid)
  return paid
}

export function openUpgradeFlow(): boolean {
  try {
    extpay.openPaymentPage()
    return true
  } catch {
    return false
  }
}

export async function warmLicenseCache(): Promise<void> {
  const cached = await readCachedLicense()
  if (!isCachedLicenseFresh(cached)) {
    void syncLicense().catch(() => undefined)
  }
}
