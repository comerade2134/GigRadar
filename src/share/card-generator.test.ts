import { describe, it, expect, vi } from 'vitest'
import {
  formatShareTweetText,
  formatLinkedInShareText,
  renderCardToCanvas
} from './card-generator'
import type { ShareCardStats } from '../types'

describe('card-generator formatShareTweetText', () => {
  it('formats tweet text correctly with connects and dollar savings', () => {
    const stats: ShareCardStats = {
      connectsSaved: 160,
      dollarsSaved: 24.0,
      proRoiMultiplier: '2.7'
    }
    const tweet = formatShareTweetText(stats)
    expect(tweet).toContain('160 Connects (~$24.00 (2.7x ROI on Pro))')
    expect(tweet).toContain('#Upwork #Freelancing #GigRadar')
    expect(tweet).toContain('https://chromewebstore.google.com/detail/nheegeimgmgkbklpgbhipdkmfoedflnm?utm_source=item-share-cb')
    expect(tweet).not.toContain('@GigRadar')
  })

  it('omits ROI part when proRoiMultiplier is undefined or null', () => {
    const stats: ShareCardStats = {
      connectsSaved: 50,
      dollarsSaved: 7.5
    }
    const tweet = formatShareTweetText(stats)
    expect(tweet).toContain('50 Connects (~$7.50)')
    expect(tweet).not.toContain('ROI on Pro')
  })
})

describe('card-generator formatLinkedInShareText', () => {
  it('formats LinkedIn post with bullet points and stats', () => {
    const stats: ShareCardStats = {
      connectsSaved: 220,
      dollarsSaved: 33.0
    }
    const post = formatLinkedInShareText(stats)
    expect(post).toContain('🛡️ 220 Connects protected from low-hire & ghost jobs')
    expect(post).toContain('💵 ~$33.00 saved in platform bidding fees')
    expect(post).toContain('#Upwork #FreelanceLife #ClientVetting #Productivity #GigRadar')
  })
})

describe('card-generator renderCardToCanvas', () => {
  it('safely handles canvas rendering with mock context', () => {
    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      strokeStyle: '',
      lineWidth: 1,
      font: ''
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx)
    } as unknown as HTMLCanvasElement

    const stats: ShareCardStats = {
      connectsSaved: 100,
      dollarsSaved: 15.0,
      proRoiMultiplier: '1.7'
    }

    renderCardToCanvas(mockCanvas, stats)
    expect(mockCanvas.width).toBe(1200)
    expect(mockCanvas.height).toBe(630)
    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(mockCtx.fillText).toHaveBeenCalledWith('GigRadar', expect.any(Number), expect.any(Number))
    expect(mockCtx.fillText).toHaveBeenCalledWith('100', expect.any(Number), expect.any(Number))
  })

  it('bails out cleanly when context is null', () => {
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null)
    } as unknown as HTMLCanvasElement

    expect(() =>
      renderCardToCanvas(mockCanvas, { connectsSaved: 0, dollarsSaved: 0 })
    ).not.toThrow()
  })
})
