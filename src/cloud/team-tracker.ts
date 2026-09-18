import { extensionContextValid } from '../context'
import { getUserProfile } from './account'
import { normalizeJobId } from '../content/parse'
import { DOLLARS_PER_CONNECT } from '../engine/metrics'
import { dispatchWebhooks } from '../engine/webhooks'
import type {
  AgencyCollisionIntel,
  JobBudget,
  TeamCollisionMetrics,
  TeamJobActivity,
  TeamJobStatus,
  TeamMember
} from '../types'

export const TEAM_ACTIVITIES_KEY = 'gigradar:team_activities'
export const TEAM_COLLISION_METRICS_KEY = 'gigradar:team_collision_metrics'

export const TTL_BY_STATUS: Record<TeamJobStatus, number> = {
  viewing: 30 * 60 * 1000, // 30 minutes
  drafting: 4 * 60 * 60 * 1000, // 4 hours
  applied: 7 * 24 * 60 * 60 * 1000, // 7 days
  passed: 24 * 60 * 60 * 1000 // 24 hours
}

export const DEFAULT_COLLISION_METRICS: TeamCollisionMetrics = {
  collisionsPrevented: 0,
  connectsSaved: 0,
  dollarsSaved: 0,
  activeProposalsCount: 0
}

export async function getCurrentTeamMember(): Promise<TeamMember> {
  const profile = await getUserProfile()
  const emailHandle = profile.email ? profile.email.split('@')[0] : ''
  const fallbackName = emailHandle
    ? emailHandle.charAt(0).toUpperCase() + emailHandle.slice(1)
    : 'You'

  return {
    id: profile.userId || 'local_user',
    name: profile.tier === 'agency' && profile.teamName ? `${fallbackName} (Agency BD)` : fallbackName,
    email: profile.email || 'bd@agency.internal',
    role: 'Business Developer'
  }
}

export async function getTeamActivities(): Promise<TeamJobActivity[]> {
  if (!extensionContextValid()) return []
  try {
    const res = await chrome.storage.local.get(TEAM_ACTIVITIES_KEY)
    const stored = res[TEAM_ACTIVITIES_KEY] as TeamJobActivity[] | undefined
    if (!Array.isArray(stored)) return []

    const now = Date.now()
    // Filter out expired entries
    const unexpired = stored.filter((item) => item.expiresAt > now)

    // If some expired items were purged, save back cleaned list
    if (unexpired.length !== stored.length) {
      await chrome.storage.local.set({ [TEAM_ACTIVITIES_KEY]: unexpired })
    }

    return unexpired.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export async function saveTeamActivities(activities: TeamJobActivity[]): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [TEAM_ACTIVITIES_KEY]: activities })
}

export async function getJobTeamActivity(jobId: string): Promise<TeamJobActivity | null> {
  if (!jobId) return null
  const normalized = normalizeJobId(jobId).toLowerCase()
  const activities = await getTeamActivities()
  return (
    activities.find(
      (item) => normalizeJobId(item.jobId).toLowerCase() === normalized
    ) ?? null
  )
}

export async function checkTeamCollision(jobId: string): Promise<AgencyCollisionIntel> {
  if (!jobId) {
    return { isClaimed: false, activity: null, isCurrentMember: false }
  }

  const currentMember = await getCurrentTeamMember()
  const activity = await getJobTeamActivity(jobId)

  if (!activity || activity.status === 'passed') {
    return { isClaimed: false, activity: null, isCurrentMember: false }
  }

  const isCurrent = activity.memberId === currentMember.id

  let warningMessage: string | undefined
  if (!isCurrent) {
    const timeAgo = formatTimeAgo(activity.updatedAt)
    if (activity.status === 'applied') {
      warningMessage = `${activity.memberName} already submitted a proposal (${timeAgo})`
    } else if (activity.status === 'drafting') {
      warningMessage = `${activity.memberName} is actively drafting a proposal (${timeAgo})`
    } else {
      warningMessage = `${activity.memberName} is reviewing this job (${timeAgo})`
    }
  }

  return {
    isClaimed: true,
    activity,
    isCurrentMember: isCurrent,
    warningMessage
  }
}

