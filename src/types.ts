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

export interface CompanyEntity {
  name: string | null
  domain: string | null
  source: 'feedback' | 'description' | 'both'
  confidence: number
}

export type ReviewRedFlagCategory =
  | 'dispute'
  | 'unpaid'
  | 'scope_creep'
  | 'harsh_rating'
  | 'rude'
  | 'ghosting'
  | 'warning'

export interface ReviewRedFlag {
  category: ReviewRedFlagCategory
  label: string
  snippet: string
  rating?: number | null
  freelancerName?: string | null
}

export interface ClientDossier {
  company: CompanyEntity | null
  reviewRedFlags: ReviewRedFlag[]
  praiseHighlights: string[]
  techStack: string[]
  summary?: string | null
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
  dossier?: ClientDossier | null
}

export type Provider = 'openai' | 'anthropic'

export type RuntimeMessage =
  | { type: 'OPEN_OPTIONS' }
  | { type: 'BYOK_POLISH'; prompt: string; provider: Provider; apiKey: string }
  | { type: 'BYOK_CLIENT_DOSSIER'; prompt: string; provider: Provider; apiKey: string }
  | { type: 'SCANNER_SETTINGS_UPDATED' }
  | { type: 'SCANNER_SCAN_NOW' }

// Account & Cloud Sync Architecture
export type AccountTier = 'free' | 'pro_freelancer' | 'agency'

export interface UserProfile {
  userId: string
  email: string
  tier: AccountTier
  teamId?: string
  teamName?: string
  seatLimit?: number
  activeSeats?: number
  syncedAt?: number
  licenseToken?: string
}

export interface SharedClientIntel {
  clientKey: string
  clientName?: string
  flaggedBy: string
  reason: string
  flaggedAt: number
}

export interface CloudSyncState {
  lastSyncedAt: number | null
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  errorMessage?: string
}

// Viral Social Sharing
export interface ShareCardStats {
  connectsSaved: number
  dollarsSaved: number
  proRoiMultiplier?: string
  locale?: string
}

// Agency Collision Prevention & Shared Team Tracker (Module A)
export type TeamJobStatus = 'viewing' | 'drafting' | 'applied' | 'passed'

export interface TeamMember {
  id: string
  name: string
  email: string
  role?: string
  specialties?: string[]
}

export interface TeamJobActivity {
  jobId: string
  jobTitle: string
  jobUrl?: string
  clientName?: string
  memberId: string
  memberName: string
  memberEmail?: string
  status: TeamJobStatus
  connectsSaved?: number
  notes?: string
  dealValueUsd?: number | null
  budget?: JobBudget | null
  hireRatePct?: number | null
  totalSpendUsd?: number | null
  paymentVerified?: boolean | null
  updatedAt: number
  expiresAt: number
}

export interface AgencyCollisionIntel {
  isClaimed: boolean
  activity: TeamJobActivity | null
  isCurrentMember: boolean
  warningMessage?: string
}

export interface TeamCollisionMetrics {
  collisionsPrevented: number
  connectsSaved: number
  dollarsSaved: number
  activeProposalsCount: number
}

// Proposal Autopilot & Custom Voice Profile (Module B)
export interface PortfolioCaseStudy {
  id: string
  title: string
  tags: string[]
  problemSolved: string
  metricsOutcome: string
  proofLink?: string
  clientIndustry?: string
  updatedAt: number
}

export type VoiceTone = 'direct_engineer' | 'consultative_partner' | 'velocity_exec' | 'custom'

export interface VoiceProfileTraits {
  sentenceLength: 'short' | 'balanced' | 'detailed'
  formality: 'casual' | 'conversational' | 'professional'
  focusAngle: 'problem_first' | 'receipts_first' | 'architecture_first'
}

export interface VoiceProfile {
  tone: VoiceTone
  customInstructions?: string
  sampleText?: string
  derivedTraits?: VoiceProfileTraits
  bannedPhrases: string[]
  bioSnippet?: string
}

export interface AutopilotProposal {
  hook: string
  caseStudyInjection: string
  executionPlan: string[]
  closingCta: string
  fullText: string
  matchedCaseStudyId?: string
  matchedCaseStudyTitle?: string
}

// Agency Lead Inbox & Real-Time Webhooks (Module D)
export interface WebhookConfig {
  slackWebhookUrl?: string
  discordWebhookUrl?: string
  customWebhookUrl?: string
  notifyOnClaim: boolean
  notifyOnApplied: boolean
  notifyOnHighValue: boolean
  notifyOnCollision: boolean
  highValueThresholdUsd: number
}

export type WebhookEventType =
  | 'job_claimed'
  | 'job_applied'
  | 'high_value_lead'
  | 'collision_prevented'

export interface WebhookEventPayload {
  eventType: WebhookEventType
  jobId: string
  jobTitle: string
  jobUrl?: string
  clientName?: string
  dealValueUsd?: number
  budget?: JobBudget | null
  hireRatePct?: number | null
  totalSpendUsd?: number | null
  paymentVerified?: boolean
  memberName: string
  memberEmail?: string
  status: TeamJobStatus
  notes?: string
  timestamp: number
}
