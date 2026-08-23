import type { SentimentReport } from '../types'

const NEGATIVE_KEYWORDS: readonly string[] = [
  'difficult',
  'scope creep',
  'refund',
  'dispute',
  'unreasonable',
  'unresponsive',
  'unfair',
  'held payment'
]

export const NEGATIVE_RATIO_THRESHOLD = 0.2
export const MIN_FEEDBACKS_FOR_SIGNAL = 2

export function analyzeSentiment(feedbacks: readonly string[]): SentimentReport | null {
  const entries = feedbacks.map((f) => f.toLowerCase()).filter((f) => f.length > 12)
  if (entries.length < MIN_FEEDBACKS_FOR_SIGNAL) return null

  let negativeCount = 0
  const keywordsHit = new Set<string>()

  for (const entry of entries) {
    const hit = NEGATIVE_KEYWORDS.find((keyword) => entry.includes(keyword))
    if (hit) {
      negativeCount += 1
      keywordsHit.add(hit)
    }
  }

  if (negativeCount === 0) {
    return {
      level: 'clean',
      negativeRatio: 0,
      negativeCount: 0,
      scanned: entries.length,
      keywordsHit: []
    }
  }

  const negativeRatio = negativeCount / entries.length
  return {
    level: negativeRatio > NEGATIVE_RATIO_THRESHOLD ? 'negative' : 'clean',
    negativeRatio,
    negativeCount,
    scanned: entries.length,
    keywordsHit: [...keywordsHit]
  }
}

export const TEMPERAMENT_FLAG_TEXT =
  '🚩 Client Temperament: High dispute rate in past contracts'
