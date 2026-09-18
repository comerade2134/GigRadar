import { describe, expect, it } from 'vitest'
import {
  extractCompanyEntity,
  extractReviewRedFlags,
  extractPraiseHighlights,
  extractTechStack,
  buildClientDossier
} from './client-dossier'

describe('client-dossier', () => {
  describe('extractCompanyEntity', () => {
    it('extracts custom web domain from job description', () => {
      const desc = 'We need a developer to rebuild our store at https://craftsupply.store with custom checkout.'
      const result = extractCompanyEntity([], desc)
      expect(result).not.toBeNull()
      expect(result?.domain).toBe('craftsupply.store')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it('ignores generic third-party domains like github, google, upwork', () => {
      const desc = 'See our code on github.com and reference design on figma.com.'
      const result = extractCompanyEntity([], desc)
      expect(result).toBeNull()
    })

    it('extracts company name with business entity suffix', () => {
      const desc = 'We are Apex Ventures LLC. We need an experienced engineer.'
      const result = extractCompanyEntity([], desc)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Apex Ventures LLC')
    })

    it('extracts company name mentioned in freelancer feedbacks', () => {
      const feedbacks = [
        'Awesome experience working with Alex and the CloudScale team!',
        'Fast payment and clear directions.'
      ]
      const result = extractCompanyEntity(feedbacks, '')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('CloudScale team')
      expect(result?.source).toBe('feedback')
    })
  })

  describe('extractReviewRedFlags', () => {
    it('catches dispute / unpaid feedback quotes', () => {
      const feedbacks = [
        'Client refused to pay final milestone after 40 hours of work. Avoid this client.',
        'Great client!'
      ]
      const flags = extractReviewRedFlags(feedbacks)
      expect(flags.length).toBeGreaterThan(0)
      expect(flags[0].category).toBe('unpaid')
      expect(flags[0].snippet).toContain('refused to pay')
    })

    it('catches scope creep warnings', () => {
      const feedbacks = [
        'Constant scope creep and unreasonable demands. Kept adding new features without paying.'
      ]
      const flags = extractReviewRedFlags(feedbacks)
      expect(flags.length).toBeGreaterThan(0)
      expect(flags[0].category).toBe('scope_creep')
    })

    it('catches hostile and rude communication', () => {
      const feedbacks = [
        'Client was extremely rude and unprofessional when asking for status updates.'
      ]
      const flags = extractReviewRedFlags(feedbacks)
      expect(flags.length).toBeGreaterThan(0)
      expect(flags[0].category).toBe('rude')
    })

    it('flags low ratings below 3.5 stars', () => {
      const feedbacks = [
        '★ 2.00 Project ended unexpectedly with poor coordination.'
      ]
      const flags = extractReviewRedFlags(feedbacks)
      expect(flags.length).toBeGreaterThan(0)
      expect(flags[0].rating).toBe(2)
    })
  })

  describe('extractPraiseHighlights', () => {
    it('detects prompt payment and great communication', () => {
      const feedbacks = [
        'Prompt pay, released milestone immediately upon delivery.',
        'Great communication and very responsive client.'
      ]
      const praise = extractPraiseHighlights(feedbacks)
      expect(praise).toContain('⚡ Fast Payer')
      expect(praise).toContain('💬 Great Communicator')
    })
  })

  describe('extractTechStack', () => {
    it('identifies technologies from description and past contract titles', () => {
      const desc = 'Looking for a senior developer skilled in React, Next.js, and Tailwind CSS.'
      const contracts = [
        'Shopify Liquid Theme Customization',
        'PostgreSQL database migration'
      ]
      const stack = extractTechStack(contracts, desc)
      expect(stack).toContain('React')
      expect(stack).toContain('Next.js')
      expect(stack).toContain('Tailwind CSS')
      expect(stack).toContain('Shopify')
      expect(stack).toContain('PostgreSQL')
    })
  })

  describe('buildClientDossier', () => {
    it('synthesizes a full client dossier object', () => {
      const dossier = buildClientDossier({
        feedbacks: [
          'Alex and the NovaTech team were great! Fast pay and clear instructions.',
          'Small scope creep on the second milestone, but settled fairly.'
        ],
        description: 'NovaTech LLC is hiring a Python & FastAPI backend specialist. Visit novatech.ai.',
        contractTitles: ['FastAPI Microservices', 'Docker Deployment']
      })

      expect(dossier.company?.name).toBe('NovaTech LLC')
      expect(dossier.company?.domain).toBe('novatech.ai')
      expect(dossier.techStack).toContain('Python')
      expect(dossier.techStack).toContain('FastAPI')
      expect(dossier.praiseHighlights.length).toBeGreaterThan(0)
      expect(dossier.reviewRedFlags.length).toBeGreaterThan(0)
    })
  })
})
