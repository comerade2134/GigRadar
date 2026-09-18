import type {
  ClientDossier,
  CompanyEntity,
  ReviewRedFlag,
  ReviewRedFlagCategory
} from '../types'

// Domains that should not be treated as client company domains
const EXCLUDED_DOMAINS = new Set([
  'upwork.com',
  'google.com',
  'github.com',
  'gitlab.com',
  'loom.com',
  'figma.com',
  'slack.com',
  'zoom.us',
  'calendly.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'bit.ly',
  'tinyurl.com',
  'dropbox.com',
  'notion.so',
  'notion.site',
  'trello.com',
  'asana.com',
  'jira.com',
  'atlassian.net',
  'airtable.com',
  'apple.com',
  'microsoft.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
  'medium.com',
  'wikipedia.org',
  'wordpress.org',
  'w3.org'
])

const TECH_CATALOG: Array<{ name: string; pattern: RegExp }> = [
  // E-Commerce & CMS
  { name: 'Shopify', pattern: /\bshopify\b/i },
  { name: 'WordPress', pattern: /\bwordpress\b/i },
  { name: 'WooCommerce', pattern: /\bwoocommerce\b/i },
  { name: 'Webflow', pattern: /\bwebflow\b/i },
  { name: 'Magento', pattern: /\bmagento\b/i },
  { name: 'Wix', pattern: /\bwix\b/i },
  { name: 'Squarespace', pattern: /\bsquarespace\b/i },
  { name: 'BigCommerce', pattern: /\bbigcommerce\b/i },
  // Frontend
  { name: 'React', pattern: /\breact(?:\.js)?\b/i },
  { name: 'Next.js', pattern: /\bnext(?:\.js)?\b/i },
  { name: 'Vue.js', pattern: /\bvue(?:\.js)?\b/i },
  { name: 'Nuxt.js', pattern: /\bnuxt(?:\.js)?\b/i },
  { name: 'Angular', pattern: /\bangular\b/i },
  { name: 'Svelte', pattern: /\bsvelte\b/i },
  { name: 'Tailwind CSS', pattern: /\btailwind(?:css)?\b/i },
  { name: 'TypeScript', pattern: /\btypescript\b/i },
  { name: 'JavaScript', pattern: /\bjavascript\b/i },
  // Backend & Languages
  { name: 'Node.js', pattern: /\bnode(?:\.js)?\b/i },
  { name: 'Python', pattern: /\bpython\b/i },
  { name: 'Django', pattern: /\bdjango\b/i },
  { name: 'FastAPI', pattern: /\bfastapi\b/i },
  { name: 'PHP', pattern: /\bphp\b/i },
  { name: 'Laravel', pattern: /\blaravel\b/i },
  { name: 'Ruby on Rails', pattern: /\b(?:ruby on rails|rails)\b/i },
  { name: 'Go / Golang', pattern: /\b(?:golang|go language)\b/i },
  { name: 'Java / Spring', pattern: /\b(?:spring boot|java spring)\b/i },
  { name: '.NET / C#', pattern: /(?:^|[^\w])(?:c#|\.net|dotnet|csharp)(?:[^\w]|$)/i },
  { name: 'C / C++', pattern: /(?:^|[^\w])(?:c\+\+|cpp|\bc language\b)(?:[^\w]|$)/i },
  { name: 'Delphi', pattern: /\bdelphi\b/i },
  { name: 'Assembly / Rev Eng', pattern: /\b(?:assembly|assembler|reverse engineering|disassembly)\b/i },
  { name: 'Airtable', pattern: /\bairtable\b/i },
  { name: 'Salesforce', pattern: /\bsalesforce\b/i },
  { name: 'GraphQL', pattern: /\bgraphql\b/i },
  { name: 'REST API', pattern: /\b(?:rest api|restful)\b/i },
  // Mobile
  { name: 'React Native', pattern: /\breact native\b/i },
  { name: 'Flutter', pattern: /\bflutter\b/i },
  { name: 'iOS / Swift', pattern: /\b(?:swift|swiftui|ios app)\b/i },
  { name: 'Android / Kotlin', pattern: /\b(?:kotlin|android app)\b/i },
  // Database & Cloud
  { name: 'PostgreSQL', pattern: /\b(?:postgresql|postgres)\b/i },
  { name: 'MySQL', pattern: /\bmysql\b/i },
  { name: 'MongoDB', pattern: /\bmongodb\b/i },
  { name: 'Redis', pattern: /\bredis\b/i },
  { name: 'Supabase', pattern: /\bsupabase\b/i },
  { name: 'Firebase', pattern: /\bfirebase\b/i },
  { name: 'AWS', pattern: /\b(?:aws|amazon web services)\b/i },
  { name: 'Google Cloud', pattern: /\b(?:gcp|google cloud)\b/i },
  { name: 'Docker', pattern: /\bdocker\b/i },
  { name: 'Kubernetes', pattern: /\b(?:kubernetes|k8s)\b/i },
  // Design & Ops
  { name: 'Figma', pattern: /\bfigma\b/i },
  { name: 'HubSpot', pattern: /\bhubspot\b/i },
  { name: 'Klaviyo', pattern: /\bklaviyo\b/i },
  { name: 'Stripe', pattern: /\bstripe\b/i },
  { name: 'Zapier / Make', pattern: /\b(?:zapier|make\.com|integromat)\b/i }
]

const RED_FLAG_RULES: Array<{
  category: ReviewRedFlagCategory
  label: string
  pattern: RegExp
}> = [
  {
    category: 'unpaid',
    label: 'Payment Withheld / Unpaid',
    pattern:
      /\b(dispute|unpaid|did not pay|refused to pay|refused payment|ended without paying|no payment|milestone refund|withheld|held hostage|chargeback|arbitration|refused release)\b/i
  },
  {
    category: 'scope_creep',
    label: 'Scope Creep / Endless Revisions',
    pattern:
      /\b(scope creep|endless revisions|unreasonable demands|unrealistic expectation|kept adding|never satisfied|demanded extra work|unpaid work|without extra pay|moving goalposts)\b/i
  },
  {
    category: 'rude',
    label: 'Hostile / Disrespectful Behavior',
    pattern:
      /\b(rude|disrespectful|toxic|hostile|arrogant|unprofessional|insulting|verbally abusive|nightmare client|screamed|abusive)\b/i
  },
  {
    category: 'ghosting',
    label: 'Unresponsive / Ghosting',
    pattern:
      /\b(ghosted|unresponsive|stopped replying|disappeared for weeks|went silent|no response for months|abandoned the project)\b/i
  },
  {
    category: 'harsh_rating',
    label: 'Severe Review Warning',
    pattern:
      /\b(do not recommend|stay away|avoid this client|run away|terrible experience|worst client|disaster client|beware of this client)\b/i
  }
]

const PRAISE_RULES: Array<{ label: string; pattern: RegExp }> = [
  {
    label: '⚡ Fast Payer',
    pattern:
      /\b(fast pay|prompt pay|paid immediately|released milestone immediately|pays quickly|quick to pay|instant payment)\b/i
  },
  {
    label: '📋 Clear Requirements',
    pattern:
      /\b(clear instructions|clear specs|clear requirements|well defined|knows what they want|great brief|organized)\b/i
  },
  {
    label: '💬 Great Communicator',
    pattern:
      /\b(great communication|responsive|responsive client|easy to communicate|clear communication|quick response)\b/i
  },
  {
    label: '🔄 High Repeat Hire Potential',
    pattern:
      /\b(long-term|repeatedly|worked together for|multiple contracts|second time working|third time working|work together again|hire again)\b/i
  },
  {
    label: '🤝 Flexible & Respectful',
    pattern:
      /\b(reasonable deadlines|flexible|understanding client|patient|respectful|pleasure to work)\b/i
  }
]

const DOMAIN_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]{3,40}\.(?:com|io|co|org|net|app|ai|dev|store|agency|tech|co\.uk|de|uk|ca|me|cc))\b/gi

