import type { EnrichmentData, JobBudget } from '../types'

export interface IntelCacheEntry {
  title: string
  url?: string
  description?: string
  clientName?: string | null
  budget?: JobBudget | null
  hireRatePct?: number | null
  totalSpendUsd?: number | null
  paymentVerified?: boolean | null
  proposalCount?: number | null
  savedAt: number
}

export function mergeIntelCacheEntry(
  existing: IntelCacheEntry | undefined,
  data: EnrichmentData,
  savedAt: number
): IntelCacheEntry {
  const clientName = data.nameGuess?.name ?? existing?.clientName ?? null
  const description = data.meta.descriptionSnippet || existing?.description || ''
  const url = data.meta.url || existing?.url
  const budget = data.budget ?? existing?.budget ?? null
  const hireRatePct = data.signals.hireRatePct ?? existing?.hireRatePct ?? null
  const totalSpendUsd = data.signals.totalSpendUsd ?? existing?.totalSpendUsd ?? null
  const paymentVerified = data.signals.paymentVerified ?? existing?.paymentVerified ?? null
  const proposalCount = data.meta.proposalCount ?? existing?.proposalCount ?? null

  return {
    title: data.meta.title || existing?.title || 'Upwork job',
    ...(url ? { url } : {}),
    ...(description ? { description } : {}),
    clientName,
    budget,
    hireRatePct,
    totalSpendUsd,
    paymentVerified,
    proposalCount,
    savedAt
  }
}