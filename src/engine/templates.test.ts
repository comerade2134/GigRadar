import { describe, it, expect } from 'vitest'
import {
  detectTargetDiscipline,
  cleanProjectRef,
  generateHookVariants
} from './templates'

describe('Proposal Hook Engine', () => {
  it('detects reverse engineering and copy protection discipline', () => {
    const focus = detectTargetDiscipline(
      'program (copy/protection) for Korg pa5x Keyborad instrument',
      'Need to reverse engineer binary and build license protection',
      ['.NET / C#', 'C / C++', 'Delphi', 'Assembly / Rev Eng']
    )
    expect(focus.subject).toBe('reverse engineering & binary protection')
    expect(focus.solutionType).toContain('binary protection')
  })

  it('detects audio instrument software discipline', () => {
    const focus = detectTargetDiscipline(
      'Synthesizer MIDI controller for Korg keyboard',
      'Need low latency audio VST integration'
    )
    expect(focus.subject).toBe('audio instrument software & hardware integration')
  })

  it('detects B2B cold calling and lead generation', () => {
    const focus = detectTargetDiscipline(
      'Cold caller for B2B telemarketing campaign',
      'Need appointment setting to book calls with dentists'
    )
    expect(focus.subject).toBe('B2B outbound prospecting & appointment setting')
  })

  it('extracts natural project references from title', () => {
    expect(
      cleanProjectRef('program (copy/protection) for Korg pa5x Keyborad instrument')
    ).toBe('Korg pa5x Keyborad instrument')

    expect(cleanProjectRef('Looking for Senior React Developer for SaaS Platform')).toBe(
      'SaaS Platform'
    )

    expect(cleanProjectRef('Quick bug fix')).toBe('Quick bug fix')
  })

  it('generates hyper-specific proposal hooks matching tech stack', () => {
    const variants = generateHookVariants({
      jobId: 'job-123',
      title: 'program (copy/protection) for Korg pa5x Keyborad instrument',
      description: 'Need reverse engineering of binary with C# and C++',
      clientName: 'Sarah',
      techStack: ['.NET / C#', 'C / C++', 'Delphi', 'Assembly / Rev Eng']
    })

    expect(variants.length).toBe(3)
    // Option A: Direct & Personalized
    expect(variants[0].label).toBe('A')
    expect(variants[0].text).toContain('Hi Sarah,')
    expect(variants[0].text).toContain('reverse engineering & binary protection')
    expect(variants[0].text).toContain('Korg pa5x Keyborad instrument')

    // Option B: Problem-First
    expect(variants[1].label).toBe('B')
    expect(variants[1].text).toContain('reverse engineering & binary protection')

    // Option C: Quick Credibility with exact stack
    expect(variants[2].label).toBe('C')
    expect(variants[2].text).toContain('.NET / C#, C / C++, Delphi')
  })
})
