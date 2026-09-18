import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  TEAM_ACTIVITIES_KEY,
  TTL_BY_STATUS,
  checkTeamCollision,
  claimJobForTeam,
  clearAllTeamActivities,
  getCurrentTeamMember,
  getJobTeamActivity,
  getTeamActivities,
  getTeamCollisionMetrics,
  recordCollisionPrevented,
  releaseJobClaim,
  seedSampleTeamActivities
} from './team-tracker'
import { ACCOUNT_STORAGE_KEY } from './account'
import type { UserProfile } from '../types'

describe('agency team tracker & collision prevention', () => {
  let mockStorage: Record<string, unknown> = {}

  beforeEach(() => {
    mockStorage = {}

    // Global chrome mock
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

  it('identifies current team member from user profile', async () => {
    const profile: UserProfile = {
      userId: 'usr_sarah',
      email: 'sarah@agency.com',
      tier: 'agency',
      teamName: 'Growth Alpha'
    }
    mockStorage[ACCOUNT_STORAGE_KEY] = profile

    const member = await getCurrentTeamMember()
    expect(member.id).toBe('usr_sarah')
    expect(member.name).toContain('Sarah')
    expect(member.email).toBe('sarah@agency.com')
  })

  it('claims a job and computes appropriate TTL expiration', async () => {
    const activity = await claimJobForTeam({
      jobId: '~01abc1234567890',
      jobTitle: 'Senior React Developer',
      status: 'drafting',
      connectsCost: 16
    })

    expect(activity.jobId).toBe('01abc1234567890')
    expect(activity.status).toBe('drafting')
    expect(activity.connectsSaved).toBe(16)
    expect(activity.expiresAt).toBeGreaterThan(Date.now() + TTL_BY_STATUS.drafting - 1000)

    const activities = await getTeamActivities()
    expect(activities.length).toBe(1)
    expect(activities[0].jobId).toBe('01abc1234567890')
  })

  it('normalizes jobId when retrieving team activity', async () => {
    await claimJobForTeam({
      jobId: '~01ABCDEF999',
      jobTitle: 'AI Engineer',
      status: 'applied'
    })

    const foundWithTilde = await getJobTeamActivity('~01abcdef999')
    const foundWithoutTilde = await getJobTeamActivity('01abcdef999')

    expect(foundWithTilde).not.toBeNull()
    expect(foundWithTilde?.jobTitle).toBe('AI Engineer')
    expect(foundWithoutTilde).not.toBeNull()
    expect(foundWithoutTilde?.jobTitle).toBe('AI Engineer')
  })

  it('detects collision when another member has claimed the job', async () => {
    // Current user is usr_user1
    mockStorage[ACCOUNT_STORAGE_KEY] = {
      userId: 'usr_user1',
      email: 'user1@agency.com',
      tier: 'agency'
    }

    // Teammate Alex applied
    mockStorage[TEAM_ACTIVITIES_KEY] = [
      {
        jobId: '~01targetjob',
        jobTitle: 'Python Data Engineer',
        memberId: 'usr_alex',
        memberName: 'Alex (Senior BD)',
        memberEmail: 'alex@agency.com',
        status: 'applied',
        connectsSaved: 16,
        updatedAt: Date.now() - 10 * 60 * 1000,
        expiresAt: Date.now() + TTL_BY_STATUS.applied
      }
    ]

    const collision = await checkTeamCollision('~01targetjob')
    expect(collision.isClaimed).toBe(true)
    expect(collision.isCurrentMember).toBe(false)
    expect(collision.activity?.memberName).toBe('Alex (Senior BD)')
    expect(collision.warningMessage).toContain('Alex (Senior BD) already submitted a proposal')
  })

  it('recognizes when current user is the claimant', async () => {
    mockStorage[ACCOUNT_STORAGE_KEY] = {
      userId: 'usr_current',
      email: 'me@agency.com',
      tier: 'agency'
    }

    await claimJobForTeam({
      jobId: '~01myjob',
      jobTitle: 'Design System Lead',
      status: 'drafting'
    })

    const collision = await checkTeamCollision('~01myjob')
    expect(collision.isClaimed).toBe(true)
    expect(collision.isCurrentMember).toBe(true)
    expect(collision.warningMessage).toBeUndefined()
  })

  it('filters out expired activities automatically', async () => {
    mockStorage[TEAM_ACTIVITIES_KEY] = [
      {
        jobId: '~01expired',
        jobTitle: 'Old Job',
        memberId: 'usr_someone',
        memberName: 'Someone',
        status: 'viewing',
        updatedAt: Date.now() - 60 * 60 * 1000,
        expiresAt: Date.now() - 10 * 1000 // Expired 10s ago
      },
      {
        jobId: '~01active',
        jobTitle: 'Active Job',
        memberId: 'usr_someone',
        memberName: 'Someone',
        status: 'drafting',
        updatedAt: Date.now() - 5 * 60 * 1000,
        expiresAt: Date.now() + 100000 // Unexpired
      }
    ]

    const activities = await getTeamActivities()
    expect(activities.length).toBe(1)
    expect(activities[0].jobId).toBe('~01active')
  })

  it('releases a claimed job', async () => {
    await claimJobForTeam({
      jobId: '~01releaseme',
      jobTitle: 'Job to Release',
      status: 'drafting'
    })

    let activities = await getTeamActivities()
    expect(activities.length).toBe(1)

    await releaseJobClaim('~01releaseme')
    activities = await getTeamActivities()
    expect(activities.length).toBe(0)
  })

  it('clears all team activities', async () => {
    await seedSampleTeamActivities()
    let activities = await getTeamActivities()
    expect(activities.length).toBe(3)

    await clearAllTeamActivities()
    activities = await getTeamActivities()
    expect(activities.length).toBe(0)
  })

  it('records collision prevention and tracks connects & dollar savings', async () => {
    const metrics1 = await recordCollisionPrevented(16)
    expect(metrics1.collisionsPrevented).toBe(1)
    expect(metrics1.connectsSaved).toBe(16)
    expect(metrics1.dollarsSaved).toBe(2.4) // 16 * $0.15

    const metrics2 = await recordCollisionPrevented(12)
    expect(metrics2.collisionsPrevented).toBe(2)
    expect(metrics2.connectsSaved).toBe(28)
    expect(metrics2.dollarsSaved).toBe(4.2)
  })

  it('seeds sample team activities and metrics', async () => {
    await seedSampleTeamActivities()
    const activities = await getTeamActivities()
    const metrics = await getTeamCollisionMetrics()

    expect(activities.length).toBe(3)
    expect(activities.some((a) => a.memberName.includes('Sarah'))).toBe(true)
    expect(activities.some((a) => a.memberName.includes('Alex'))).toBe(true)
    expect(metrics.collisionsPrevented).toBe(8)
    expect(metrics.connectsSaved).toBe(112)
    expect(metrics.dollarsSaved).toBe(16.8)
  })
})