export async function claimJobForTeam(params: {
  jobId: string
  jobTitle: string
  status: TeamJobStatus
  jobUrl?: string
  clientName?: string
  connectsCost?: number
  notes?: string
  dealValueUsd?: number | null
  budget?: JobBudget | null
  hireRatePct?: number | null
  totalSpendUsd?: number | null
  paymentVerified?: boolean | null
}): Promise<TeamJobActivity> {
  const currentMember = await getCurrentTeamMember()
  const now = Date.now()
  const ttl = TTL_BY_STATUS[params.status] ?? TTL_BY_STATUS.viewing
  const expiresAt = now + ttl

  const normalized = normalizeJobId(params.jobId)

  const activities = await getTeamActivities()
  const existingIdx = activities.findIndex(
    (item) => normalizeJobId(item.jobId).toLowerCase() === normalized.toLowerCase()
  )

  let preventedCollision = false
  if (existingIdx >= 0) {
    const existing = activities[existingIdx]
    // If another member was already drafting/applied and we are claiming or checking,
    // count this as a prevented collision
    if (existing.memberId !== currentMember.id && (existing.status === 'applied' || existing.status === 'drafting')) {
      preventedCollision = true
    }
  }

  const activity: TeamJobActivity = {
    jobId: normalized,
    jobTitle: params.jobTitle || 'Upwork Opportunity',
    jobUrl: params.jobUrl,
    clientName: params.clientName,
    memberId: currentMember.id,
    memberName: currentMember.name,
    memberEmail: currentMember.email,
    status: params.status,
    connectsSaved: params.connectsCost ?? 12,
    notes: params.notes,
    dealValueUsd: params.dealValueUsd,
    budget: params.budget,
    hireRatePct: params.hireRatePct,
    totalSpendUsd: params.totalSpendUsd,
    paymentVerified: params.paymentVerified,
    updatedAt: now,
    expiresAt
  }

  let updatedActivities: TeamJobActivity[]
  if (existingIdx >= 0) {
    updatedActivities = [...activities]
    updatedActivities[existingIdx] = activity
  } else {
    updatedActivities = [activity, ...activities]
  }

  await saveTeamActivities(updatedActivities)

  if (preventedCollision) {
    await recordCollisionPrevented(activity.connectsSaved || 12)
  }

  // Asynchronously dispatch webhooks
  try {
    const eventType = preventedCollision
      ? 'collision_prevented'
      : params.status === 'applied'
        ? 'job_applied'
        : (params.dealValueUsd ?? 0) >= 1000
          ? 'high_value_lead'
          : 'job_claimed'

    void dispatchWebhooks({
      eventType,
      jobId: normalized,
      jobTitle: activity.jobTitle,
      jobUrl: activity.jobUrl,
      clientName: activity.clientName,
      dealValueUsd: activity.dealValueUsd ?? 500,
      budget: activity.budget,
      hireRatePct: activity.hireRatePct,
      totalSpendUsd: activity.totalSpendUsd,
      paymentVerified: activity.paymentVerified ?? true,
      memberName: activity.memberName,
      memberEmail: activity.memberEmail,
      status: activity.status,
      notes: activity.notes,
      timestamp: now
    })
  } catch {
    // Non-blocking
  }

  return activity
}

export async function releaseJobClaim(jobId: string): Promise<void> {
  const normalized = normalizeJobId(jobId).toLowerCase()
  const activities = await getTeamActivities()
  const filtered = activities.filter(
    (item) => normalizeJobId(item.jobId).toLowerCase() !== normalized
  )
  await saveTeamActivities(filtered)
}

export async function clearAllTeamActivities(): Promise<void> {
  await saveTeamActivities([])
}

