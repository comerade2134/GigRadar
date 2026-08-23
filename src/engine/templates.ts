export type JobTag =
  | 'scraper'
  | 'wordpress'
  | 'shopify'
  | 'mobile'
  | 'design'
  | 'video'
  | 'writing'
  | 'ai'
  | 'web'

const TAG_KEYWORDS: ReadonlyArray<readonly [JobTag, string[]]> = [
  ['scraper', ['scrap', 'crawl', 'spider', 'bot', 'automation', 'parse']],
  ['ai', [' ai ', 'chatgpt', 'llm', 'gpt', 'machine learning', 'openai', 'anthropic', 'chatbot']],
  ['wordpress', ['wordpress', 'woocommerce', 'wp-']],
  ['shopify', ['shopify', 'ecommerce', 'e-commerce', 'dropship', 'amazon']],
  ['mobile', ['ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'mobile app']],
  ['design', ['logo', 'figma', 'ui/ux', 'ux design', 'graphic design', 'illustrat']],
  ['video', ['video edit', 'after effects', 'premiere', 'animation', 'motion graphics']],
  ['writing', ['copywrit', 'blog post', 'article', 'content writ', 'ghostwrit', 'translat']]
]

interface TemplateBankEntry {
  relevance: string[]
  ask: string[]
}

const BANK: Record<JobTag, TemplateBankEntry> = {
  scraper: {
    relevance: [
      "I've shipped scrapers handling {n}+ pages/day with proxy rotation and rate-limit backoff, so this stays reliable at scale.",
      'I build extraction pipelines with structured output (JSON/CSV) and change-detection alerts when a site layout shifts.'
    ],
    ask: [
      'Which sites and fields are the must-haves for v1?',
      'Do you need this to run on a schedule or on-demand?'
    ]
  },
  wordpress: {
    relevance: [
      "I've launched dozens of WordPress/WooCommerce builds — custom themes, plugin conflicts resolved, Core Web Vitals in the green.",
      'My WordPress work covers custom blocks, ACF-driven layouts and speed tuning without breaking your editor workflow.'
    ],
    ask: [
      'Is this a fresh build or an existing site that needs surgery?',
      'Any must-have plugins I should plan around?'
    ]
  },
  shopify: {
    relevance: [
      'I work in Shopify Liquid daily — custom sections, metafield-driven catalogs and checkout-extensible apps.',
      'I have shipped Shopify stores with custom theme work, subscription flows and third-party API integrations.'
    ],
    ask: [
      'Are you on standard Shopify or Plus?',
      'What is the single biggest conversion blocker you see right now?'
    ]
  },
  mobile: {
    relevance: [
      "I ship cross-platform apps (React Native/Flutter) with native-feel performance and store-submission experience on both iOS and Android.",
      'My mobile background covers offline-first sync, push notifications and App Store review navigation.'
    ],
    ask: [
      'iOS-first, Android-first, or true cross-platform from day one?',
      'Do you have designs ready, or is discovery part of this project?'
    ]
  },
  design: {
    relevance: [
      'I design in Figma with full component libraries and dev-ready handoff files, not just static mockups.',
      'My design work pairs brand systems with conversion-focused layouts — every screen justified by its job.'
    ],
    ask: [
      'Do you have existing brand guidelines I should respect?',
      'How many initial concepts do you want to compare?'
    ]
  },
  video: {
    relevance: [
      'I cut in Premiere/AE with motion-graphics packages that keep retention high on short-form platforms.',
      'My editing workflow includes captions, sound design and platform-native aspect exports.'
    ],
    ask: [
      'What is the target platform — YouTube, TikTok/Reels, or both?',
      'Roughly how much raw footage per deliverable?'
    ]
  },
  writing: {
    relevance: [
      'I write SEO-aware long-form with original research and zero filler — samples available on request.',
      'My copy converts because it starts from your customer objections, not generic benefit lists.'
    ],
    ask: [
      'Do you have a style guide or reference pieces you love?',
      'What does a win look like for this content — traffic, conversions, authority?'
    ]
  },
  ai: {
    relevance: [
      'I integrate LLMs into production workflows — prompt versioning, evals, cost caps and fallbacks included.',
      'My AI builds cover RAG pipelines, function calling and guardrails so outputs stay usable, not demo-grade.'
    ],
    ask: [
      'Is latency or output quality the harder constraint here?',
      'Do you already have data sources picked out for grounding?'
    ]
  },
  web: {
    relevance: [
      'I build fast, maintainable web apps — typed end-to-end, tested where it matters, deploy-ready CI included.',
      'My web stack covers modern frontends with clean APIs behind them, plus analytics wired in from day one.'
    ],
    ask: [
      'What tech stack are you currently on, if any?',
      'What is the first milestone you would judge this project by?'
    ]
  }
}

export function detectTags(title: string, description: string): JobTag[] {
  const haystack = ` ${title.toLowerCase()} ${description.toLowerCase()} `
  const tags: JobTag[] = []
  for (const [tag, keywords] of TAG_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) tags.push(tag)
  }
  return tags
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function shortenTitle(title: string): string {
  const words = title.trim().split(/\s+/)
  if (words.length <= 7) return title.trim()
  return `${words.slice(0, 7).join(' ')}…`
}

export interface HookInput {
  jobId: string
  title: string
  description?: string
  clientName?: string | null
}

export function generateHook(input: HookInput): string {
  const description = input.description ?? ''
  const tags = detectTags(input.title, description)
  const tag = tags[0] ?? 'web'
  const bank = BANK[tag]

  const hash = fnv1a(input.jobId || input.title)
  const relevance =
    bank.relevance[hash % bank.relevance.length].replace(
      '{title}',
      shortenTitle(input.title)
    )
  const ask =
    bank.ask[Math.floor(hash / 7) % bank.ask.length]

  const greeting = input.clientName ? `Hi ${input.clientName},` : 'Hi there,'

  return `${greeting} ${relevance} ${ask}`
}

export const SKILL_LABELS: Record<JobTag, string> = {
  scraper: "web scraping",
  ai: "AI automation",
  wordpress: "WordPress development",
  shopify: "Shopify development",
  mobile: "mobile app development",
  design: "design work",
  video: "video editing",
  writing: "content writing",
  web: "web development"
}

const CHALLENGES: Record<JobTag, string> = {
  scraper: "keeping the extraction stable after sites change their layout",
  ai: "grounding model outputs in your real data instead of generic answers",
  wordpress: "keeping customizations update-safe without breaking your editor",
  shopify: "balancing custom sections with page speed and checkout stability",
  mobile: "state sync across screens without draining battery or offline gaps",
  design: "translating brand intent into layouts that actually convert",
  video: "holding retention past the first five seconds on every cut",
  writing: "sounding human and specific instead of SEO-flavored filler",
  web: "scope creep hiding inside small-sounding frontend changes"
}

export interface HookVariant {
  label: "A" | "B" | "C"
  style: string
  text: string
}

export function generateHookVariants(input: {
  jobId: string
  title: string
  description?: string
  clientName?: string | null
}): HookVariant[] {
  const tags = detectTags(input.title, input.description ?? "")
  const tag = tags[0] ?? "web"
  const skill = SKILL_LABELS[tag]
  const challenge = CHALLENGES[tag]
  const name = input.clientName?.trim() ? input.clientName.trim() : "there"

  return [
    {
      label: "A",
      style: "Direct & Personalized",
      text:
        `Hi ${name}, saw you are looking for help with ${skill}. ` +
        `Having delivered similar solutions recently, I can start right away and keep you updated at every step. ` +
        `What does success look like for this project in the first two weeks?`
    },
    {
      label: "B",
      style: "Problem-First",
      text:
        `Hi ${name}, the main challenge with ${skill} projects like this is usually ${challenge}. ` +
        `Here is how I would approach it: audit what exists, fix the highest-risk piece first, then iterate with you weekly. ` +
        `Does that match how you are thinking about it?`
    },
    {
      label: "C",
      style: "Quick Credibility",
      text:
        `Hi ${name}, just reviewed your requirements for ${skill}. ` +
        `I recently completed a project with the exact same stack and can share results on request. ` +
        `Would a quick call tomorrow work to align on scope?`
    }
  ]
}
