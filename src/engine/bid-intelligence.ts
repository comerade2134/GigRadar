import type { JobBudget } from '../types'

export type BidStrategy =
  | 'ORGANIC_SWEET_SPOT'
  | 'TACTICAL_BOOST'
  | 'AGGRESSIVE_TOP_SLOT'
  | 'SKIP_NEGATIVE_EV'

export interface CurvePoint {
  bidConnects: number
  costUsd: number
  placement: string
  viewProbabilityPct: number
  winProbabilityPct: number
  expectedValueUsd: number
  roiRatio: number
}

export interface BidIntelligenceInput {
  budget?: JobBudget | null
  clientHireRatePct?: number | null
  clientPaymentVerified?: boolean | null
  clientTotalSpendUsd?: number | null
  proposalCount?: number | null
  hoursSincePosted?: number | null
  baseConnectsCost?: number
  connectsPriceUsd?: number
}

export interface BidIntelligenceResult {
  recommendedBid: number
  strategy: BidStrategy
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  winProbabilityPct: number
  organicWinProbabilityPct: number
  expectedValueUsd: number
  dealValueUsd: number
  connectsCostUsd: number
  roiRatio: number
  breakEvenWinRatePct: number
  verdictSummary: string
  curve: CurvePoint[]
}

/**
 * Estimates the normalized project deal value in USD.
 * For fixed price: uses project budget.
 * For hourly: calculates 40h kickoff milestone.
 */
export function estimateDealValue(budget?: JobBudget | null, defaultHourlyHours = 40): number {
  if (!budget) return 500

  if (budget.type === 'fixed') {
    const amt = budget.maxUsd ?? budget.minUsd ?? 0
    return Math.max(50, amt)
  }

  if (budget.type === 'hourly') {
    let rate = 0
    if (budget.minUsd && budget.maxUsd) {
      rate = (budget.minUsd + budget.maxUsd) / 2
    } else {
      rate = budget.maxUsd ?? budget.minUsd ?? 35
    }
    return Math.max(100, Math.round(rate * defaultHourlyHours))
  }

  return 500
}

/**
 * Evaluates the baseline organic view probability based on competition volume and posting decay.
 */
function getOrganicViewRate(proposalCount: number, hoursSincePosted: number): number {
  let baseRate = 0.55
  if (proposalCount <= 5) baseRate = 0.82
  else if (proposalCount <= 15) baseRate = 0.58
  else if (proposalCount <= 30) baseRate = 0.32
  else if (proposalCount <= 50) baseRate = 0.16
  else baseRate = 0.05

  if (hoursSincePosted > 72) baseRate *= 0.65
  else if (hoursSincePosted > 24) baseRate *= 0.85

  return Math.max(0.02, Math.min(0.95, baseRate))
}

/**
 * Calculates win probability, expected value, and the optimal boost bid.
 */
