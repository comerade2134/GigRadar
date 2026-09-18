import { describe, expect, it } from 'vitest'
import { mergeIntelCacheEntry, type IntelCacheEntry } from './intel-cache'
import type { EnrichmentData } from '../types'
import { isCachedLicenseFresh, LICENSE_TTL_MS } from '../monetization/extpay-core'

function enrichment(nameGuess: EnrichmentData['nameGuess'], descriptionSnippet = ''): EnrichmentData {
  return {
    meta: {
      jobId: 'job-123',
      title: 'Build a dashboard',
      url: 'https://www.upwork.com/jobs/~job-123',
      proposalCount: null,
      postedText: null,
      descriptionSnippet,
      feedbacks: []
    },
    signals: {
      hireRatePct: null,
      totalSpendUsd: null,
      paymentVerified: null,
      daysSinceLastHire: null
    },
    score: { score: 0, tier: 'LOW', scored: false, components: [] },
    flags: [],
    nameGuess
  }
}

describe('mergeIntelCacheEntry', () => {
  it('adds data discovered by a later drawer enrichment', () => {
    const initial = mergeIntelCacheEntry(
      undefined,
      enrichment(null, 'Dashboard requirements'),
      100
    )

    const enriched = mergeIntelCacheEntry(
      initial,
      enrichment({ name: 'Sarah', confidence: 0.9, votes: 3, alternates: [] }),
      200
    )

    expect(enriched).toMatchObject({
      title: 'Build a dashboard',
      url: 'https://www.upwork.com/jobs/~job-123',
      description: 'Dashboard requirements',
      clientName: 'Sarah',
      savedAt: 200
    })
  })

  it('preserves and merges budget, signals, and proposal count', () => {
    const data: EnrichmentData = {
      meta: {
        jobId: 'job-999',
        title: 'Full Stack App',
        url: 'https://www.upwork.com/jobs/~job-999',
        proposalCount: 18,
        postedText: '1 hour ago',
        descriptionSnippet: 'Node and React',
        feedbacks: []
      },
      budget: { type: 'fixed', minUsd: 2500, maxUsd: 2500 },
      signals: {
        hireRatePct: 82,
        totalSpendUsd: 45_000,
        paymentVerified: true,
        daysSinceLastHire: 3
      },
      score: { score: 85, tier: 'HIGH', scored: true, components: [] },
      flags: [],
      nameGuess: { name: 'Alex', confidence: 0.95, votes: 4, alternates: [] }
    }

    const merged = mergeIntelCacheEntry(undefined, data, 500)
    expect(merged.budget).toEqual({ type: 'fixed', minUsd: 2500, maxUsd: 2500 })
    expect(merged.hireRatePct).toBe(82)
    expect(merged.totalSpendUsd).toBe(45_000)
    expect(merged.paymentVerified).toBe(true)
    expect(merged.proposalCount).toBe(18)
  })

  it('does not erase an extracted name during a later partial refresh', () => {
    const existing: IntelCacheEntry = {
      title: 'Build a dashboard',
      url: 'https://www.upwork.com/jobs/~job-123',
      description: 'Dashboard requirements',
      clientName: 'Sarah',
      savedAt: 100
    }

    expect(mergeIntelCacheEntry(existing, enrichment(null), 300)).toMatchObject({
      clientName: 'Sarah',
      description: 'Dashboard requirements',
      savedAt: 300
    })
  })
})

describe('isCachedLicenseFresh', () => {
  it('accepts a cache entry within the TTL', () => {
    expect(isCachedLicenseFresh({ paid: true, checkedAt: 900 }, 1000)).toBe(true)
  })

  it('rejects missing, future, and expired entries', () => {
    expect(isCachedLicenseFresh(undefined, 1000)).toBe(false)
    expect(isCachedLicenseFresh({ paid: true, checkedAt: 1001 }, 1000)).toBe(false)
    expect(isCachedLicenseFresh({ paid: true, checkedAt: 1000 - LICENSE_TTL_MS }, 1000)).toBe(false)
  })
})