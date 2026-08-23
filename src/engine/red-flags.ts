import type { ScamMatch, ScamScanResult } from '../types'

interface ScamPattern {
  category: string
  regex: RegExp
}

const PATTERNS: readonly ScamPattern[] = [
  {
    category: 'telegram',
    regex:
      /\b(?:t\.me\/[A-Za-z0-9_]{3,}|telegram(?:\.me)?\/[A-Za-z0-9_]{3,}|\btg\s*[:\-]\s*@\w[\w.]{2,}|(?:contact|message|reach|ping|dm)(?:\s+me)?\s+(?:on|via|at|through)\s+telegram)\b/i
  },
  {
    category: 'whatsapp',
    regex:
      /\b(?:wa\.me\/\d{6,}|whatsapp(?:\s+(?:me|us|at|on))?\s*(?:[:\-]|\+?\d{7,})|(?:contact|message|reach|ping)(?:\s+me)?\s+(?:on|via|at|through)\s+whatsapp)\b/i
  },
  {
    category: 'off-platform-email',
    regex:
      /\b[\w.%-]+\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+)\s*(?:gmail|yahoo|hotmail|outlook|protonmail|gmx|mail\.ru|yandex)\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+)\s*(?:com|net|org|ru|co)/i
  },
  {
    category: 'plain-personal-email',
    regex: /\b[\w.%+-]+@(?:gmail|yahoo|hotmail|outlook|protonmail|gmx)\.(?:com|net|org|co)\b/i
  },
  {
    category: 'free-work-request',
    regex:
      /\b(?:(?:free|unpaid)\s+(?:sample|trial|test\s*(?:task|project|work)?|spec\s*(?:test|work|project)?|mockup|demo)|(?:complete|do|deliver|submit)\s+(?:a\s+)?(?:free|unpaid)\s+(?:sample|test\s*task|spec)|(?:small|quick)\s+(?:unpaid\s+)?(?:test\s*task|spec\s*(?:work|task))\s+(?:first|before|to\s+start)|(?:paid\s+after|only\s+pay(?:ing)?\s+(?:after|once|if))[^.\n]{0,40}(?:approv|satisfi))/i
  },
  {
    category: 'off-platform-steer',
    regex:
      /\b(?:(?:payment|pay|communicat\w*|chat|interview)\s+(?:outside|off)[\s-]*(?:of\s+)?upwork|(?:move|take|continue|migrate)\s+(?:this\s+|the\s+)?(?:conversation|communication|discussion|project|work|payment)s?\s+(?:outside|off)[\s-]*(?:of\s+)?upwork|(?:western\s+union|money\s?gram|crypto(?:currency)?|bitcoin|btc|usdt)\b)/i
  }
]

function snippetAround(text: string, index: number): string {
  const start = Math.max(0, index - 48)
  const end = Math.min(text.length, index + 96)
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return raw.length > 120 ? `${raw.slice(0, 119)}…` : raw
}

export function scanScamSignals(text: string | null | undefined): ScamScanResult {
  if (!text || text.length < 8) return { matched: false, matches: [] }

  const matches: ScamMatch[] = []
  for (const pattern of PATTERNS) {
    const found = pattern.regex.exec(text)
    if (found) {
      matches.push({ category: pattern.category, snippet: snippetAround(text, found.index) })
    }
  }
  return { matched: matches.length > 0, matches }
}

export const SCAM_FLAG_TEXT = '🚨 Potential Scam / Off-Platform Trap — Risk of Account Ban'