export function calculateBidIntelligence(input: BidIntelligenceInput): BidIntelligenceResult {
  const connectsPrice = input.connectsPriceUsd ?? 0.15
  const baseConnects = input.baseConnectsCost ?? 8
  const dealValue = estimateDealValue(input.budget)
  const proposals = Math.max(1, input.proposalCount ?? 15)
  const hoursPosted = Math.max(0.25, input.hoursSincePosted ?? 2)

  const hireRate =
    typeof input.clientHireRatePct === 'number'
      ? Math.max(0, Math.min(100, input.clientHireRatePct))
      : 50

  const paymentVerified = input.clientPaymentVerified !== false
  const totalSpend = input.clientTotalSpendUsd ?? 0

  // Client conversion factor
  let clientConversion = hireRate / 100
  if (!paymentVerified) clientConversion *= 0.35
  if (totalSpend > 20_000) clientConversion *= 1.2
  else if (totalSpend > 5_000) clientConversion *= 1.1
  clientConversion = Math.max(0.01, Math.min(0.90, clientConversion))

  // Autopilot proposal quality prior (tailored hook + receipts)
  const proposalQualityPrior = 0.28
  const winGivenView = clientConversion * proposalQualityPrior

  // Organic baseline
  const organicViewRate = getOrganicViewRate(proposals, hoursPosted)

  // Competitive slot thresholds based on proposal saturation
  const slot1Threshold = proposals <= 10 ? 7 : proposals <= 25 ? 13 : 18
  const slot2Threshold = proposals <= 10 ? 5 : proposals <= 25 ? 9 : 13
  const slot3Threshold = proposals <= 10 ? 3 : proposals <= 25 ? 6 : 9
  const slot4Threshold = proposals <= 10 ? 2 : proposals <= 25 ? 4 : 6

  // Generate curve across discrete Connects increments
  const candidateBids = [0, 3, 6, 9, 12, 16, 20, 25, 30]
  const curve: CurvePoint[] = []

  let bestBid = 0
  let maxEv = -Infinity
  let bestPoint: CurvePoint | null = null

  for (const bid of candidateBids) {
    let placement = 'Organic'
    let viewRate = organicViewRate

    if (bid >= slot1Threshold) {
      placement = 'Top Spot (#1)'
      viewRate = Math.max(viewRate, 0.92)
    } else if (bid >= slot2Threshold) {
      placement = 'Top Spot (#2)'
      viewRate = Math.max(viewRate, 0.82)
    } else if (bid >= slot3Threshold) {
      placement = 'Top Spot (#3)'
      viewRate = Math.max(viewRate, 0.70)
    } else if (bid >= slot4Threshold) {
      placement = 'Top Spot (#4)'
      viewRate = Math.max(viewRate, 0.58)
    } else if (bid > 0) {
      placement = 'Outbid'
      viewRate = Math.min(0.90, organicViewRate * 1.15)
    }

    const winProb = viewRate * winGivenView
    const totalCost = (baseConnects + bid) * connectsPrice
    const grossReturn = winProb * dealValue
    const expectedValue = grossReturn - totalCost
    const roiRatio = totalCost > 0 ? Math.max(0, grossReturn / totalCost) : 0

    const point: CurvePoint = {
      bidConnects: bid,
      costUsd: Math.round(totalCost * 100) / 100,
      placement,
      viewProbabilityPct: Math.round(viewRate * 1000) / 10,
      winProbabilityPct: Math.round(winProb * 1000) / 10,
      expectedValueUsd: Math.round(expectedValue * 100) / 100,
      roiRatio: Math.round(roiRatio * 10) / 10
    }

    curve.push(point)

    // Check EV maximization with diminishing returns consideration
    if (expectedValue > maxEv) {
      maxEv = expectedValue
      bestBid = bid
      bestPoint = point
    }
  }

  // Strategy derivation
  let strategy: BidStrategy = 'TACTICAL_BOOST'
  let recommendedBid = bestBid
  let verdictSummary = ''

  const isLowIntent =
    (typeof input.clientHireRatePct === 'number' && input.clientHireRatePct < 20) ||
    (!paymentVerified && totalSpend === 0)

  if (isLowIntent) {
    strategy = 'SKIP_NEGATIVE_EV'
    recommendedBid = 0
    verdictSummary =
      'Poor client hire rate or unverified payment — boost bids produce negative expected value.'
  } else if (proposals <= 8 && hoursPosted <= 4) {
    strategy = 'ORGANIC_SWEET_SPOT'
    recommendedBid = 0
    verdictSummary =
      'Early listing with low competition (<8 proposals). Organic visibility is already high (>75%). Save your Connects.'
  } else if (dealValue >= 1800 && proposals >= 20 && bestBid >= 12) {
    strategy = 'AGGRESSIVE_TOP_SLOT'
    recommendedBid = bestBid
    verdictSummary = `High-value contract ($${dealValue.toLocaleString()}). Top-spot boost unlocks maximum expected dollar value (+${Math.round(maxEv)} USD).`
  } else if (bestBid > 0 && maxEv > (curve[0]?.expectedValueUsd ?? 0) + 10) {
    strategy = 'TACTICAL_BOOST'
    recommendedBid = bestBid
    verdictSummary = `Optimal boost of ${bestBid} Connects delivers ${bestPoint?.roiRatio ?? 1}x expected ROI on contract value.`
  } else {
    strategy = 'ORGANIC_SWEET_SPOT'
    recommendedBid = 0
    verdictSummary =
      'Marginal boost yield is too low for this budget. Organic proposal maximizes risk-adjusted return.'
  }

  const activePoint = curve.find((p) => p.bidConnects === recommendedBid) ?? curve[0]!
  const connectsCostUsd = (baseConnects + recommendedBid) * connectsPrice
  const breakEvenWinRatePct =
    dealValue > 0 ? Math.round((connectsCostUsd / dealValue) * 10_000) / 100 : 0

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  if (input.clientHireRatePct != null && input.proposalCount != null && input.budget) {
    confidence = 'HIGH'
  } else if (!input.clientHireRatePct && !input.budget) {
    confidence = 'LOW'
  }

  return {
    recommendedBid,
    strategy,
    confidence,
    winProbabilityPct: activePoint.winProbabilityPct,
    organicWinProbabilityPct: curve[0]?.winProbabilityPct ?? 0,
    expectedValueUsd: activePoint.expectedValueUsd,
    dealValueUsd: dealValue,
    connectsCostUsd: Math.round(connectsCostUsd * 100) / 100,
    roiRatio: activePoint.roiRatio,
    breakEvenWinRatePct,
    verdictSummary,
    curve
  }
}
