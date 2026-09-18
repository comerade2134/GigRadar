import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_SYNC_STATE,
  getSyncState,
  getTeamSharedIntel,
  addTeamSharedIntel,
  isClientFlaggedByTeam,
  triggerCloudSync
} from './sync'
import { saveUserProfile } from './account'

// Mock metrics
vi.mock('../engine/metrics', () => ({
  getConnectsSaved: vi.fn(async () => 140)
}))

describe('cloud sync engine', () => {
  let mockStorage: Record<string, unknown> = {}

  beforeEach(() => {
    mockStorage = {}

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

  it('returns default sync state when storage is empty', async () => {
    const state = await getSyncState()
    expect(state).toEqual(DEFAULT_SYNC_STATE)
    expect(state.syncStatus).toBe('offline')
  })

  it('remains offline on triggerCloudSync when user is on free tier', async () => {
    await saveUserProfile({
      userId: 'usr_free',
      email: '',
      tier: 'free'
    })

    const outcome = await triggerCloudSync()
    expect(outcome.syncStatus).toBe('offline')
    expect(outcome.lastSyncedAt).toBeNull()
  })

  it('synchronizes successfully for Pro Freelancer tier', async () => {
    await saveUserProfile({
      userId: 'usr_pro_123',
      email: 'alex@freelance.io',
      tier: 'pro_freelancer'
    })

    const outcome = await triggerCloudSync()
    expect(outcome.syncStatus).toBe('synced')
    expect(outcome.lastSyncedAt).toBeTypeOf('number')
  })

  it('synchronizes and populates team intel for Agency tier', async () => {
    await saveUserProfile({
      userId: 'usr_agency_lead',
      email: 'sarah@agency.com',
      tier: 'agency',
      teamId: 'team_xyz'
    })

    const outcome = await triggerCloudSync()
    expect(outcome.syncStatus).toBe('synced')

    const teamIntel = await getTeamSharedIntel()
    expect(teamIntel.length).toBeGreaterThan(0)
    expect(teamIntel.some((i) => i.clientKey === 'org_acme_ghost')).toBe(true)
  })

  it('adds and identifies team shared intelligence', async () => {
    await addTeamSharedIntel({
      clientKey: 'org_bad_client_99',
      clientName: 'Shady Corp',
      flaggedBy: 'Dave (Team Lead)',
      reason: 'Asks for uncompensated test tasks'
    })

    const intel = await getTeamSharedIntel()
    expect(intel.length).toBe(1)
    expect(intel[0].clientKey).toBe('org_bad_client_99')

    const found = await isClientFlaggedByTeam('ORG_BAD_CLIENT_99')
    expect(found).toBeDefined()
    expect(found?.clientName).toBe('Shady Corp')

    const notFound = await isClientFlaggedByTeam('legit_client')
    expect(notFound).toBeUndefined()
  })
})