export async function getTeamCollisionMetrics(): Promise<TeamCollisionMetrics> {
  if (!extensionContextValid()) return { ...DEFAULT_COLLISION_METRICS }
  try {
    const res = await chrome.storage.local.get(TEAM_COLLISION_METRICS_KEY)
    const stored = res[TEAM_COLLISION_METRICS_KEY] as TeamCollisionMetrics | undefined
    const activities = await getTeamActivities()
    const activeCount = activities.filter((a) => a.status === 'drafting' || a.status === 'applied').length

    if (stored && typeof stored.collisionsPrevented === 'number') {
      return {
        ...stored,
        activeProposalsCount: activeCount
      }
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_COLLISION_METRICS }
}

export async function recordCollisionPrevented(
  connects = 12
): Promise<TeamCollisionMetrics> {
  if (!extensionContextValid()) return { ...DEFAULT_COLLISION_METRICS }
  const current = await getTeamCollisionMetrics()
  const updated: TeamCollisionMetrics = {
    collisionsPrevented: current.collisionsPrevented + 1,
    connectsSaved: current.connectsSaved + connects,
    dollarsSaved: Number(((current.connectsSaved + connects) * DOLLARS_PER_CONNECT).toFixed(2)),
    activeProposalsCount: current.activeProposalsCount
  }
  await chrome.storage.local.set({ [TEAM_COLLISION_METRICS_KEY]: updated })
  return updated
}

export async function seedSampleTeamActivities(): Promise<void> {
  const now = Date.now()

  const samples: TeamJobActivity[] = [
    {
      jobId: '~01a2b3c4d5e6f701',
      jobTitle: 'Full-Stack Next.js 14 & Supabase Platform Developer',
      jobUrl: 'https://www.upwork.com/jobs/~01a2b3c4d5e6f701',
      clientName: 'Apex Cloud Solutions',
      memberId: 'usr_sarah_lead',
      memberName: 'Sarah (Lead BD)',
      memberEmail: 'sarah.m@agency.internal',
      status: 'drafting',
      connectsSaved: 16,
      notes: 'Drafting custom pitch with Supabase migration case study.',
      updatedAt: now - 12 * 60 * 1000, // 12 mins ago
      expiresAt: now + TTL_BY_STATUS.drafting
    },
    {
      jobId: '~02b3c4d5e6f702',
      jobTitle: 'Senior React & TypeScript Engineer for AI Copilot',
      jobUrl: 'https://www.upwork.com/jobs/~02b3c4d5e6f702',
      clientName: 'NeuralDesk Inc',
      memberId: 'usr_alex_bd',
      memberName: 'Alex (Senior BD)',
      memberEmail: 'alex.r@agency.internal',
      status: 'applied',
      connectsSaved: 16,
      notes: 'Applied with portfolio tier-1 demo. Connects spent: 16.',
      updatedAt: now - 35 * 60 * 1000, // 35 mins ago
      expiresAt: now + TTL_BY_STATUS.applied
    },
    {
      jobId: '~03c4d5e6f703',
      jobTitle: 'Python Backend Developer for LLM Data Pipeline',
      jobUrl: 'https://www.upwork.com/jobs/~03c4d5e6f703',
      clientName: 'DataVanguard Labs',
      memberId: 'usr_david_partner',
      memberName: 'David K. (Agency Partner)',
      memberEmail: 'david@agency.internal',
      status: 'viewing',
      connectsSaved: 8,
      notes: 'Checking client budget and hire rate.',
      updatedAt: now - 4 * 60 * 1000, // 4 mins ago
      expiresAt: now + TTL_BY_STATUS.viewing
    }
  ]

  await saveTeamActivities(samples)

  const seedMetrics: TeamCollisionMetrics = {
    collisionsPrevented: 8,
    connectsSaved: 112,
    dollarsSaved: Number((112 * DOLLARS_PER_CONNECT).toFixed(2)),
    activeProposalsCount: 2
  }
  await chrome.storage.local.set({ [TEAM_COLLISION_METRICS_KEY]: seedMetrics })
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp)
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
