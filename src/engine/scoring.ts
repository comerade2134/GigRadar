import type {
  ActivityStats,
  ClientSignals,
  JobBudget,
  RedFlag,
  ScoreResult,
  SentimentReport,
  SignalComponent,
  Tier,
  TrueRateBenchmark
} from '../types'
import { SCAM_FLAG_TEXT } from './red-flags'
import { TEMPERAMENT_FLAG_TEXT } from './sentiment'

const WEIGHTS = {
  hireRate: 0.4,
  spend: 0.3,
  verified: 0.2,
  recency: 0.1
} as const

const SPEND_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1000, 0.25],
  [10000, 0.5],
  [50000, 0.75],
  [100000, 1]
]

function spendTier(usd: number): number {
  if (usd <= 0) return 0
  if (usd >= SPEND_STOPS[SPEND_STOPS.length - 1][0]) return 1
  for (let i = 1; i < SPEND_STOPS.length; i++) {
    const [hi, vHi] = SPEND_STOPS[i]
    const [lo, vLo] = SPEND_STOPS[i - 1]
    if (usd <= hi) {
      return vLo + ((usd - lo) / (hi - lo)) * (vHi - vLo)
    }
  }
  return 1
}

export function formatUsd(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `$${k >= 100 ? Math.round(k) : k.toFixed(1)}k`
  }
  return `$${Math.round(n)}`
}

function recencyValue(days: number): number {
  if (days <= 7) return 1
  if (days <= 30) return 0.8
  if (days <= 90) return 0.5
  if (days <= 180) return 0.3
  if (days <= 365) return 0.15
  return 0.05
}

function recencyDisplay(days: number): string {
  if (days <= 1) return '<1 day ago'
  if (days < 30) return `${Math.round(days)} days ago`
  if (days < 365) return `${Math.round(days / 30)} mo ago`
  return `${Math.round(days / 365)} yr ago`
}

export function scoreClient(signals: ClientSignals): ScoreResult {
  const components: SignalComponent[] = [
    {
      label: 'Hire rate',
      weight: WEIGHTS.hireRate,
      value:
        signals.hireRatePct == null
          ? null
          : Math.min(Math.max(signals.hireRatePct, 0), 100) / 100,
      display:
        signals.hireRatePct == null ? null : `${Math.round(signals.hireRatePct)}%`
    },
    {
      label: 'Total spend',
      weight: WEIGHTS.spend,
      value: signals.totalSpendUsd == null ? null : spendTier(signals.totalSpendUsd),
      display:
        signals.totalSpendUsd == null ? null : formatUsd(signals.totalSpendUsd)
    },
    {
      label: 'Payment verified',
      weight: WEIGHTS.verified,
      value:
        signals.paymentVerified == null ? null : signals.paymentVerified ? 1 : 0,
      display:
        signals.paymentVerified == null
          ? null
          : signals.paymentVerified
            ? 'Yes'
            : 'No'
    },
    {
      label: 'Recent hiring',
      weight: WEIGHTS.recency,
      value:
        signals.daysSinceLastHire == null
          ? null
          : recencyValue(signals.daysSinceLastHire),
      display:
        signals.daysSinceLastHire == null
          ? null
          : recencyDisplay(signals.daysSinceLastHire)
    }
  ]

  const active = components.filter(
    (c): c is SignalComponent & { value: number } => c.value != null
  )
  const activeWeight = active.reduce((sum, c) => sum + c.weight, 0)
  const scored = active.length > 0 && activeWeight > 0

  let score = 0
  if (scored) {
    const weighted = active.reduce((sum, c) => sum + c.weight * c.value, 0)
    score = Math.round((weighted / activeWeight) * 100)
  }

  const tier: Tier = !scored
    ? 'LOW'
    : score >= 70
      ? 'HIGH'
      : score >= 40
        ? 'MEDIUM'
        : 'LOW'
  return { score, tier, scored, components }
}

