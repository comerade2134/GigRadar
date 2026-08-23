import { SELECTORS, queryFirst } from '../config/selectors'
import type { Tier } from '../types'

const BADGE_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .gr-badge {
    display: inline-flex; align-items: center; gap: 7px;
    margin-top: 8px;
    padding: 5px 12px 5px 9px;
    border-radius: 10px;
    background: rgba(13,15,18,.96);
    border: 1px solid #262C37;
    color: #F3F4F6;
    font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11.5px; line-height: 1;
    cursor: pointer; user-select: none;
    box-shadow: 0 1px 2px rgba(2,6,23,.4), inset 0 1px 0 rgba(255,255,255,.05);
    transition: transform .12s ease, box-shadow .16s ease, border-color .16s ease;
    width: max-content;
  }
  .gr-badge:hover {
    transform: translateY(-1px);
    border-color: #3A4250;
    box-shadow: 0 5px 16px rgba(2,6,23,.5);
  }
  .gr-badge:active { transform: translateY(0) scale(.985); }
  .gr-dot { width: 6px; height: 6px; border-radius: 999px; flex: none; }
  .gr-high   .gr-dot { background: #10B981; box-shadow: 0 0 8px rgba(16,185,129,.7); }
  .gr-medium .gr-dot { background: #F59E0B; box-shadow: 0 0 8px rgba(245,158,11,.55); }
  .gr-low    .gr-dot { background: #EF4444; box-shadow: 0 0 8px rgba(239,68,68,.55); }
  .gr-high   { border-color: rgba(16,185,129,.35); }
  .gr-low    { border-color: rgba(239,68,68,.30); }
  .gr-brand {
    font-weight: 700; font-size: 11px; letter-spacing: -.01em;
    background: linear-gradient(90deg, #34D399, #10B981);
    -webkit-background-clip: text; background-clip: text;
    color: transparent;
  }
  .gr-score { font-weight: 800; font-size: 12.5px; color: #FFFFFF; font-variant-numeric: tabular-nums; }
  .gr-tier  { font-weight: 600; font-size: 9.5px; letter-spacing: .08em; color: #9CA3AF; }
  .gr-flag {
    margin-left: 1px; padding: 2.5px 7px; border-radius: 6px;
    background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.28);
    color: #FBBF24; font-size: 9.5px; font-weight: 800;
  }
  .gr-neutral { border-color: #333B47; }
  .gr-neutral .gr-dot {
    background: #F3F4F6;
    border: 1px solid #6B7280;
    box-shadow: none;
  }
  .gr-hint { font-weight: 600; font-size: 9.5px; letter-spacing: .02em; color: #9CA3AF; }
  .gr-alert {
    display: flex; align-items: center; gap: 6px;
    margin-top: 5px;
    padding: 5.5px 11px;
    border-radius: 8px;
    border: 1px solid transparent;
    font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px; font-weight: 800; letter-spacing: -.01em; line-height: 1.35;
    width: max-content; max-width: 100%;
    cursor: pointer; user-select: none;
    box-shadow: 0 1px 2px rgba(2,6,23,.4);
    transition: transform .12s ease, box-shadow .16s ease;
  }
  .gr-alert:hover { transform: translateY(-1px); }
  .gr-a-high   { background: rgba(16,185,129,.13); border-color: rgba(16,185,129,.45); color: #34D399; box-shadow: 0 0 14px rgba(16,185,129,.18), 0 1px 2px rgba(2,6,23,.4); }
  .gr-a-danger { background: rgba(239,68,68,.11);  border-color: rgba(239,68,68,.38);  color: #FCA5A5; }
  .gr-a-warn   { background: rgba(245,158,11,.11); border-color: rgba(245,158,11,.32); color: #FCD34D; }
`

export interface BadgeAlert {
  level: 'high' | 'danger' | 'warn'
  text: string
}

export interface BadgeOptions {
  score: number | null
  tier: Tier | null
  flagCount: number
  alert?: BadgeAlert | null
}

export function isBadged(card: HTMLElement): boolean {
  return card.querySelector('[data-gigradar-badge]') != null
}

export function mountBadge(
  card: HTMLElement,
  options: BadgeOptions,
  onClick: () => void
): HTMLElement {
  const host = document.createElement('div')
  host.dataset.gigradarBadge = ''
  host.style.cssText = 'width:100%;display:block'

  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = BADGE_STYLES

  const neutral = options.score == null || options.tier == null
  const pill = document.createElement('div')
  pill.className = `gr-badge ${neutral ? 'gr-neutral' : `gr-${options.tier!.toLowerCase()}`}`
  pill.setAttribute(
    'role',
    'button'
  )
  pill.setAttribute(
    'aria-label',
    neutral
      ? 'GigRadar: no client data visible on this card. Click to inspect.'
      : `GigRadar client score ${options.score} of 100, ${options.tier} intent`
  )

  const flagMark =
    options.flagCount > 0 ? `<span class="gr-flag">⚠ ${options.flagCount}</span>` : ''

  pill.innerHTML = neutral
    ? [
        '<span class="gr-dot"></span>',
        '<span class="gr-brand">GigRadar</span>',
        '<span class="gr-score">--</span>',
        '<span class="gr-hint">Click to Inspect</span>',
        flagMark
      ].join('')
    : [
        '<span class="gr-dot"></span>',
        '<span class="gr-brand">GigRadar</span>',
        `<span class="gr-score">${options.score}</span>`,
        `<span class="gr-tier">${options.tier}</span>`,
        flagMark
      ].join('')

  shadow.append(style, pill)

  if (options.alert) {
    const bar = document.createElement('div')
    bar.className = `gr-alert gr-a-${options.alert.level}`
    bar.textContent = options.alert.text
    bar.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    })
    shadow.append(bar)
  }

  const anchor = queryFirst(card, SELECTORS.titleLink)
  const titleRow = anchor?.parentElement
  if (titleRow && titleRow.parentElement === card) {
    titleRow.insertAdjacentElement('afterend', host)
  } else {
    card.appendChild(host)
  }

  host.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })

  return host
}
