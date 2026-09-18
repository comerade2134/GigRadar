import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_USER_PROFILE,
  getUserProfile,
  saveUserProfile,
  getAccountTier,
  loginWithToken,
  logoutAccount
} from './account'
import type { UserProfile } from '../types'

// Mock getCachedLicense
vi.mock('../monetization/extpay-core', () => ({
  getCachedLicense: vi.fn(async () => false)
}))

import { getCachedLicense } from '../monetization/extpay-core'

describe('cloud account management', () => {
  let mockStorage: Record<string, unknown> = {}

  beforeEach(() => {
    mockStorage = {}
    vi.mocked(getCachedLicense).mockResolvedValue(false)

    // Setup global chrome mock
    globalThis.chrome = {
      runtime: { id: 'test-gigradar-extension' },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const result: Record<string, unknown> = {}
            const keyList = Array.isArray(keys) ? keys : [keys]
            for (const k of keyList) {
              if (k in mockStorage) {
                result[k] = mockStorage[k]
              }
            }
            return result
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(mockStorage, items)
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys]
            for (const k of keyList) {
              delete mockStorage[k]
            }
          })
        }
      }
    } as unknown as typeof chrome
  })

  it('returns default user profile when storage is empty', async () => {
    const profile = await getUserProfile()
    expect(profile).toEqual(DEFAULT_USER_PROFILE)
    expect(profile.tier).toBe('free')
  })

  it('saves and retrieves user profile from storage', async () => {
    const customProfile: UserProfile = {
      userId: 'usr_abc123',
      email: 'alex@agency.io',
      tier: 'agency',
      teamId: 'team_alpha',
      seatLimit: 5,
      activeSeats: 2
    }

    await saveUserProfile(customProfile)
    const retrieved = await getUserProfile()
    expect(retrieved).toEqual(customProfile)
  })

  it('determines account tier as free by default', async () => {
    const tier = await getAccountTier()
    expect(tier).toBe('free')
  })

  it('determines account tier as pro_freelancer if ExtPay license is active', async () => {
    vi.mocked(getCachedLicense).mockResolvedValue(true)
    const tier = await getAccountTier()
    expect(tier).toBe('pro_freelancer')
  })

  it('determines account tier from stored profile tier', async () => {
    await saveUserProfile({
      userId: 'usr_pro',
      email: 'dev@pro.io',
      tier: 'pro_freelancer'
    })
    expect(await getAccountTier()).toBe('pro_freelancer')

    await saveUserProfile({
      userId: 'usr_agency',
      email: 'owner@team.io',
      tier: 'agency'
    })
    expect(await getAccountTier()).toBe('agency')
  })

  it('handles token login for Agency teams', async () => {
    const result = await loginWithToken('agency_growth_pack_99', 'lead@agency.com')
    expect(result.success).toBe(true)
    expect(result.profile.tier).toBe('agency')
    expect(result.profile.seatLimit).toBe(10)
    expect(result.profile.email).toBe('lead@agency.com')

    const currentTier = await getAccountTier()
    expect(currentTier).toBe('agency')
  })

  it('handles token login for Pro Freelancer licenses', async () => {
    const result = await loginWithToken('pro_license_key_2026_xyz')
    expect(result.success).toBe(true)
    expect(result.profile.tier).toBe('pro_freelancer')
    expect(result.profile.email).toContain('@gigradar.app')

    const currentTier = await getAccountTier()
    expect(currentTier).toBe('pro_freelancer')
  })

  it('rejects invalid or empty tokens', async () => {
    const emptyRes = await loginWithToken('   ')
    expect(emptyRes.success).toBe(false)
    expect(emptyRes.error).toBe('Token cannot be empty')

    const invalidRes = await loginWithToken('short')
    expect(invalidRes.success).toBe(false)
    expect(invalidRes.error).toBe('Invalid license or team token format')
  })

  it('clears profile on logoutAccount', async () => {
    await saveUserProfile({
      userId: 'usr_active',
      email: 'logged@in.com',
      tier: 'pro_freelancer'
    })
    expect((await getUserProfile()).userId).toBe('usr_active')

    await logoutAccount()
    expect(await getUserProfile()).toEqual(DEFAULT_USER_PROFILE)
    expect(await getAccountTier()).toBe('free')
  })
})
