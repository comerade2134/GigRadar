import { describe, expect, it } from 'vitest'
import { resolveCurrentIntel } from './active-intel'
import type { EnrichmentData } from '../types'

function intel(jobId: string, score: number): EnrichmentData {
  return {
    meta: {
      jobId,
      title: 'Job',
      url: '',
      proposalCount: null,
      postedText: null,
      descriptionSnippet: '',
      feedbacks: []
    },
    signals: {
      hireRatePct: null,
      totalSpendUsd: null,
      paymentVerified: null,
      daysSinceLastHire: null
    },
    score: { score, tier: 'MEDIUM', scored: true, components: [] },
    flags: [],
    nameGuess: null
  }
}

describe('resolveCurrentIntel', () => {
  it('uses the latest active snapshot for the same job', () => {
    const latest = intel('job-123', 63)
    expect(resolveCurrentIntel(latest, 'job-123', intel('job-123', 81))).toBe(latest)
  })

  it('keeps the fallback when the active snapshot belongs to another job', () => {
    const fallback = intel('job-123', 81)
    expect(resolveCurrentIntel(intel('job-456', 63), 'job-123', fallback)).toBe(fallback)
  })
})