const EXCLUDED_COMPANY_WORDS = new Set([
  'upwork',
  'freelancer',
  'client',
  'looking',
  'project',
  'job',
  'please',
  'thanks',
  'great',
  'working',
  'highly',
  'developer',
  'designer',
  'experience',
  'contract',
  'position',
  'opportunity'
])

export function extractCompanyEntity(
  feedbacks: string[],
  description: string
): CompanyEntity | null {
  let foundDomain: string | null = null
  let foundName: string | null = null
  let foundInFeedback = false
  let foundInDescription = false

  // 1. Scan Description for Domains
  const descDomainMatches = description.matchAll(DOMAIN_REGEX)
  for (const m of descDomainMatches) {
    const raw = m[1]?.toLowerCase().trim()
    if (raw && !EXCLUDED_DOMAINS.has(raw)) {
      foundDomain = raw
      foundInDescription = true
      break
    }
  }

  // 2. Scan Feedbacks for Domains if not found
  if (!foundDomain) {
    for (const fb of feedbacks) {
      const fbDomainMatches = fb.matchAll(DOMAIN_REGEX)
      for (const m of fbDomainMatches) {
        const raw = m[1]?.toLowerCase().trim()
        if (raw && !EXCLUDED_DOMAINS.has(raw)) {
          foundDomain = raw
          foundInFeedback = true
          break
        }
      }
      if (foundDomain) break
    }
  }

  // 3. Scan Description for Company Patterns
  const descCompanyPatterns = [
    /(?:we are|at|welcome to)\s+([A-Z][A-Za-z0-9&'. -]{1,30}?\s+(?:LLC|Inc\b|Inc\.|Ltd\b|Ltd\.|GmbH|Corp\b|Corp\.))\b/i,
    /(?:we are|at|welcome to)\s+([A-Z][A-Za-z0-9&'. -]{2,30}?)(?=[,.;!\n]|\s+and|\s+we|\s+is|\s+looking)/i,
    /\b([A-Z][A-Za-z0-9&'. -]{1,30}?\s+(?:LLC|Inc\b|Inc\.|Ltd\b|Ltd\.|GmbH|Corp\b|Corp\.))\b/,
    /\b(?:our company|our agency|our brand|our store|our app|our platform)\s+(?:called|named|is)\s+([A-Z][A-Za-z0-9&'. -]{2,28})/i
  ]

  for (const pat of descCompanyPatterns) {
    const match = pat.exec(description)
    if (match?.[1]) {
      let candidate = match[1].trim().replace(/[.,;:]$/, '')
      candidate = candidate.replace(/^(?:we are|our company is|welcome to|at|the)\s+/i, '').trim()
      if (
        candidate.length >= 3 &&
        !EXCLUDED_COMPANY_WORDS.has(candidate.toLowerCase())
      ) {
        foundName = candidate
        foundInDescription = true
        break
      }
    }
  }

  // 4. Scan Feedbacks for Company Mentions
  const feedbackCompanyPatterns = [
    /working with\s+([A-Z][a-z]+)\s+and\s+(?:the\s+)?([A-Z][A-Za-z0-9&'. -]{1,30}\s+(?:team|crew|agency|group|company))\b/i,
    /working with\s+([A-Z][a-z]+)\s+and\s+(?:the\s+)?([A-Z][A-Za-z0-9&'. -]{2,25})/i,
    /working for\s+([A-Z][A-Za-z0-9&'. -]{1,30}\s+(?:team|group|company|LLC|Inc|Ltd))\b/i,
    /working for\s+([A-Z][A-Za-z0-9&'. -]{2,25})/i,
    /helped\s+([A-Z][A-Za-z0-9&'. -]{2,25})\s+(?:build|scale|launch|grow)/i,
    /part of the\s+([A-Z][A-Za-z0-9&'. -]{1,30}\s+team)/i
  ]

  for (const fb of feedbacks) {
    for (const pat of feedbackCompanyPatterns) {
      const match = pat.exec(fb)
      const candidate = (match?.[2] ?? match?.[1])?.trim().replace(/[.,;:]$/, '')
      if (
        candidate &&
        candidate.length >= 3 &&
        !EXCLUDED_COMPANY_WORDS.has(candidate.toLowerCase())
      ) {
        if (!foundName) {
          foundName = candidate
          foundInFeedback = true
        } else if (foundName.toLowerCase() === candidate.toLowerCase()) {
          foundInFeedback = true
        }
        break
      }
    }
  }

  if (!foundName && !foundDomain) {
    return null
  }

  let source: 'feedback' | 'description' | 'both' = 'description'
  if (foundInDescription && foundInFeedback) {
    source = 'both'
  } else if (foundInFeedback) {
    source = 'feedback'
  } else {
    source = 'description'
  }

  let confidence = 0.65
  if (foundName && foundDomain) confidence = 0.95
  else if (foundInDescription && foundInFeedback) confidence = 0.9
  else if (foundDomain) confidence = 0.85
  else if (foundName && /(?:LLC|Inc|Ltd|GmbH|Corp|Agency|Studio)/i.test(foundName)) {
    confidence = 0.85
  }

  return {
    name: foundName,
    domain: foundDomain,
    source,
    confidence
  }
}

export function extractReviewRedFlags(feedbacks: string[]): ReviewRedFlag[] {
  const flags: ReviewRedFlag[] = []
  const seenSnippets = new Set<string>()

  for (const fb of feedbacks) {
    const text = fb.trim()
    if (text.length < 15) continue

    // Check star rating if present in feedback string
    const ratingMatch =
      /★\s*([1-5](?:\.\d{1,2})?)|(?:rating\s*(?:is|:)?\s*)([1-5](?:\.\d{1,2})?)/i.exec(
        text
      )
    const ratingVal = ratingMatch
      ? parseFloat(ratingMatch[1] ?? ratingMatch[2])
      : null

    for (const rule of RED_FLAG_RULES) {
      if (rule.pattern.test(text)) {
        // Extract the most relevant sentence
        const sentences = text
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
        const relevantSentence =
          sentences.find((s) => rule.pattern.test(s)) ?? text.slice(0, 160)

        const snippet =
          relevantSentence.length > 180
            ? `${relevantSentence.slice(0, 177)}…`
            : relevantSentence

        if (!seenSnippets.has(snippet.toLowerCase())) {
          seenSnippets.add(snippet.toLowerCase())
          flags.push({
            category: rule.category,
            label: rule.label,
            snippet,
            rating: ratingVal
          })
        }
        break
      }
    }

    // Also check for numeric low rating <= 3.5 even without keyword matches
    if (ratingVal != null && ratingVal <= 3.5 && !seenSnippets.has(text.slice(0, 60).toLowerCase())) {
      seenSnippets.add(text.slice(0, 60).toLowerCase())
      flags.push({
        category: 'harsh_rating',
        label: `Low Rating (${ratingVal.toFixed(1)}★)`,
        snippet: text.length > 180 ? `${text.slice(0, 177)}…` : text,
        rating: ratingVal
      })
    }
  }

  return flags.slice(0, 5)
}

export function extractPraiseHighlights(feedbacks: string[]): string[] {
  const highlights = new Set<string>()

  for (const fb of feedbacks) {
    for (const rule of PRAISE_RULES) {
      if (rule.pattern.test(fb)) {
        highlights.add(rule.label)
      }
    }
    if (highlights.size >= 4) break
  }

  return Array.from(highlights)
}

export function extractTechStack(
  contractTitles: string[],
  description: string
): string[] {
  const combined = `${description}\n${contractTitles.join('\n')}`
  const detected = new Set<string>()

  for (const tech of TECH_CATALOG) {
    if (tech.pattern.test(combined)) {
      detected.add(tech.name)
    }
    if (detected.size >= 10) break
  }

  return Array.from(detected)
}

export function buildClientDossier(params: {
  feedbacks: string[]
  description: string
  contractTitles?: string[]
}): ClientDossier {
  const feedbacks = params.feedbacks || []
  const description = params.description || ''
  const contractTitles = params.contractTitles || []

  return {
    company: extractCompanyEntity(feedbacks, description),
    reviewRedFlags: extractReviewRedFlags(feedbacks),
    praiseHighlights: extractPraiseHighlights(feedbacks),
    techStack: extractTechStack(contractTitles, description),
    summary: null
  }
}
