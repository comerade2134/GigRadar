import type { ShareCardStats } from '../types'

export const OFFICIAL_WEBSITE_URL =
  'https://chromewebstore.google.com/detail/nheegeimgmgkbklpgbhipdkmfoedflnm?utm_source=item-share-cb'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

export function formatShareTweetText(stats: ShareCardStats): string {
  const dollars = stats.dollarsSaved.toFixed(2)
  const roiPart = stats.proRoiMultiplier ? ` (${stats.proRoiMultiplier}x ROI on Pro)` : ''
  return (
    `Upwork Connects are getting out of hand.\n\n` +
    `GigRadar just protected ${stats.connectsSaved} Connects (~$${dollars}${roiPart}) from ghost listings and scam jobs for me so far.\n\n` +
    `Get GigRadar on Chrome Web Store: ${OFFICIAL_WEBSITE_URL}\n\n#Upwork #Freelancing #GigRadar`
  )
}

export function formatLinkedInShareText(stats: ShareCardStats): string {
  const dollars = stats.dollarsSaved.toFixed(2)
  return (
    `Freelancing on Upwork in 2026 requires discipline with Connects spend.\n\n` +
    `I've been using GigRadar to screen client hire rates, payment history, and ghost listings before bidding.\n\n` +
    `Results so far:\n` +
    `🛡️ ${stats.connectsSaved} Connects protected from low-hire & ghost jobs\n` +
    `💵 ~$${dollars} saved in platform bidding fees\n` +
    `⚡ 100% deterministic, local client inspection\n\n` +
    `Inspect clients before spending Connects: ${OFFICIAL_WEBSITE_URL}\n\n` +
    `#Upwork #FreelanceLife #ClientVetting #Productivity #GigRadar`
  )
}

