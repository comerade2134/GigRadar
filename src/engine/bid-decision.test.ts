import { describe, expect, it } from 'vitest'
import { makeBidDecision } from './bid-decision'
import type { ClientSignals, RedFlag, ScoreResult } from '../types'

const signals: ClientSignals = {
  hireRatePct: 88,
  totalSpendUsd: 42_500,
  paymentVerified: true,
  daysSinceLastHire: 7
}

function score(score: number, scored = true): ScoreResult {
  return { score, tier: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW', scored, components: [] }
}

describe('makeBidDecision', () => {
  it('recommends bidding on strong, clean signals', () => {
    const decision = makeBidDecision({
      signals,
      score: score(86),
      flags: [],
      proposalCount: 5
    })

    expect(decision.action).toBe('BID')
    expect(decision.risk).toBe('LOW')
    expect(decision.reasons).toContain('88% hire rate')
  })

  it('recommends skipping a danger-flagged listing regardless of score', () => {
    const flags: RedFlag[] = [{ level: 'danger', text: 'Payment method unverified' }]
    const decision = makeBidDecision({
      signals,
      score: score(92),
      flags,
      proposalCount: 2
    })

    expect(decision.action).toBe('SKIP')
    expect(decision.risk).toBe('HIGH')
  })

  it('keeps incomplete data in the consider state', () => {
    const decision = makeBidDecision({
      signals: { ...signals, hireRatePct: null, totalSpendUsd: null },
      score: score(0, false),
      flags: [],
      proposalCount: null
    })

    expect(decision.action).toBe('CONSIDER')
    expect(decision.recommendation).toContain('full client profile')
  })
})