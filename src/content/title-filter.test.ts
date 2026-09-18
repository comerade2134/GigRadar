import { describe, expect, it } from 'vitest'
import { isInvalidJobTitle, extractJobId } from './parse'

describe('title-filter and job ID extraction', () => {
  describe('isInvalidJobTitle', () => {
    it('identifies secondary action link text as invalid job titles', () => {
      expect(isInvalidJobTitle('Open job in a new window')).toBe(true)
      expect(isInvalidJobTitle('open job in new window')).toBe(true)
      expect(isInvalidJobTitle('Open in a new window')).toBe(true)
      expect(isInvalidJobTitle('open in new window')).toBe(true)
      expect(isInvalidJobTitle('Open in new tab')).toBe(true)
      expect(isInvalidJobTitle('Save job')).toBe(true)
      expect(isInvalidJobTitle('Saved')).toBe(true)
      expect(isInvalidJobTitle('Share job')).toBe(true)
      expect(isInvalidJobTitle('Share')).toBe(true)
      expect(isInvalidJobTitle('Upwork job')).toBe(true)
      expect(isInvalidJobTitle('Apply now')).toBe(true)
    })

    it('rejects empty or very short strings', () => {
      expect(isInvalidJobTitle('')).toBe(true)
      expect(isInvalidJobTitle('a')).toBe(true)
      expect(isInvalidJobTitle(null)).toBe(true)
      expect(isInvalidJobTitle(undefined)).toBe(true)
    })

    it('accepts genuine Upwork job titles', () => {
      expect(isInvalidJobTitle('Senior AI Engineer (RAG / LangChain / Vector DB)')).toBe(false)
      expect(isInvalidJobTitle('Safety Supplies Store - Fix Tracking Pixels')).toBe(false)
      expect(isInvalidJobTitle('Italian Speaking Telemarketer / B2B Lead Generator')).toBe(false)
      expect(isInvalidJobTitle('Full Stack React / Node Developer')).toBe(false)
      expect(isInvalidJobTitle('Shopify Liquid Expert Needed')).toBe(false)
    })
  })

  describe('extractJobId', () => {
    it('extracts tilde job ID from search card links', () => {
      expect(extractJobId('https://www.upwork.com/jobs/~01abc123456789')).toBe('01abc123456789')
      expect(extractJobId('https://www.upwork.com/nx/search/jobs/details/~019876543210fe')).toBe('019876543210fe')
      expect(extractJobId('/jobs/~01fedcba098765')).toBe('01fedcba098765')
    })
  })
})
