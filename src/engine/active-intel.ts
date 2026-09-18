import type { EnrichmentData } from '../types'

export function resolveCurrentIntel(
  current: EnrichmentData | null,
  jobId: string,
  fallback: EnrichmentData
): EnrichmentData {
  return current?.meta.jobId === jobId ? current : fallback
}