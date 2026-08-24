import { SELECTORS, queryAll, queryFirst } from '../config/selectors'
import { extensionContextValid } from '../context'
import { normalizeJobId } from './parse'
import {
  detectTags,
  generateHookVariants,
  SKILL_LABELS,
  type HookVariant
} from '../engine/templates'

const INTEL_CACHE_PREFIX = 'gigradar:intel:'
const INTEL_TTL_MS = 7 * 86_400_000
const TOOLBAR_ID = 'gigradar-autofill-toolbar'

interface IntelCacheEntry {
  title: string
  url?: string
  description?: string
  clientName?: string | null
  savedAt: number
}

function extractJobIdFromUrl(): string {
  try {
    const tilde = /~([0-9a-z]{8,})/i.exec(window.location.pathname)
    if (tilde) return normalizeJobId(tilde[1])
    return normalizeJobId(
      window.location.pathname.split('/').filter(Boolean).pop() ?? ''
    )
  } catch {
    return ''
  }
}

async function loadIntelCache(jobId: string): Promise<IntelCacheEntry | null> {
  if (!jobId || !extensionContextValid()) return null
  try {
    const key = `${INTEL_CACHE_PREFIX}${jobId}`
    const result = await chrome.storage.local.get(key)
    const entry = result[key] as IntelCacheEntry | undefined
    if (!entry || typeof entry.title !== 'string' || entry.title.length === 0) return null
    if (Date.now() - (entry.savedAt ?? 0) > INTEL_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

function scrapeProposalContext(): { title: string; description: string } {
  const heading =
    document.querySelector('h1') ??
    document.querySelector('[data-test="job-title"]') ??
    document.querySelector('h2')
  const descriptionEl =
    document.querySelector<HTMLElement>('[data-test="job-description"]') ??
    document.querySelector<HTMLElement>('[class*="job-description"]')
  return {
    title: heading?.textContent?.trim().slice(0, 200) || 'Upwork job',
    description: (descriptionEl?.textContent ?? '').trim().slice(0, 1200)
  }
}

function setNativeValue(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function draftScreeningAnswer(
  question: string,
  jobTitle: string,
  jobDescription: string
): string {
  const cleanQuestion = question.trim().replace(/\s+/g, ' ')
  const topic =
    cleanQuestion.length > 90 ? `${cleanQuestion.slice(0, 89)}…` : cleanQuestion
  const tags = detectTags(jobTitle, `${jobTitle} ${jobDescription} ${cleanQuestion}`)
  const skill = SKILL_LABELS[tags[0] ?? 'web']
  return (
    `Regarding "${topic}" — I've worked extensively on ${skill}, and this maps directly to how I would approach your project. ` +
    `I can walk you through relevant specifics on a quick call, start immediately, and keep you updated daily.`
  )
}

const TOOLBAR_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .bar {
    display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
    margin: 8px 0;
    padding: 9px 12px;
    border-radius: 12px;
    background: #0D0F12;
    border: 1px solid rgba(16,185,129,.35);
    box-shadow: 0 4px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
    font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    width: max-content; max-width: 100%;
  }
  .brand {
    font-weight: 800; font-size: 10.5px; letter-spacing: .04em;
    background: linear-gradient(90deg, #34D399, #10B981);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    margin-right: 2px;
  }
  button {
    font-family: inherit;
    border-radius: 9px; cursor: pointer;
    transition: all .14s ease;
  }
  .fill {
    padding: 8px 15px;
    border: none;
    background: linear-gradient(180deg, #34D399, #059669);
    color: #0D0F12;
    font-size: 12px; font-weight: 800;
    box-shadow: 0 3px 12px rgba(16,185,129,.28), inset 0 1px 0 rgba(255,255,255,.2);
  }
  .fill:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .fill:active { transform: scale(.97); }
  .variant {
    padding: 6px 11px;
    border: 1px solid #262C37;
    background: #161A22;
    color: #E5E7EB;
    font-size: 11px; font-weight: 700;
  }
  .variant:hover { background: #1D222C; border-color: #3A4250; }
  .status { font-size: 11px; font-weight: 700; color: #6EE7B7; }
`

const QUESTION_BTN_STYLES = [
  'display:inline-flex;align-items:center;gap:5px',
  'margin:4px 0 6px;padding:5px 11px',
  'border-radius:999px;border:1px solid rgba(16,185,129,.45)',
  'background:rgba(16,185,129,.09);color:#34D399',
  'font-family:Inter,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  'font-size:11px;font-weight:800;cursor:pointer',
  'transition:all .14s ease'
].join(';')

let hookCache: HookVariant[] = []

async function resolveHooks(): Promise<{
  hooks: HookVariant[]
  context: { title: string; description: string }
}> {
  const jobId = extractJobIdFromUrl()
  const cached = await loadIntelCache(jobId)
  const fallback = scrapeProposalContext()
  const context = cached
    ? {
        title: cached.title,
        description: cached.description || fallback.description
      }
    : fallback
  const clientName = cached?.clientName ?? null
  return {
    hooks: generateHookVariants({
      jobId: jobId || context.title,
      title: context.title,
      description: context.description,
      clientName
    }),
    context
  }
}

function findCoverLetter(): HTMLTextAreaElement | null {
  const el = queryFirst(document.body, SELECTORS.coverLetter)
  if (el instanceof HTMLTextAreaElement) return el
  return document.querySelector<HTMLTextAreaElement>(
    'form textarea:not([id*="question" i])'
  )
}

function fillCoverLetter(hook: HookVariant, statusEl: HTMLElement | null): void {
  const textarea = findCoverLetter()
  if (!textarea) {
    if (statusEl) statusEl.textContent = 'Cover letter field not found'
    return
  }
  setNativeValue(textarea, hook.text)
  textarea.focus()
  if (statusEl) {
    statusEl.textContent = `Option ${hook.label} filled ✓`
    window.setTimeout(() => {
      statusEl.textContent = ''
    }, 2200)
  }
}

function mountToolbar(textarea: HTMLTextAreaElement): void {
  if (document.getElementById(TOOLBAR_ID)) return

  const host = document.createElement('div')
  host.id = TOOLBAR_ID
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = TOOLBAR_STYLES

  const bar = document.createElement('div')
  bar.className = 'bar'

  const brand = document.createElement('span')
  brand.className = 'brand'
  brand.textContent = 'GigRadar'

  const fillBtn = document.createElement('button')
  fillBtn.type = 'button'
  fillBtn.className = 'fill'
  fillBtn.textContent = '⚡ Quick-Fill Proposal'

  const statusEl = document.createElement('span')
  statusEl.className = 'status'

  bar.append(brand, fillBtn)

  fillBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (hookCache.length === 0) {
      const context = scrapeProposalContext()
      hookCache = generateHookVariants({
        jobId: extractJobIdFromUrl() || context.title,
        title: context.title,
        description: context.description,
        clientName: null
      })
    }
    fillCoverLetter(hookCache[0], statusEl)
  })

  void (async () => {
    const { hooks } = await resolveHooks()
    hookCache = hooks
    for (const hook of hooks) {
      const variantBtn = document.createElement('button')
      variantBtn.type = 'button'
      variantBtn.className = 'variant'
      variantBtn.textContent = `${hook.label}`
      variantBtn.title = `${hook.style} — ${hook.text.slice(0, 80)}…`
      variantBtn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        fillCoverLetter(hook, statusEl)
      })
      bar.appendChild(variantBtn)
    }
  })()

  bar.appendChild(statusEl)
  shadow.append(style, bar)

  const anchorBlock =
    textarea.closest('[data-test="cover-letter-section"]') ??
    textarea.closest('form') ??
    textarea.parentElement
  anchorBlock?.insertAdjacentElement('beforebegin', host)
}

function decorateScreeningQuestions(): void {
  const containers = queryAll(document.body, SELECTORS.screeningQuestion)
  const { title, description } = scrapeProposalContext()

  for (const container of containers) {
    if (container.querySelector('[data-gigradar-answer-btn]')) continue
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) continue

    const labelNode =
      container.querySelector<HTMLElement>('label, h3, h4, [data-test="question-label"]') ??
      container.firstElementChild as HTMLElement | null
    const questionText =
      labelNode?.textContent?.trim() ||
      container.textContent?.trim().slice(0, 160) ||
      'this question'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.gigradarAnswerBtn = ''
    btn.setAttribute('style', QUESTION_BTN_STYLES)
    btn.textContent = '✨ Auto-Draft Answer'
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      setNativeValue(textarea, draftScreeningAnswer(questionText, title, description))
      btn.textContent = '✓ Drafted'
      window.setTimeout(() => {
        btn.textContent = '✨ Auto-Draft Answer'
      }, 1800)
    })

    if (labelNode && labelNode.parentElement === container) {
      labelNode.insertAdjacentElement('afterend', btn)
    } else {
      textarea.insertAdjacentElement('beforebegin', btn)
    }
  }
}

function isProposalPage(): boolean {
  return /\/(nx|ab)\/proposals\/job\//.test(window.location.pathname)
}

function scan(): void {
  if (!extensionContextValid()) {
    observer.disconnect()
    return
  }
  if (!isProposalPage()) return
  const textarea = findCoverLetter()
  if (textarea && isVisible(textarea)) mountToolbar(textarea)
  decorateScreeningQuestions()
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function debounce(fn: () => void, waitMs: number): () => void {
  let timer: number | undefined
  return () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(fn, waitMs)
  }
}

const scheduledScan = debounce(scan, 400)
const observer = new MutationObserver(scheduledScan)

function start(): void {
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
  let lastUrl = window.location.href
  window.setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      document.getElementById(TOOLBAR_ID)?.remove()
      scheduledScan()
    }
  }, 800)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true })
} else {
  start()
}
