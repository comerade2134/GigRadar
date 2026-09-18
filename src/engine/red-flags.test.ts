import { describe, expect, it } from 'vitest'
import { scanScamSignals } from './red-flags'

describe('scanScamSignals', () => {
  it('detects telegram and whatsapp scams', () => {
    const res1 = scanScamSignals('Contact me on telegram @john_dev')
    expect(res1.matched).toBe(true)
    expect(res1.matches[0].category).toBe('telegram')

    const res2 = scanScamSignals('Reach out on whatsapp: +1234567890')
    expect(res2.matched).toBe(true)
    expect(res2.matches[0].category).toBe('whatsapp')
  })

  it('does NOT flag legitimate compliance warnings as scams', () => {
    const safeText1 = 'We strictly follow Upwork TOS. Never pay outside of Upwork.'
    const res1 = scanScamSignals(safeText1)
    expect(res1.matched).toBe(false)

    const safeText2 = 'Do not ask to communicate outside of Upwork. All messages must stay on platform.'
    const res2 = scanScamSignals(safeText2)
    expect(res2.matched).toBe(false)

    const safeText3 = 'We will never communicate outside of Upwork. Scammers will be reported.'
    const res3 = scanScamSignals(safeText3)
    expect(res3.matched).toBe(false)
  })
})