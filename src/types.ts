export type Tier = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ClientSignals {
  hireRatePct: number | null
  totalSpendUsd: number | null
  paymentVerified: boolean | null
  daysSinceLastHire: number | null
}

export interface SignalComponent {
  label: string
  weight: number
  value: number | null
  display: string | null
}

export interface ScoreResult {
  score: number
  tier: Tier
  scored: boolean
  components: SignalComponent[]
}

export type FlagLevel = 'danger' | 'warn'

export interface RedFlag {
  level: FlagLevel
  text: string
}

export interface NameGuess {
  name: string
  confidence: number
  votes: number
  alternates: string[]
}

export interface RatingSummary {
  avg: number
  count: number
}

export interface JobMeta {
  jobId: string
  title: string
  url: string
  proposalCount: number | null
  postedText: string | null
  descriptionSnippet: string
  feedbacks: string[]
}

export interface ActivityStats {
  proposalsCount: number | null
  interviewingCount: number | null
  invitesSentCount: number | null
  unansweredInvitesCount: number | null
}

export interface JobBudget {
  type: 'hourly' | 'fixed'
  minUsd: number | null
  maxUsd: number | null
}

export interface TrueRateBenchmark {
  medianHourlyUsd: number | null
  avgFixedUsd: number | null
  sampleCount: number
}

export type SentimentLevel = 'clean' | 'negative'

export interface SentimentReport {
  level: SentimentLevel
  negativeRatio: number
  negativeCount: number
  scanned: number
  keywordsHit: string[]
}

export interface ScamMatch {
  category: string
  snippet: string
}

export interface ScamScanResult {
  matched: boolean
  matches: ScamMatch[]
}

export interface EnrichmentData {
  meta: JobMeta
  signals: ClientSignals
  score: ScoreResult
  flags: RedFlag[]
  nameGuess: NameGuess | null
  activity?: ActivityStats | null
  budget?: JobBudget | null
  trueRate?: TrueRateBenchmark | null
  sentiment?: SentimentReport | null
  rating?: RatingSummary | null
}

export type Provider = 'openai' | 'anthropic'

export type RuntimeMessage =
  | { type: 'OPEN_OPTIONS' }
  | { type: 'BYOK_POLISH'; prompt: string; provider: Provider; apiKey: string }