export function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  stats: ShareCardStats
): void {
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 1. Base obsidian background
  ctx.fillStyle = '#0D0F12'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 2. Ambient emerald radial glow (top right)
  const glow1 = ctx.createRadialGradient(950, 150, 10, 950, 150, 480)
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.18)')
  glow1.addColorStop(0.5, 'rgba(5, 150, 105, 0.06)')
  glow1.addColorStop(1, 'rgba(13, 15, 18, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Ambient emerald glow (bottom left)
  const glow2 = ctx.createRadialGradient(250, 500, 10, 250, 500, 360)
  glow2.addColorStop(0, 'rgba(52, 211, 153, 0.10)')
  glow2.addColorStop(1, 'rgba(13, 15, 18, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // 3. Inner card surface with subtle border
  const margin = 48
  const cardW = CARD_WIDTH - margin * 2
  const cardH = CARD_HEIGHT - margin * 2
  const cardR = 24

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(margin, margin, cardW, cardH, cardR)
  ctx.fillStyle = '#12151C'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#1F242D'
  ctx.stroke()
  ctx.clip()

  // Subtle top highlight line inside the card
  ctx.beginPath()
  ctx.moveTo(margin + cardR, margin + 1)
  ctx.lineTo(margin + cardW - cardR, margin + 1)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 4. Logo icon & Header row
  const logoX = margin + 44
  const logoY = margin + 44
  const logoSize = 64
  const logoRadius = 18

  // Logo square background
  ctx.beginPath()
  ctx.roundRect(logoX, logoY, logoSize, logoSize, logoRadius)
  ctx.fillStyle = '#161A22'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)'
  ctx.stroke()

  // Lightning bolt symbol in logo
  ctx.save()
  const boltGrad = ctx.createLinearGradient(logoX + 20, logoY + 12, logoX + 44, logoY + 52)
  boltGrad.addColorStop(0, '#34D399')
  boltGrad.addColorStop(1, '#10B981')
  ctx.fillStyle = boltGrad
  ctx.beginPath()
  ctx.moveTo(logoX + 37, logoY + 14)
  ctx.lineTo(logoX + 21, logoY + 34)
  ctx.lineTo(logoX + 33, logoY + 34)
  ctx.lineTo(logoX + 27, logoY + 50)
  ctx.lineTo(logoX + 45, logoY + 28)
  ctx.lineTo(logoX + 33, logoY + 28)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Brand Name & Tagline
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 36px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText('GigRadar', logoX + logoSize + 20, logoY + 36)

  ctx.fillStyle = '#10B981'
  ctx.font = 'bold 13px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText('UPWORK CLIENT INSPECTOR', logoX + logoSize + 22, logoY + 57)

  // Top-right Verified Pill Badge
  const pillW = 210
  const pillH = 40
  const pillX = margin + cardW - 44 - pillW
  const pillY = logoY + 12

  ctx.beginPath()
  ctx.roundRect(pillX, pillY, pillW, pillH, 20)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Pulsing green dot inside pill
  ctx.beginPath()
  ctx.arc(pillX + 22, pillY + 20, 5.5, 0, Math.PI * 2)
  ctx.fillStyle = '#34D399'
  ctx.fill()

  ctx.fillStyle = '#A7F3D0'
  ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText('VERIFIED SAVINGS', pillX + 38, pillY + 25)

  // 5. Hero Stats Display
  const statY = logoY + 135

  ctx.fillStyle = '#94A3B8'
  ctx.font = 'bold 15px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText('CUMULATIVE BIDDING INTEL', logoX, statY)

  // Huge Count number
  const countText = String(stats.connectsSaved)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 88px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText(countText, logoX, statY + 84)

  const countWidth = ctx.measureText(countText).width
  ctx.fillStyle = '#34D399'
  ctx.font = 'bold 40px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText(' Connects Protected', logoX + countWidth, statY + 84)

  // Subtitle with Dollars & ROI
  const dollarsFormatted = `$${stats.dollarsSaved.toFixed(2)}`
  ctx.fillStyle = '#E2E8F0'
  ctx.font = '500 24px Inter, system-ui, -apple-system, sans-serif'
  const subText = `Saved ~${dollarsFormatted} USD by avoiding ghost listings and low-hire clients`
  ctx.fillText(subText, logoX, statY + 130)

  // ROI Highlight Pill (if multiplier available)
  if (stats.proRoiMultiplier) {
    const roiBadgeX = logoX
    const roiBadgeY = statY + 155
    const roiBadgeW = 200
    const roiBadgeH = 42

    ctx.beginPath()
    ctx.roundRect(roiBadgeX, roiBadgeY, roiBadgeW, roiBadgeH, 12)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#FDE68A'
    ctx.font = 'bold 16px Inter, system-ui, -apple-system, sans-serif'
    ctx.fillText(`⚡ ${stats.proRoiMultiplier}x Pro ROI`, roiBadgeX + 22, roiBadgeY + 27)
  }

  // 6. Bottom Divider & Footer
  const footerY = margin + cardH - 56

  ctx.beginPath()
  ctx.moveTo(margin + 44, footerY - 24)
  ctx.lineTo(margin + cardW - 44, footerY - 24)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#64748B'
  ctx.font = '500 15px Inter, system-ui, -apple-system, sans-serif'
  ctx.fillText('100% Deterministic Verification · Zero Telemetry · Upwork Inspector', margin + 44, footerY + 8)

  const tagText = '#Upwork #Freelancing #GigRadar'
  ctx.fillStyle = '#94A3B8'
  ctx.font = 'bold 15px Inter, system-ui, -apple-system, sans-serif'
  const tagWidth = ctx.measureText(tagText).width
  ctx.fillText(tagText, margin + cardW - 44 - tagWidth, footerY + 8)

  ctx.restore()
}

export function generateSavingsCardDataUrl(stats: ShareCardStats): string {
  const canvas = document.createElement('canvas')
  renderCardToCanvas(canvas, stats)
  return canvas.toDataURL('image/png')
}

export async function generateSavingsCardBlob(
  stats: ShareCardStats
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  renderCardToCanvas(canvas, stats)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate canvas blob'))
    }, 'image/png')
  })
}
