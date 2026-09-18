import { describe, it, expect } from 'vitest'
import {
  cleanBannedPhrases,
  analyzeWritingTone,
  DEFAULT_VOICE_PROFILE,
  DEFAULT_BANNED_PHRASES
} from './voice-profile'
import {
  matchCaseStudiesForJob,
  seedSampleCaseStudies,
  loadCaseStudies
} from './case-studies'
import { generateAutopilotProposal } from './autopilot-engine'
import type { PortfolioCaseStudy, VoiceProfile } from '../types'

describe('Voice Profile & Tone Analyzer', () => {
  it('cleans banned AI fluff and generic buzzwords cleanly', () => {
    const input =
      'I hope this finds you well. I am the ideal candidate with a proven track record. Look no further for your Next.js build.'
    const cleaned = cleanBannedPhrases(input, DEFAULT_BANNED_PHRASES)

    expect(cleaned.toLowerCase()).not.toContain('i hope this finds you well')
    expect(cleaned.toLowerCase()).not.toContain('proven track record')
    expect(cleaned.toLowerCase()).not.toContain('ideal candidate')
    expect(cleaned.toLowerCase()).not.toContain('look no further')
    expect(cleaned).toContain('Next.js build')
  })

  it('analyzes writing tone from sample proposals with high precision', () => {
    const sample = `
      Hi Sarah, built a similar Stripe billing flow last month that cut checkout drop-off by 24%.
      We had zero downtime across 15,000 transactions.
      I don't waste time on bloated frameworks. Can jump on a quick 10-minute technical review tomorrow?
    `
    const analysis = analyzeWritingTone(sample)

    expect(analysis.metricsFrequency).toBe('high')
    expect(analysis.detectedSentences).toBeGreaterThanOrEqual(3)
    expect(analysis.derivedTone).toBe('direct_engineer')
    expect(analysis.avgSentenceLength).toBeGreaterThan(0)
  })

  it('identifies consultative tone when analysis emphasizes strategic review', () => {
    const sample = `
      The primary bottleneck in enterprise data pipelines is usually unindexed read volume.
      We can audit the schema architecture to ensure long-term maintainability without scope creep.
      Let us align on your milestone objectives and compliance requirements.
    `
    const analysis = analyzeWritingTone(sample)
    expect(analysis.derivedTone).toBe('consultative_partner')
  })
})

describe('Portfolio Case Study Matching Engine', () => {
  const sampleStudies: PortfolioCaseStudy[] = [
    {
      id: 'cs-nextjs',
      title: 'Next.js 14 E-commerce Platform with Stripe',
      tags: ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Stripe', 'ecommerce', 'frontend'],
      problemSolved: 'Slow legacy Magento checkout with 6s page loads',
      metricsOutcome: 'Reduced checkout latency to 420ms and raised conversion by 31%',
      updatedAt: 1700000000000
    },
    {
      id: 'cs-scraper',
      title: 'High-Volume Python Scraper Pipeline',
      tags: ['Python', 'FastAPI', 'Playwright', 'PostgreSQL', 'scraping', 'automation', 'backend'],
      problemSolved: 'Bypassed Cloudflare bot detection on 2M product catalog',
      metricsOutcome: 'Extracted 100k items/hour with 99.8% uptime',
      updatedAt: 1700000000000
    }
  ]

  it('accurately matches Next.js case study for a React/Next.js job', async () => {
    const result = await matchCaseStudiesForJob(
      {
        title: 'Need senior React / Next.js engineer for modern marketplace',
        description: 'Building an online store with Stripe checkout and SSR performance.',
        techStack: ['React', 'Next.js', 'TypeScript', 'Stripe']
      },
      sampleStudies
    )

    expect(result.matched).not.toBeNull()
    expect(result.matched?.id).toBe('cs-nextjs')
    expect(result.score).toBeGreaterThanOrEqual(8)
  })

  it('accurately matches Python scraper case study for scraping jobs', async () => {
    const result = await matchCaseStudiesForJob(
      {
        title: 'Python developer for web scraping and data pipeline',
        description: 'Need to extract data using Playwright or BeautifulSoup and store in database.',
        techStack: ['Python', 'FastAPI']
      },
      sampleStudies
    )

    expect(result.matched).not.toBeNull()
    expect(result.matched?.id).toBe('cs-scraper')
  })

  it('returns null when job has no relevance to portfolio studies', async () => {
    const result = await matchCaseStudiesForJob(
      {
        title: 'Looking for 3D Unity Game Designer for VR Experience',
        description: 'Need Blender models, rigging, and Oculus VR physics controllers.',
        techStack: ['Unity', 'C#', 'Blender', 'VR']
      },
      sampleStudies
    )

    expect(result.matched).toBeNull()
    expect(result.score).toBe(0)
  })

  it('seeds default high-converting case studies properly', async () => {
    const seeded = await seedSampleCaseStudies()
    expect(seeded.length).toBeGreaterThanOrEqual(3)
    const loaded = await loadCaseStudies()
    expect(loaded.length).toBe(seeded.length)
  })
})

