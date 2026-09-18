import { describe, it, expect } from 'vitest'
import { formatPolishPrompt, type PolishHookContext } from './byok'

describe('formatPolishPrompt AI Grounding', () => {
  it('formats prompt with string context backward compatibility', () => {
    const prompt = formatPolishPrompt('Hi, saw your job posting.', 'Senior React Architect')
    expect(prompt).toContain('Job Title: Senior React Architect')
    expect(prompt).toContain('Base Draft Hook:\n"Hi, saw your job posting."')
    expect(prompt).not.toContain('Client First Name:')
    expect(prompt).not.toContain('Required Tech Stack:')
  })

  it('embeds full rich context when provided', () => {
    const ctx: PolishHookContext = {
      title: 'Fullstack Next.js & Supabase Migration',
      description: 'We need to migrate our old Express server to Next.js 14 App Router and Supabase.',
      clientName: 'Alexander',
      techStack: ['Next.js', 'Supabase', 'TypeScript'],
      budget: '$5,000 Fixed',
      trueRate: 65.5
    }

    const prompt = formatPolishPrompt('I can help migrate your stack cleanly.', ctx)
    expect(prompt).toContain('Job Title: Fullstack Next.js & Supabase Migration')
    expect(prompt).toContain('Job Context / Description: We need to migrate our old Express server')
    expect(prompt).toContain('Client First Name: Alexander')
    expect(prompt).toContain('Required Tech Stack: Next.js, Supabase, TypeScript')
    expect(prompt).toContain('Job Budget: $5,000 Fixed')
    expect(prompt).toContain('Historical Client Hourly Rate: $65.50/hr')
    expect(prompt).toContain('Base Draft Hook:\n"I can help migrate your stack cleanly."')
  })

  it('omits missing or null fields cleanly', () => {
    const ctx: PolishHookContext = {
      title: 'Python Scraper',
      description: undefined,
      clientName: null,
      techStack: [],
      budget: null,
      trueRate: null
    }

    const prompt = formatPolishPrompt('Ready to scrape.', ctx)
    expect(prompt).toContain('Job Title: Python Scraper')
    expect(prompt).not.toContain('Client First Name:')
    expect(prompt).not.toContain('Required Tech Stack:')
    expect(prompt).not.toContain('Job Budget:')
    expect(prompt).not.toContain('Historical Client Hourly Rate:')
  })
})
