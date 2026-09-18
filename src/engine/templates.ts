export type JobTag =
  | 'software'
  | 'backend'
  | 'sales'
  | 'data'
  | 'devops'
  | 'qa'
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
  ['software', ['c#', 'c++', 'c/c++', '.net', 'delphi', 'desktop', 'windows app', 'macos app', 'reverse engineer', 'assembly', 'x86', 'firmware', 'embedded', 'software engineer', 'software develop', 'program (', 'keyborad', 'keyboard']],
  ['backend', ['python', 'django', 'fastapi', 'flask', 'node', 'express', 'nest.js', 'golang', 'rust', 'java', 'spring', 'backend', 'rest api', 'graphql', 'sql', 'postgresql', 'mysql', 'database']],
  ['sales', ['telemarket', 'cold call', 'lead gen', 'lead generation', 'b2b', 'sales rep', 'appointment sett', 'outbound', 'closing', 'cold outreach']],
  ['data', ['airtable', 'data analys', 'data engineer', 'etl', 'pandas', 'bigquery', 'snowflake', 'tableau', 'power bi', 'excel', 'spreadsheet']],
  ['devops', ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'terraform', 'devops', 'linux server']],
  ['qa', ['qa', 'test automation', 'selenium', 'playwright', 'cypress', 'software test', 'quality assurance']],
  ['scraper', ['scrap', 'crawl', 'spider', 'bot', 'automation', 'parse']],
  ['ai', [' ai ', 'chatgpt', 'llm', 'gpt', 'machine learning', 'openai', 'anthropic', 'chatbot', 'vector db', 'rag', 'langchain']],
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
  software: {
    relevance: [
      'I build robust software solutions with strict attention to binary stability, native OS APIs, and performance.',
      'My engineering background covers low-level programming, reverse engineering, and clean desktop architecture.'
    ],
    ask: [
      'Are there specific OS versions or target architecture constraints to account for?',
      'Do you have existing source repositories or binary specifications ready to review?'
    ]
  },
  backend: {
    relevance: [
      'I build scalable backend systems with clean API design, optimized query plans, and robust error handling.',
      'My backend experience covers production microservices, data persistence, and zero-downtime deployments.'
    ],
    ask: [
      'What database engine and hosting infrastructure are you deploying to?',
      'Are there existing API documentation or contracts we should align with?'
    ]
  },
  sales: {
    relevance: [
      'I specialize in outbound B2B outreach, pipeline generation, and targeted conversation cadences that book calls.',
      'My sales background focuses on qualification, value-based objection handling, and clean CRM tracking.'
    ],
    ask: [
      'What ICP criteria and decision-maker titles are we targeting?',
      'Do you have existing lists and email/phone tooling configured?'
    ]
  },
  data: {
    relevance: [
      'I design automated data pipelines, schema modeling, and integration workflows that stay reliable.',
      'My data systems experience covers ETL workflows, multi-platform syncs, and executive reporting dashboards.'
    ],
    ask: [
      'What are the primary sources and target destinations for this data?',
      'What cadence or latency threshold does the sync require?'
    ]
  },
  devops: {
    relevance: [
      'I manage containerized infrastructure and automated CI/CD pipelines with high availability and security built in.',
      'My cloud architecture work focuses on infrastructure as code, observability, and cost-effective scaling.'
    ],
    ask: [
      'Which cloud provider and orchestration platform are you standardizing on?',
      'Are there compliance or disaster-recovery requirements to factor into the design?'
    ]
  },
  qa: {
    relevance: [
      'I build automated end-to-end and integration test suites that give teams confidence before every release.',
      'My testing workflow catches subtle regression edge cases without slowing down your deploy pipeline.'
    ],
    ask: [
      'What testing frameworks and test runners do you currently use?',
      'Which user flows represent the highest business risk if broken?'
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
  const tag = tags[0] ?? resolveFallbackTag(input.title)
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

function resolveFallbackTag(title: string): JobTag {
  const lower = title.toLowerCase()
  if (/\b(?:software|program|engineer|c#|c\+\+|reverse|desktop)\b/i.test(lower)) return 'software'
  if (/\b(?:data|airtable|spreadsheet|analytics|sql)\b/i.test(lower)) return 'data'
  if (/\b(?:telemarket|cold call|lead gen|sales|b2b)\b/i.test(lower)) return 'sales'
  if (/\b(?:backend|api|server|python|database)\b/i.test(lower)) return 'backend'
  if (/\b(?:design|ui|ux|figma|logo)\b/i.test(lower)) return 'design'
  if (/\b(?:video|edit|motion)\b/i.test(lower)) return 'video'
  if (/\b(?:writ|content|blog|copy)\b/i.test(lower)) return 'writing'
  return 'web'
}

export const SKILL_LABELS: Record<JobTag, string> = {
  software: "software engineering",
  backend: "backend development",
  sales: "B2B lead generation & outreach",
  data: "data systems & workflows",
  devops: "DevOps & cloud infrastructure",
  qa: "QA & test automation",
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
  software: "handling low-level platform constraints and binary stability",
  backend: "ensuring query performance and scalable API architecture",
  sales: "consistently bypassing gatekeepers to reach actual decision-makers",
  data: "maintaining clean automated schema mapping without manual sync gaps",
  devops: "balancing zero-downtime reliability with cloud cost control",
  qa: "preventing flaky automated runs and catching critical edge cases before release",
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

export interface TargetedFocus {
  subject: string
  challenge: string
  solutionType: string
}

export function cleanProjectRef(title: string): string {
  if (!title) return ''
  const stripped = title
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^(?:looking for|need(?:ed)?|seeking|urgent:?|hiring)\s+(?:an?\s+)?/i, '')
    .trim()

  const forMatch = /\b(?:for|on)\s+([A-Za-z0-9][A-Za-z0-9\s-]{2,28})/i.exec(stripped)
  if (forMatch && forMatch[1].trim().split(/\s+/).length <= 4) {
    return forMatch[1].trim()
  }
  const words = stripped.split(/\s+/)
  if (words.length <= 4) return words.join(' ')
  return `${words.slice(0, 4).join(' ')}…`
}

export function detectTargetDiscipline(
  title: string,
  description: string,
  techStack?: string[]
): TargetedFocus {
  const combined = `${title} ${description} ${(techStack ?? []).join(' ')}`.toLowerCase()

  // 1. Reverse Engineering & Software Licensing / Anti-Tamper
  if (
    /\b(?:reverse\s*eng|rev\s*eng|disassembl|decompile|x64dbg|ida\s*pro|ghidra|anti-tamper|copy\s*protect|protection|license\s*system|licensing|binary\b)/i.test(
      combined
    )
  ) {
    return {
      subject: 'reverse engineering & binary protection',
      challenge:
        'handling low-level binary structures and ensuring license validation integrity without performance overhead',
      solutionType: 'binary protection and reverse engineering solutions'
    }
  }

  // 2. Audio Software / Instrument & MIDI / DSP
  if (
    /\b(?:korg|synthesizer|keyboard\s*instrument|midi|vst|vst3|audio\s*dsp|daw|sample\s*rate|audio\s*processing)\b/i.test(
      combined
    )
  ) {
    return {
      subject: 'audio instrument software & hardware integration',
      challenge: 'managing real-time audio latency and proprietary instrument firmware protocols',
      solutionType: 'audio software and instrument interface solutions'
    }
  }

  // 3. Web Scraping / Data Extraction
  if (
    /\b(?:scrap|crawl|extract|spider|puppeteer|playwright|selenium|beautifulsoup)\b/i.test(
      combined
    )
  ) {
    return {
      subject: 'web scraping & structured data pipelines',
      challenge: 'bypassing anti-bot defenses and keeping parsers resilient to DOM changes',
      solutionType: 'automated web scraping and data pipelines'
    }
  }

  // 4. B2B Telemarketing / Cold Outreach / Sales
  if (
    /\b(?:cold\s*call\w*|telemarket\w*|appointment\s*set\w*|lead\s*gen\w*|prospect\w*|b2b\s*sales)\b/i.test(
      combined
    )
  ) {
    return {
      subject: 'B2B outbound prospecting & appointment setting',
      challenge: 'consistently cutting through gatekeepers to secure qualified meetings with genuine decision-makers',
      solutionType: 'outbound B2B calling and pipeline-building campaigns'
    }
  }

  // 5. Airtable / Database Automation
  if (
    /\b(?:airtable|notion|zapier|make\.com|database\s*schema|spreadsheet)\b/i.test(
      combined
    )
  ) {
    return {
      subject: 'Airtable database architecture & automated workflows',
      challenge: 'maintaining clean automated schema mapping without manual sync gaps or formula bottlenecks',
      solutionType: 'custom Airtable and data automation workflows'
    }
  }

  // 6. C# / .NET Software Engineering
  if (
    /(?:^|[^\w])(?:c#|\.net|dotnet|csharp|wpf|winforms|avalonia)(?:[^\w]|$)/i.test(
      combined
    )
  ) {
    return {
      subject: 'C# / .NET software engineering',
      challenge: 'handling low-level platform constraints, native interop, and thread safety',
      solutionType: 'high-performance .NET desktop and enterprise applications'
    }
  }

  // 7. C / C++ Systems Programming
  if (/(?:^|[^\w])(?:c\+\+|cpp)(?:[^\w]|$)/i.test(combined)) {
    return {
      subject: 'C/C++ systems engineering',
      challenge: 'strict memory management, cross-compilation stability, and execution speed',
      solutionType: 'native C/C++ implementations'
    }
  }

  // 8. Delphi Engineering
  if (/\bdelphi\b/i.test(combined)) {
    return {
      subject: 'Delphi software engineering',
      challenge: 'navigating legacy VCL components and maintaining native binary compatibility',
      solutionType: 'native Delphi desktop applications'
    }
  }

  // 9. Shopify / E-Commerce
  if (/\b(?:shopify|liquid|storefront|recharge)\b/i.test(combined)) {
    return {
      subject: 'Shopify Liquid & theme development',
      challenge: 'balancing custom theme sections with page speed and frictionless mobile checkout',
      solutionType: 'high-converting Shopify stores'
    }
  }

  // 10. WordPress / WooCommerce
  if (/\b(?:wordpress|woocommerce|elementor|wp\s*theme)\b/i.test(combined)) {
    return {
      subject: 'WordPress & WooCommerce engineering',
      challenge: 'keeping customizations update-safe and secure without bloating server response times',
      solutionType: 'custom WordPress and WooCommerce builds'
    }
  }

  // 11. Mobile Apps
  if (/\b(?:react\s*native|flutter|ios|android|mobile\s*app|swift|kotlin)\b/i.test(combined)) {
    return {
      subject: 'cross-platform mobile app development',
      challenge: 'maintaining 60fps UI performance and bulletproof offline data synchronization',
      solutionType: 'production mobile applications'
    }
  }

  // 12. AI / LLMs
  if (/\b(?:ai|llm|gpt|claude|openai|rag|langchain|fine-tun)\b/i.test(combined)) {
    return {
      subject: 'production AI & LLM integration',
      challenge: 'grounding model responses with reliable guardrails and deterministic cost controls',
      solutionType: 'production AI solutions with zero hallucination drift'
    }
  }

  // 13. QA / Automation
  if (/\b(?:qa|test\s*automation|cypress|playwright|selenium)\b/i.test(combined)) {
    return {
      subject: 'automated QA & end-to-end testing',
      challenge: 'eliminating flaky test runs and catching critical edge cases before production releases',
      solutionType: 'robust automated test suites'
    }
  }

  // 14. DevOps & Cloud
  if (/\b(?:devops|docker|kubernetes|aws|ci\/cd|terraform)\b/i.test(combined)) {
    return {
      subject: 'DevOps & cloud deployment infrastructure',
      challenge: 'ensuring zero-downtime releases while keeping infrastructure overhead tight',
      solutionType: 'automated CI/CD pipelines and scalable infrastructure'
    }
  }

  // 15. Design
  if (/\b(?:design|ui|ux|figma|branding|wireframe)\b/i.test(combined)) {
    return {
      subject: 'UI/UX & design systems',
      challenge: 'translating brand intent into intuitive layouts that actually convert',
      solutionType: 'conversion-focused design systems'
    }
  }

  // 16. Video
  if (/\b(?:video|premiere|after\s*effects|reels|tiktok|editing)\b/i.test(combined)) {
    return {
      subject: 'video editing & short-form content',
      challenge: 'holding viewer retention past the first five seconds on every cut',
      solutionType: 'high-retention video deliverables'
    }
  }

  // 17. Writing
  if (/\b(?:writ|content|copy|seo\s*article|blog)\b/i.test(combined)) {
    return {
      subject: 'content strategy & copywriting',
      challenge: 'sounding human, authoritative, and specific instead of SEO-flavored filler',
      solutionType: 'high-converting editorial content'
    }
  }

  // Fallback to tags
  const tags = detectTags(title, description)
  const tag = tags[0] ?? resolveFallbackTag(title)
  return {
    subject: SKILL_LABELS[tag],
    challenge: CHALLENGES[tag],
    solutionType: `${SKILL_LABELS[tag]} solutions`
  }
}

export function generateHookVariants(input: {
  jobId: string
  title: string
  description?: string
  clientName?: string | null
  techStack?: string[]
}): HookVariant[] {
  const description = input.description ?? ''
  const focus = detectTargetDiscipline(input.title, description, input.techStack)
  const name = input.clientName?.trim() ? input.clientName.trim() : 'there'
  const projRef = cleanProjectRef(input.title)
  const projClause = projRef
    ? (projRef.toLowerCase().endsWith('project') ? ` for your ${projRef}` : ` for your ${projRef} project`)
    : ''

  let stackMention = ''
  if (input.techStack && input.techStack.length > 0) {
    const top = input.techStack.slice(0, 3).join(', ')
    stackMention = ` I work directly with ${top} and have delivered comparable implementations.`
  } else {
    stackMention = ` I specialize in this exact scope and have shipped comparable implementations with verified feedback.`
  }

  return [
    {
      label: 'A',
      style: 'Direct & Personalized',
      text:
        `Hi ${name}, saw you are looking for help with ${focus.subject}${projClause}. ` +
        `Having delivered similar ${focus.solutionType} recently, I can start right away and provide daily progress updates. ` +
        `What does your target timeline look like for this?`
    },
    {
      label: 'B',
      style: 'Problem-First',
      text:
        `Hi ${name}, the main challenge with ${focus.subject} projects like this is usually ${focus.challenge}. ` +
        `Here is how I would approach it: audit what exists, fix the highest-risk piece first, then iterate with you weekly. ` +
        `Does that match how you are thinking about it?`
    },
    {
      label: 'C',
      style: 'Quick Credibility',
      text:
        `Hi ${name}, just reviewed your requirements${projClause}.${stackMention} ` +
        `Would a brief message chat or call tomorrow work to align on scope?`
    }
  ]
}
