import { describe, expect, it } from 'vitest'
import { extractClientName } from './name-extractor'

describe('extractClientName', () => {
  it('extracts high confidence name from sentence-capitalized praise', () => {
    const feedbacks = [
      'Sarah was amazing to work with. Fast payment and great communication!',
      'Thanks Sarah for the clear specifications.',
      'Working with Sarah was a fantastic experience.'
    ]
    const result = extractClientName(feedbacks)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Sarah')
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85)
    expect(result?.votes).toBe(3)
  })

  it('rejects platform and role words even with multiple mentions', () => {
    const feedbacks = [
      'Working with Upwork was great as usual.',
      'Thanks Upwork for the platform.',
      'Working with the Freelancer was great.',
      'Thanks Freelancer for all your help.',
      'The Buyer was responsive and quick.',
      'Thanks Buyer for the prompt milestone release.'
    ]
    const result = extractClientName(feedbacks)
    expect(result).toBeNull()
  })

  it('rejects conversational words (Guys, Mate, Folks, Everyone)', () => {
    const feedbacks = [
      'Thanks Guys for making this project smooth.',
      'Thanks guys for your help.',
      'Thanks Mate for the quick turnaround.',
      'Working with Mate was fantastic.'
    ]
    const result = extractClientName(feedbacks)
    expect(result).toBeNull()
  })
})