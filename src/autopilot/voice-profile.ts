import { extensionContextValid } from '../context'
import type { VoiceProfile, VoiceProfileTraits, VoiceTone } from '../types'

export const VOICE_PROFILE_STORAGE_KEY = 'gigradar:voice_profile'

export const DEFAULT_BANNED_PHRASES = [
  'i hope this finds you well',
  'i hope this proposal finds you well',
  'proven track record',
  'dear hiring manager',
  'look no further',
  'i am the ideal candidate',
  "in today's fast-paced world",
  'i am confident that i can',
  'as an experienced developer',
  'not only x, but also y',
  'excited to apply',
  'to whom it may concern',
  'passionate about delivering',
  'testament to my skills'
]

export const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  tone: 'direct_engineer',
  customInstructions: 'Direct, compressed, concrete. Focus on edge cases, architecture, and quantifiable outcomes. Zero fluff.',
  derivedTraits: {
    sentenceLength: 'short',
    formality: 'conversational',
    focusAngle: 'problem_first'
  },
  bannedPhrases: DEFAULT_BANNED_PHRASES,
  bioSnippet: 'Full-stack engineer specializing in reliable production web systems, API architecture, and database performance.'
}

export async function loadVoiceProfile(): Promise<VoiceProfile> {
  if (!extensionContextValid()) return { ...DEFAULT_VOICE_PROFILE }
  try {
    const res = await chrome.storage.local.get(VOICE_PROFILE_STORAGE_KEY)
    const stored = res[VOICE_PROFILE_STORAGE_KEY] as Partial<VoiceProfile> | undefined
    if (stored && typeof stored.tone === 'string') {
      return {
        tone: stored.tone,
        customInstructions: stored.customInstructions ?? DEFAULT_VOICE_PROFILE.customInstructions,
        sampleText: stored.sampleText ?? '',
        derivedTraits: stored.derivedTraits ?? DEFAULT_VOICE_PROFILE.derivedTraits,
        bannedPhrases: Array.isArray(stored.bannedPhrases) ? stored.bannedPhrases : DEFAULT_BANNED_PHRASES,
        bioSnippet: stored.bioSnippet ?? DEFAULT_VOICE_PROFILE.bioSnippet
      }
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_VOICE_PROFILE }
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [VOICE_PROFILE_STORAGE_KEY]: profile })
}

export interface ToneAnalysisResult extends VoiceProfileTraits {
  avgSentenceLength: number
  detectedSentences: number
  metricsFrequency: 'low' | 'medium' | 'high'
  derivedTone: VoiceTone
}

export function analyzeWritingTone(sampleText: string): ToneAnalysisResult {
  const clean = sampleText.trim()
  if (!clean) {
    return {
      sentenceLength: 'short',
      formality: 'conversational',
      focusAngle: 'problem_first',
      avgSentenceLength: 10,
      detectedSentences: 0,
      metricsFrequency: 'low',
      derivedTone: 'direct_engineer'
    }
  }

  // 1. Sentence length analysis
  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const totalWords = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0)
  const avgWordsPerSentence = sentences.length > 0 ? Math.round(totalWords / sentences.length) : 12

  let sentenceLength: 'short' | 'balanced' | 'detailed' = 'balanced'
  if (avgWordsPerSentence < 13) sentenceLength = 'short'
  else if (avgWordsPerSentence > 22) sentenceLength = 'detailed'

  // 2. Formality analysis
  const contractions = /\b(i'm|i've|we'll|can't|don't|won't|it's|let's)\b/gi
  const contractionCount = (clean.match(contractions) || []).length
  const formalMarkers = /\b(furthermore|moreover|herein|therefore|subsequently|commensurate)\b/gi
  const formalCount = (clean.match(formalMarkers) || []).length

  let formality: 'casual' | 'conversational' | 'professional' = 'conversational'
  if (contractionCount >= 3 && formalCount === 0) {
    formality = 'casual'
  } else if (formalCount >= 2 && contractionCount <= 1) {
    formality = 'professional'
  }

  // 3. Focus Angle analysis
  const metricsPattern = /\b(\d+[%kKmM]?|\$\d+|\d+\.\d+x|\d+ms|\d+s|\d+[\d,]*\b)/g
  const metricsCount = (clean.match(metricsPattern) || []).length

  const archPattern = /\b(architecture|schema|stack|infra|pipeline|database|edge|serverless|api|pipelines)\b/gi
  const archCount = (clean.match(archPattern) || []).length

  const riskPattern = /\b(risk|bottleneck|challenge|blocker|fail|break|issue|problem)\b/gi
  const riskCount = (clean.match(riskPattern) || []).length

  let focusAngle: 'problem_first' | 'receipts_first' | 'architecture_first' = 'problem_first'
  if (metricsCount >= 2 && metricsCount >= archCount) {
    focusAngle = 'receipts_first'
  } else if (archCount > riskCount && archCount > metricsCount) {
    focusAngle = 'architecture_first'
  }

  const metricsFrequency: 'low' | 'medium' | 'high' =
    metricsCount >= 2 ? 'high' : metricsCount === 1 ? 'medium' : 'low'

  let derivedTone: VoiceTone = 'direct_engineer'
  if (focusAngle === 'architecture_first' || formality === 'professional') {
    derivedTone = 'consultative_partner'
  } else if (sentenceLength === 'short' && formality === 'casual') {
    derivedTone = 'velocity_exec'
  } else if (metricsFrequency === 'high' || focusAngle === 'receipts_first') {
    derivedTone = 'direct_engineer'
  } else {
    derivedTone = 'consultative_partner'
  }

  return {
    sentenceLength,
    formality,
    focusAngle,
    avgSentenceLength: avgWordsPerSentence,
    detectedSentences: sentences.length,
    metricsFrequency,
    derivedTone
  }
}

export function cleanBannedPhrases(text: string, banned: string[] = DEFAULT_BANNED_PHRASES): string {
  let result = text
  for (const phrase of banned) {
    const cleanPhrase = phrase.trim()
    if (!cleanPhrase) continue
    const regex = new RegExp(`\\b${cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    result = result.replace(regex, '')
  }
  // Clean up repeated punctuation or double spaces caused by phrase removal
  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.,!?])\s*\1+/g, '$1')
    .trim()
}
