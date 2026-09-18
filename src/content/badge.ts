import { SELECTORS, queryFirst } from '../config/selectors'
import { findCardTitleLink } from './parse'
import type { Tier } from '../types'
import { t, type SupportedLocale } from '../i18n'

const BADGE_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .gr-badge {
    display: inline-flex; align-items: center; gap: 7px;
    margin-top: 8px;
    padding: 5px 12px 5px 9px;
    border-radius: 9px;
    background: #0A0E14;
    border: 1px solid #1E2530;
    color: #F3F4F6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
    font-size: 11.5px; line-height: 1;
    cursor: pointer; user-select: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .05);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, background 0.2s ease;
    width: max-content;
    will-change: transform;
  }
  .gr-badge:hover {
    transform: translateY(-1px) scale(1.02);
    border-color: #2E3846;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .6), 0 0 12px rgba(16, 185, 129, .12);
  }
  .gr-badge:active { transform: translateY(0) scale(.98); }
  .gr-dot { width: 6px; height: 6px; border-radius: 999px; flex: none; }
  .gr-high   .gr-dot { background: #34D399; box-shadow: 0 0 10px rgba(52, 211, 153, .8), 0 0 3px #10B981; }
  .gr-medium .gr-dot { background: #F59E0B; box-shadow: 0 0 10px rgba(245, 158, 11, .75); }
  .gr-low    .gr-dot { background: #EF4444; box-shadow: 0 0 10px rgba(239, 68, 68, .75); }
  .gr-high   { border-color: rgba(16, 185, 129, .38); background: linear-gradient(180deg, #0E1519, #0A0E14); }
  .gr-high:hover { border-color: rgba(52, 211, 153, .7); box-shadow: 0 6px 20px rgba(0, 0, 0, .6), 0 0 16px rgba(16, 185, 129, .25); }
  .gr-medium { border-color: rgba(245, 158, 11, .38); background: linear-gradient(180deg, #15130E, #0A0E14); }
  .gr-medium:hover { border-color: rgba(245, 158, 11, .7); box-shadow: 0 6px 20px rgba(0, 0, 0, .6), 0 0 16px rgba(245, 158, 11, .2); }
  .gr-low    { border-color: rgba(239, 68, 68, .35); background: linear-gradient(180deg, #170E11, #0A0E14); }
  .gr-low:hover { border-color: rgba(239, 68, 68, .7); box-shadow: 0 6px 20px rgba(0, 0, 0, .6), 0 0 16px rgba(239, 68, 68, .2); }
  .gr-brand {
    font-weight: 800; font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase;
    background: linear-gradient(90deg, #34D399, #10B981);
    -webkit-background-clip: text; background-clip: text;
    color: transparent;
  }
  .gr-score { font-weight: 800; font-size: 12.5px; color: #FFFFFF; font-variant-numeric: tabular-nums; }
  .gr-tier  { font-weight: 700; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: #94A3B8; }
  .gr-provisional { font-weight: 800; font-size: 8px; letter-spacing: .06em; color: #FCD34D; }
  .gr-flag {
    margin-left: 1px; padding: 2px 6.5px; border-radius: 5px;
    background: rgba(245, 158, 11, .14); border: 1px solid rgba(245, 158, 11, .32);
    color: #FCD34D; font-size: 9.5px; font-weight: 800; font-variant-numeric: tabular-nums;
  }
  .gr-neutral { border-color: #1E2530; background: #0A0E14; }
  .gr-neutral .gr-dot {
    background: #94A3B8;
    border: 1px solid #475569;
    box-shadow: none;
  }
  .gr-hint { font-weight: 600; font-size: 9.5px; letter-spacing: .02em; color: #94A3B8; }
  .gr-alert {
    display: flex; align-items: center; gap: 6px;
    margin-top: 5px;
    padding: 5.5px 11px;
    border-radius: 7px;
    border: 1px solid transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
    font-size: 11px; font-weight: 800; letter-spacing: -.01em; line-height: 1.35;
    width: max-content; max-width: 100%;
    cursor: pointer; user-select: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .45);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }
  .gr-alert:hover { transform: translateY(-1px) scale(1.02); }
  .gr-a-high   { background: rgba(16, 185, 129, .13); border-color: rgba(52, 211, 153, .45); color: #34D399; box-shadow: 0 0 14px rgba(16, 185, 129, .2), 0 2px 8px rgba(0, 0, 0, .4); }
  .gr-a-danger { background: rgba(239, 68, 68, .12);  border-color: rgba(239, 68, 68, .42);  color: #FCA5A5; }
  .gr-a-warn   { background: rgba(245, 158, 11, .12); border-color: rgba(245, 158, 11, .38); color: #FCD34D; }
  .gr-team-alert {
    display: flex; align-items: center; gap: 7px;
    margin-top: 5px;
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(139, 92, 246, 0.14);
    border: 1px solid rgba(139, 92, 246, 0.45);
    color: #DDD6FE;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
    font-size: 11px; font-weight: 700; line-height: 1.35;
    width: max-content; max-width: 100%;
    cursor: pointer; user-select: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45), 0 0 12px rgba(139, 92, 246, 0.2);
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gr-team-alert:hover {
    transform: translateY(-1px) scale(1.02);
    border-color: rgba(167, 139, 250, 0.7);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 16px rgba(139, 92, 246, 0.35);
  }
  .gr-team-dot {
    width: 7px; height: 7px; border-radius: 999px;
    background: #A78BFA;
    box-shadow: 0 0 8px #8B5CF6;
    animation: gr-pulse 2s infinite ease-in-out;
  }
  @keyframes gr-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
`

export interface BadgeAlert {
  level: 'high' | 'danger' | 'warn'
  text: string
}

export interface TeamAlertInfo {
  memberName: string
  status: 'drafting' | 'applied' | 'viewing'
  timeAgo: string
}

export interface BadgeOptions {
  score: number | null
  tier: Tier | null
  flagCount: number
  provisional?: boolean
  alert?: BadgeAlert | null
  teamAlert?: TeamAlertInfo | null
  locale?: SupportedLocale
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

  const locale = options.locale || 'en'
  const neutral = options.score == null || options.tier == null
  const pill = document.createElement('div')
  pill.className = `gr-badge ${neutral ? 'gr-neutral' : `gr-${options.tier!.toLowerCase()}`}`
  pill.setAttribute('role', 'button')
  pill.tabIndex = 0

  const tierKey =
    options.tier === 'HIGH'
      ? 'badge_high_intent'
      : options.tier === 'MEDIUM'
        ? 'badge_medium_intent'
        : 'badge_low_intent'
  const translatedTier = options.tier ? t(tierKey, locale) : ''

  pill.setAttribute(
    'aria-label',
    neutral
      ? t('badge_click_to_inspect', locale)
      : `GigRadar client score ${options.score} of 100, ${translatedTier}${
          options.provisional ? `, ${t('badge_provisional', locale).toLowerCase()}` : ''
        }`
  )

  pill.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    }
  })

  const flagMark =
    options.flagCount > 0 ? `<span class="gr-flag">⚠ ${options.flagCount}</span>` : ''

  pill.innerHTML = neutral
    ? [
        '<span class="gr-dot"></span>',
        '<span class="gr-brand">GigRadar</span>',
        '<span class="gr-score">--</span>',
        `<span class="gr-hint">${t('badge_click_to_inspect', locale)}</span>`,
        flagMark
      ].join('')
    : [
        '<span class="gr-dot"></span>',
        '<span class="gr-brand">GigRadar</span>',
        `<span class="gr-score">${options.score}</span>`,
        `<span class="gr-tier">${translatedTier}</span>`,
        options.provisional ? `<span class="gr-provisional">${t('badge_provisional', locale)}</span>` : '',
        flagMark
      ].join('')

  shadow.append(style, pill)

  if (options.alert) {
    const bar = document.createElement('div')
    bar.className = `gr-alert gr-a-${options.alert.level}`
    bar.textContent = options.alert.text
    bar.setAttribute('role', 'button')
    bar.tabIndex = 0
    bar.setAttribute('aria-label', options.alert.text)
    bar.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    })
    bar.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }
    })
    shadow.append(bar)
  }

  if (options.teamAlert) {
    const teamBar = document.createElement('div')
    teamBar.className = 'gr-team-alert'
    const statusKey =
      options.teamAlert.status === 'applied'
        ? 'team_member_applied'
        : options.teamAlert.status === 'drafting'
          ? 'team_member_drafting'
          : 'team_member_viewing'
    const statusText = t(statusKey, locale)
    teamBar.innerHTML = `<span class="gr-team-dot"></span><span>👥 TEAM: <b>${options.teamAlert.memberName}</b> ${statusText} (${options.teamAlert.timeAgo})</span>`
    teamBar.setAttribute('role', 'button')
    teamBar.tabIndex = 0
    teamBar.setAttribute(
      'aria-label',
      `Team alert: ${options.teamAlert.memberName} ${statusText} ${options.teamAlert.timeAgo}`
    )
    teamBar.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    })
    teamBar.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }
    })
    shadow.append(teamBar)
  }

  // Guarantee zero duplicate badges inside this card
  card.querySelectorAll('[data-gigradar-badge]').forEach((el) => el.remove())

  const titleInfo = findCardTitleLink(card)
  const anchor = titleInfo?.link ?? queryFirst(card, SELECTORS.titleLink)
  const titleContainer =
    anchor?.closest('h2, h3, h4, [class*="title"], [data-test*="title"]') ??
    anchor?.parentElement
  if (titleContainer && card.contains(titleContainer)) {
    titleContainer.insertAdjacentElement('afterend', host)
  } else {
    card.prepend(host)
  }

  host.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })

  return host
}