export interface RedFlagInputs {
  signals: ClientSignals
  proposalCount: number | null
  activity?: ActivityStats | null
  budget?: JobBudget | null
  trueRate?: TrueRateBenchmark | null
  sentiment?: SentimentReport | null
  scamMatched?: boolean
}

export function computeRedFlags(inputs: RedFlagInputs): RedFlag[] {
  const { signals, proposalCount } = inputs
  const flags: RedFlag[] = []

  if (inputs.scamMatched) {
    flags.push({ level: 'danger', text: SCAM_FLAG_TEXT })
  }

  if (signals.hireRatePct != null && signals.hireRatePct < 25) {
    flags.push({
      level: 'danger',
      text: `Low hire rate (${Math.round(signals.hireRatePct)}%) — most proposals die here`
    })
  }
  if (signals.paymentVerified === false) {
    flags.push({
      level: 'danger',
      text: 'Payment method unverified — payout risk'
    })
  }
  if (proposalCount != null && proposalCount >= 50) {
    flags.push({
      level: 'warn',
      text: `${proposalCount >= 9999 ? '50+' : proposalCount} proposals — crowded bid pool`
    })
  }
  if (signals.totalSpendUsd === 0) {
    flags.push({
      level: 'warn',
      text: 'Client has never paid on Upwork ($0 spent)'
    })
  }

  const activity = inputs.activity
  if (activity?.interviewingCount != null && activity.interviewingCount >= 3) {
    flags.push({
      level: 'danger',
      text: `⛔ Inactive / ${activity.interviewingCount}+ Freelancers Already Interviewing`
    })
  } else if (
    activity != null &&
    activity.invitesSentCount != null &&
    activity.invitesSentCount > 10 &&
    activity.interviewingCount === 0
  ) {
    flags.push({
      level: 'warn',
      text: '⚠️ Low Conversion / Mass Inviting'
    })
  }

  const trueRate = inputs.trueRate
  const budget = inputs.budget
  if (
    budget?.type === 'hourly' &&
    budget.maxUsd != null &&
    trueRate?.medianHourlyUsd != null &&
    trueRate.medianHourlyUsd > 0
  ) {
    const listed = budget.maxUsd
    if (listed >= trueRate.medianHourlyUsd * 1.5) {
      flags.push({
        level: 'warn',
        text: `Listed budget inflated vs actual payouts (${fmtRate(listed)} listed vs ${fmtRate(
          trueRate.medianHourlyUsd
        )} median paid)`
      })
    }
  }

  if (inputs.sentiment?.level === 'negative') {
    flags.push({ level: 'danger', text: TEMPERAMENT_FLAG_TEXT })
  }

  return flags
}

function fmtRate(usd: number): string {
  return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}/hr`
}

export interface FeedAlert {
  level: "high" | "danger" | "warn"
  text: string
}

export function feedAlert(
  signals: ClientSignals,
  proposalCount: number | null,
  scamMatched = false
): FeedAlert | null {
  if (scamMatched) {
    return { level: "danger", text: "\u{1F6A8} Scam / Off-Platform Risk" }
  }

  const hire = signals.hireRatePct
  const spend = signals.totalSpendUsd

  if (
    hire != null &&
    hire > 70 &&
    signals.paymentVerified === true &&
    (spend ?? 0) > 10_000
  ) {
    return { level: "high", text: "\u{1F525} High-Intent Buyer" }
  }

  if (hire != null && hire < 30) {
    return {
      level: "warn",
      text: "\u26A0\uFE0F Low Hire Rate (" + Math.round(hire) + "%) \u2014 Connects Risk"
    }
  }

  if (proposalCount != null && proposalCount >= 50 && (spend ?? 0) < 10_000) {
    return { level: "danger", text: "\u26D4 Saturated (50+ Proposals)" }
  }

  if (signals.paymentVerified === false) {
    return { level: "warn", text: "\u26A0\uFE0F Unverified Payment" }
  }

  return null
}
