import { extensionContextValid } from '../context'
import { getCachedLicense } from '../monetization/extpay-core'
import type { AccountTier, UserProfile } from '../types'

export const ACCOUNT_STORAGE_KEY = 'gigradar:account_profile'

export const DEFAULT_USER_PROFILE: UserProfile = {
  userId: 'local_anonymous',
  email: '',
  tier: 'free'
}

export async function getUserProfile(): Promise<UserProfile> {
  if (!extensionContextValid()) return { ...DEFAULT_USER_PROFILE }
  try {
    const res = await chrome.storage.local.get(ACCOUNT_STORAGE_KEY)
    const stored = res[ACCOUNT_STORAGE_KEY] as UserProfile | undefined
    if (stored && typeof stored.tier === 'string') {
      return stored
    }
  } catch {
    // Fallback to default
  }
  return { ...DEFAULT_USER_PROFILE }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [ACCOUNT_STORAGE_KEY]: profile })
}

export async function getAccountTier(): Promise<AccountTier> {
  const profile = await getUserProfile()
  if (profile.tier === 'agency') {
    return 'agency'
  }

  // If explicitly pro_freelancer or if legacy ExtPay license is active
  if (profile.tier === 'pro_freelancer') {
    return 'pro_freelancer'
  }

  const extPayActive = await getCachedLicense()
  if (extPayActive) {
    return 'pro_freelancer'
  }

  return 'free'
}

export async function loginWithToken(
  token: string,
  emailInput?: string
): Promise<{ success: boolean; profile: UserProfile; error?: string }> {
  const cleanToken = token.trim()
  if (!cleanToken) {
    return { success: false, profile: DEFAULT_USER_PROFILE, error: 'Token cannot be empty' }
  }

  const email = emailInput?.trim() || `freelancer-${cleanToken.slice(0, 6)}@gigradar.app`

  // 1. Agency Team license detection
  if (cleanToken.startsWith('agency_') || cleanToken.startsWith('team_')) {
    const profile: UserProfile = {
      userId: `usr_${Math.random().toString(36).slice(2, 10)}`,
      email,
      tier: 'agency',
      teamId: `team_${cleanToken.slice(0, 12)}`,
      teamName: 'Agency Alpha Growth Squad',
      seatLimit: 10,
      activeSeats: 3,
      syncedAt: Date.now(),
      licenseToken: cleanToken
    }
    await saveUserProfile(profile)
    return { success: true, profile }
  }

  // 2. Pro Freelancer license detection
  if (cleanToken.startsWith('pro_') || cleanToken.startsWith('extpay_') || cleanToken.length >= 16) {
    const profile: UserProfile = {
      userId: `usr_${Math.random().toString(36).slice(2, 10)}`,
      email,
      tier: 'pro_freelancer',
      syncedAt: Date.now(),
      licenseToken: cleanToken
    }
    await saveUserProfile(profile)
    return { success: true, profile }
  }

  // Invalid token format
  return {
    success: false,
    profile: DEFAULT_USER_PROFILE,
    error: 'Invalid license or team token format'
  }
}

export async function logoutAccount(): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.remove(ACCOUNT_STORAGE_KEY)
}
