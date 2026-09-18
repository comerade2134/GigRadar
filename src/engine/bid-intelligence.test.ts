import { describe, expect, it } from 'vitest'
import {
  calculateBidIntelligence,
  estimateDealValue
} from './bid-intelligence'

describe('Bid Intelligence Engine', () => {
  describe('estimateDealValue', () => {
    it('extracts fixed price amount', () => {
      expect(estimateDealValue({ type: 'fixed', minUsd: 1500, maxUsd: 1500 })).toBe(1500)
    })

    it('falls back to max when fixed amount is missing', () => {
      expect(estimateDealValue({ type: 'fixed', minUsd: null, maxUsd: 800 })).toBe(800)
    })

    it('calculates hourly deal value using average rate * 40h kickoff milestone', () => {
      expect(estimateDealValue({ type: 'hourly', minUsd: 40, maxUsd: 60 })).toBe(2000)
    })

    it('falls back to reasonable default for null or unknown budget', () => {
      expect(estimateDealValue(null)).toBe(500)
    })
  })

  describe('calculateBidIntelligence', () => {
    it('flags low hire rate client as SKIP_NEGATIVE_EV with 0 recommended connects', () => {
      const result = calculateBidIntelligence({
        budget: { type: 'fixed', minUsd: 1000, maxUsd: 1000 },
        clientHireRatePct: 12, // Very low hire rate
        clientPaymentVerified: true,
        clientTotalSpendUsd: 500,
        proposalCount: 20
      })

      expect(result.strategy).toBe('SKIP_NEGATIVE_EV')
      expect(result.recommendedBid).toBe(0)
      expect(result.verdictSummary).toContain('negative expected value')
    })

    it('flags unverified client with 0 spend as SKIP_NEGATIVE_EV', () => {
      const result = calculateBidIntelligence({
        budget: { type: 'fixed', minUsd: 2000, maxUsd: 2000 },
        clientHireRatePct: 50,
        clientPaymentVerified: false,
        clientTotalSpendUsd: 0,
        proposalCount: 15
      })

      expect(result.strategy).toBe('SKIP_NEGATIVE_EV')
      expect(result.recommendedBid).toBe(0)
    })

    it('recommends ORGANIC_SWEET_SPOT when proposals are low and listing is fresh', () => {
      const result = calculateBidIntelligence({
        budget: { type: 'fixed', minUsd: 1200, maxUsd: 1200 },
        clientHireRatePct: 75,
        clientPaymentVerified: true,
        clientTotalSpendUsd: 15_000,
        proposalCount: 4, // Very early listing
        hoursSincePosted: 1
      })

      expect(result.strategy).toBe('ORGANIC_SWEET_SPOT')
      expect(result.recommendedBid).toBe(0)
      expect(result.verdictSummary).toContain('Organic visibility is already high')
      expect(result.winProbabilityPct).toBeGreaterThan(10)
    })

    it('recommends boost for competitive high-value contract', () => {
      const result = calculateBidIntelligence({
        budget: { type: 'fixed', minUsd: 3500, maxUsd: 3500 },
        clientHireRatePct: 85,
        clientPaymentVerified: true,
        clientTotalSpendUsd: 50_000,
        proposalCount: 35, // High competition
        hoursSincePosted: 8
      })

      expect(result.recommendedBid).toBeGreaterThan(0)
      expect(['TACTICAL_BOOST', 'AGGRESSIVE_TOP_SLOT']).toContain(result.strategy)
      expect(result.expectedValueUsd).toBeGreaterThan(100)
      expect(result.roiRatio).toBeGreaterThan(5)
    })

    it('generates a full multi-point probability curve', () => {
      const result = calculateBidIntelligence({
        budget: { type: 'hourly', minUsd: 50, maxUsd: 70 },
        clientHireRatePct: 70,
        clientPaymentVerified: true,
        clientTotalSpendUsd: 25_000,
        proposalCount: 18,
        hoursSincePosted: 3
      })

      expect(result.curve.length).toBe(9)
      const zeroBid = result.curve.find((p) => p.bidConnects === 0)
      const topBid = result.curve.find((p) => p.bidConnects === 16)

      expect(zeroBid).toBeDefined()
      expect(topBid).toBeDefined()
      expect(topBid!.winProbabilityPct).toBeGreaterThan(zeroBid!.winProbabilityPct)
      expect(result.breakEvenWinRatePct).toBeGreaterThan(0)
      expect(result.breakEvenWinRatePct).toBeLessThan(5)
    })
  })
})
