import type { ClientSignals, RedFlag, ScoreResult } from '../types'

export type BidAction = 'BID' | 'CONSIDER' | 'SKIP'
export type BidRisk = 'LOW' | 'MEDIUM' | 'HIGH'

export interface BidDecision {
  action: BidAction
  risk: BidRisk
  summary: string
  reasons: string[]
  recommendation: string
}

export function makeBidDecision(input: {
  signals: ClientSignals
  score: ScoreResult
  flags: RedFlag[]
  proposalCount: number | null
}): BidDecision {
  const dangerFlags = input.flags.filter((flag) => flag.level === 'danger')
  const warningFlags = input.flags.filter((flag) => flag.level === 'warn')
  const reasons: string[] = []

  if (input.signals.hireRatePct != null) {
    reasons.push(`${Math.round(input.signals.hireRatePct)}% hire rate`)
  }
  if (input.signals.totalSpendUsd != null) {
    reasons.push(
      input.signals.totalSpendUsd > 0
        ? `${formatSpend(input.signals.totalSpendUsd)} spent`
        : '$0 spent'
    )
  }
  if (input.signals.paymentVerified === true) reasons.push('payment verified')
  if (input.proposalCount != null) {
    reasons.push(
      input.proposalCount >= 50
        ? '50+ proposals'
        : `${input.proposalCount} proposals`
    )
  }

  for (const flag of input.flags) {
    if (!reasons.includes(flag.text)) reasons.push(flag.text)
    if (reasons.length >= 3) break
  }

  if (dangerFlags.length > 0) {
    const dangerText = dangerFlags[0].text.toLowerCase()
    let rec = 'Protect your Connects — avoid submitting proposals until risk factors are resolved.'
    if (dangerText.includes('payment') || dangerText.includes('unverified')) {
      rec = 'Do not submit proposals or share work until the client verifies payment and funds an escrow milestone.'
    } else if (dangerText.includes('scam') || dangerText.includes('telegram') || dangerText.includes('whatsapp')) {
      rec = 'Critical risk of off-platform contact — report this listing and never communicate outside Upwork.'
    }
    return {
      action: 'SKIP',
      risk: 'HIGH',
      summary: 'High risk — protect your Connects',
      reasons: reasons.slice(0, 3),
      recommendation: rec
    }
  }

  if (!input.score.scored) {
    return {
      action: 'CONSIDER',
      risk: 'MEDIUM',
      summary: 'Not enough client data to decide confidently',
      reasons: reasons.slice(0, 3),
      recommendation: 'Open the full client profile before spending Connects.'
    }
  }

  if (input.score.score >= 70 && warningFlags.length === 0) {
    return {
      action: 'BID',
      risk: 'LOW',
      summary: 'Strong client signals — worth a tailored proposal',
      reasons: reasons.slice(0, 3),
      recommendation: 'Lead with the result you can deliver in the first two weeks.'
    }
  }

  if (input.score.score < 40 || warningFlags.length >= 2) {
    return {
      action: 'SKIP',
      risk: 'HIGH',
      summary: 'Weak signals — keep your Connects',
      reasons: reasons.slice(0, 3),
      recommendation: 'Skip unless the project is an unusually strong fit.'
    }
  }

  return {
    action: 'CONSIDER',
    risk: 'MEDIUM',
    summary: 'Mixed signals — inspect the details before bidding',
    reasons: reasons.slice(0, 3),
    recommendation: 'Resolve the warning signals before you commit Connects.'
  }
}

function formatSpend(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(usd >= 10_000 ? 0 : 1)}k`
  return `$${Math.round(usd)}`
}