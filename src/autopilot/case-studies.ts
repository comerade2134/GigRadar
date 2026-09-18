import { extensionContextValid } from '../context'
import { detectTags } from '../engine/templates'
import type { PortfolioCaseStudy } from '../types'

export const CASE_STUDIES_STORAGE_KEY = 'gigradar:case_studies'

export const DEFAULT_CASE_STUDIES: PortfolioCaseStudy[] = [
  {
    id: 'cs_fullstack_nextjs',
    title: 'Multi-Tenant Next.js 14 SaaS Platform & Supabase Migration',
    tags: ['next.js', 'react', 'typescript', 'supabase', 'tailwind', 'postgresql', 'web', 'saas', 'full-stack'],
    problemSolved: 'Re-architected monolithic backend into serverless edge functions and migrated data model to Supabase RLS.',
    metricsOutcome: 'Cut p95 load latency by 64% and helped client scale to $45k MRR with 0 downtime.',
    proofLink: 'https://github.com/example/saas-platform',
    clientIndustry: 'B2B SaaS / Fintech',
    updatedAt: Date.now() - 5 * 86_400_000
  },
  {
    id: 'cs_python_ai_scraper',
    title: 'Resilient Distributed Web Scraping & LLM ETL Pipeline',
    tags: ['python', 'fastapi', 'scraping', 'scraper', 'playwright', 'ai', 'llm', 'rag', 'data', 'docker', 'backend'],
    problemSolved: 'Engineered headless browser pool with proxy rotation, CAPTCHA bypass, and automatic DOM change detection feeding vector embeddings.',
    metricsOutcome: 'Processed 1.8M pages daily with 99.4% extraction success rate, saving client $12k/mo in manual entry.',
    proofLink: 'https://github.com/example/ai-scraper-etl',
    clientIndustry: 'Data Intelligence / Market Research',
    updatedAt: Date.now() - 4 * 86_400_000
  },
  {
    id: 'cs_mobile_crossplatform',
    title: 'Offline-First Mobile App in React Native & Flutter',
    tags: ['mobile', 'react native', 'flutter', 'ios', 'android', 'offline', 'state management', 'software'],
    problemSolved: 'Built low-latency bidirectional SQLite sync with background reconciliation and native hardware integrations.',
    metricsOutcome: 'Reached 120,000+ active users across App Store and Google Play with 4.9-star average rating.',
    proofLink: 'https://github.com/example/mobile-sync-app',
    clientIndustry: 'Consumer / Logistics',
    updatedAt: Date.now() - 3 * 86_400_000
  },
  {
    id: 'cs_shopify_ecommerce',
    title: 'Custom Shopify Liquid Storefront & Conversion Optimization',
    tags: ['shopify', 'liquid', 'ecommerce', 'conversion', 'speed', 'javascript', 'wordpress'],
    problemSolved: 'Rebuilt theme architecture with custom dynamic Liquid sections and eliminated render-blocking third-party scripts.',
    metricsOutcome: 'Boosted mobile conversion rate by +32% and increased average order value from $68 to $89.',
    proofLink: 'https://example.com/ecommerce-case-study',
    clientIndustry: 'Direct-to-Consumer E-Commerce',
    updatedAt: Date.now() - 2 * 86_400_000
  }
]

export async function loadCaseStudies(): Promise<PortfolioCaseStudy[]> {
  if (!extensionContextValid()) return [...DEFAULT_CASE_STUDIES]
  try {
    const res = await chrome.storage.local.get(CASE_STUDIES_STORAGE_KEY)
    const stored = res[CASE_STUDIES_STORAGE_KEY] as PortfolioCaseStudy[] | undefined
    if (Array.isArray(stored) && stored.length > 0) {
      return stored
    }
  } catch {
    // Fallback
  }
  return [...DEFAULT_CASE_STUDIES]
}

export async function saveCaseStudies(studies: PortfolioCaseStudy[]): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [CASE_STUDIES_STORAGE_KEY]: studies })
}

export async function addCaseStudy(
  study: Omit<PortfolioCaseStudy, 'id' | 'updatedAt'>
): Promise<PortfolioCaseStudy> {
  const current = await loadCaseStudies()
  const created: PortfolioCaseStudy = {
    ...study,
    id: `cs_${Math.random().toString(36).slice(2, 10)}`,
    updatedAt: Date.now()
  }
  const updated = [created, ...current]
  await saveCaseStudies(updated)
  return created
}

export async function deleteCaseStudy(id: string): Promise<void> {
  const current = await loadCaseStudies()
  const filtered = current.filter((item) => item.id !== id)
  await saveCaseStudies(filtered)
}

export async function seedSampleCaseStudies(): Promise<PortfolioCaseStudy[]> {
  await saveCaseStudies(DEFAULT_CASE_STUDIES)
  return DEFAULT_CASE_STUDIES
}

export interface CaseStudyMatchResult {
  matched: PortfolioCaseStudy | null
  score: number
  reasons: string[]
}

export async function matchCaseStudiesForJob(
  job: {
    title: string
    description?: string
    techStack?: string[]
  },
  customStudies?: PortfolioCaseStudy[]
): Promise<CaseStudyMatchResult> {
  const studies = customStudies ?? (await loadCaseStudies())
  if (studies.length === 0) {
    return { matched: null, score: 0, reasons: [] }
  }

  const jobDesc = job.description || ''
  const combinedText = `${job.title} ${jobDesc} ${(job.techStack || []).join(' ')}`.toLowerCase()
  const detectedJobTags = detectTags(job.title, jobDesc)

  let bestMatch: PortfolioCaseStudy | null = null
  let highestScore = 0
  let bestReasons: string[] = []

  for (const study of studies) {
    let score = 0
    const reasons: string[] = []

    const studyTags = Array.isArray(study.tags) ? study.tags : []

    // 1. Tag matching
    for (const tag of studyTags) {
      const cleanTag = tag.toLowerCase().trim()
      if (cleanTag.length <= 2) continue
      if (combinedText.includes(cleanTag)) {
        score += 4
        reasons.push(`Matched technology: ${tag}`)
      }
    }

    // 2. Detected domain tag matching
    for (const dtag of detectedJobTags) {
      if (studyTags.some((t) => t.toLowerCase().includes(dtag))) {
        score += 6
        reasons.push(`Matched domain focus: ${dtag}`)
      }
    }

    // 3. Title keywords matching
    const titleWords = study.title.toLowerCase().split(/[\s,&/-]+/).filter((w) => w.length > 3)
    for (const word of titleWords) {
      if (combinedText.includes(word)) {
        score += 2
      }
    }

    // 4. Industry matching
    if (study.clientIndustry && combinedText.includes(study.clientIndustry.toLowerCase())) {
      score += 5
      reasons.push(`Matched industry: ${study.clientIndustry}`)
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = study
      bestReasons = Array.from(new Set(reasons))
    }
  }

  // Minimum threshold to prevent spurious irrelevant matches
  if (highestScore < 3) {
    return { matched: null, score: 0, reasons: [] }
  }

  return {
    matched: bestMatch,
    score: highestScore,
    reasons: bestReasons
  }
}