describe('Autopilot Proposal Engine', () => {
  const sampleCaseStudy: PortfolioCaseStudy = {
    id: 'cs-ai',
    title: 'RAG Pipeline with LangChain & Pinecone',
    tags: ['Python', 'OpenAI', 'Pinecone', 'AI'],
    problemSolved: 'Internal search across 50,000 PDF documents was slow and inaccurate',
    metricsOutcome: 'Cut query time from 15s to 350ms with 94% relevance score',
    proofLink: 'https://github.com/example/rag-demo',
    updatedAt: 1700000000000
  }

  it('generates a complete 4-part proposal with injected case study', async () => {
    const proposal = await generateAutopilotProposal({
      jobMeta: {
        jobId: '~01982734',
        title: 'Build AI document Q&A bot using LangChain and Python',
        descriptionSnippet: 'We have 10k legal documents and need an LLM query interface.'
      },
      clientName: 'Alex',
      techStack: ['Python', 'AI', 'OpenAI'],
      caseStudy: sampleCaseStudy
    })

    expect(proposal.hook).toContain('Hi Alex')
    expect(proposal.hook).toContain('AI')
    expect(proposal.caseStudyInjection).toContain('RAG Pipeline with LangChain & Pinecone')
    expect(proposal.caseStudyInjection).toContain('94% relevance score')
    expect(proposal.caseStudyInjection).toContain('https://github.com/example/rag-demo')
    expect(proposal.executionPlan).toHaveLength(3)
    expect(proposal.closingCta).toContain('timeline')
    expect(proposal.fullText).toContain(proposal.hook)
    expect(proposal.fullText).toContain(proposal.caseStudyInjection)
    expect(proposal.matchedCaseStudyId).toBe('cs-ai')
  })

  it('adapts hook style to consultative_partner tone', async () => {
    const customProfile: VoiceProfile = {
      ...DEFAULT_VOICE_PROFILE,
      tone: 'consultative_partner'
    }

    const proposal = await generateAutopilotProposal({
      jobMeta: {
        jobId: '~01982735',
        title: 'Senior Architecture Consultant for Cloud Migration',
        descriptionSnippet: 'Migrating legacy monolithic backend to microservices.'
      },
      clientName: 'David',
      techStack: ['AWS', 'Docker'],
      voiceProfile: customProfile,
      caseStudy: null
    })

    expect(proposal.hook).toContain('David')
    expect(proposal.hook).toContain('biggest challenge')
    expect(proposal.hook).toContain('scope creep')
  })

  it('adapts hook style to velocity_exec tone', async () => {
    const velocityProfile: VoiceProfile = {
      ...DEFAULT_VOICE_PROFILE,
      tone: 'velocity_exec'
    }

    const proposal = await generateAutopilotProposal({
      jobMeta: {
        jobId: '~01982736',
        title: 'Quick React Bug Fix — Urgent Need',
        descriptionSnippet: 'Need someone right away to fix responsive modal CSS bug.'
      },
      clientName: null,
      voiceProfile: velocityProfile,
      caseStudy: null
    })

    expect(proposal.hook).toContain('Hi there')
    expect(proposal.hook).toContain('fast turnaround')
    expect(proposal.hook).toContain('daily production updates')
  })

  it('adheres to custom instructions when tone is custom', async () => {
    const customProfile: VoiceProfile = {
      ...DEFAULT_VOICE_PROFILE,
      tone: 'custom',
      customInstructions: 'Direct and hyper-technical with emphasis on automated test suites.'
    }

    const proposal = await generateAutopilotProposal({
      jobMeta: {
        jobId: '~01982737',
        title: 'Full Stack Engineer for Fintech API',
        descriptionSnippet: 'Node.js and PostgreSQL banking sync service.'
      },
      clientName: 'Elena',
      voiceProfile: customProfile,
      caseStudy: null
    })

    expect(proposal.hook).toContain('Elena')
    expect(proposal.hook).toContain('Direct and hyper-technical')
  })
})
