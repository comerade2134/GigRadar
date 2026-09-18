export type SelectorChain = readonly string[]

const chain = (...selectors: string[]): SelectorChain => selectors

export const SELECTORS = {
  jobCard: chain(
    'article.job-tile-responsive',
    'article.job-tile',
    '[data-test="job-tile"]',
    '[data-test="JobTile"]',
    '[data-qa="job-tile"]',
    'section.job-tile-responsive',
    'div[data-test="job-tile-list"] > article',
    'div[data-test="job-tile-list"] > section',
    'div[data-test="job-tile-list"] > div',
    '[data-test="job-tile-list"] > article',
    '[data-test="job-tile-list"] > section',
    '[data-test="job-tile-list"] > div',
    '[data-ev-label="search_result_item"]'
  ),
  titleLink: chain(
    '[data-test="job-tile-title-link"]',
    '[data-test="JobTileTitle"]',
    '[data-qa="job-title-link"]',
    'h2 a[href*="/jobs/"]',
    'h3 a[href*="/jobs/"]',
    'h4 a[href*="/jobs/"]',
    '.job-tile-title a',
    'a.up-n-link[href*="/jobs/"]:not([title*="window" i])',
    'a[href*="/jobs/~"]:not([title*="window" i]):not([aria-label*="window" i])'
  ),
  jobDescription: chain(
    '[data-test="job-description-text"]',
    '[data-test="job-description"] p',
    '[data-test="job-description"]',
    '[data-qa="job-description"]',
    '.job-tile-description',
    '[class*="job-description"]'
  ),
  paymentVerified: chain(
    '[data-test="payment-verification-status"]',
    '[data-test="payment-verified"]',
    '[data-qa="payment-status"]',
    '[aria-label*="Payment verified" i]',
    '[title*="Payment verified" i]',
    '[class*="payment-verified"]'
  ),
  totalSpend: chain(
    '[data-qa="client-spend"]',
    '[data-test="total-spent"]',
    '[data-test="total-spend"]',
    '[data-test="client-spend"]',
    '[data-qa="total-spent"]',
    '[class*="client-spend"]',
    '[class*="total-spent"]'
  ),
  hireRate: chain(
    '[data-test="hire-rate"]',
    '[data-test="client-hire-rate"]',
    '[data-qa="hire-rate"]',
    '[class*="hire-rate"]'
  ),
  proposals: chain(
    '[data-test="proposals-count"]',
    '[data-test="number-of-proposals"]',
    'span[data-test="proposal-count"]',
    '[data-qa="proposals-tier"]',
    '[class*="proposals"]',
    '.job-details-proposals'
  ),
  postedTime: chain(
    '[data-test="posted-on"]',
    '[data-test="publish-date"]',
    '[data-qa="posted-on"]',
    'time[datetime]',
    '.jo-chup-time'
  ),
  clientStats: chain(
    '[data-test="client-stats"]',
    '[data-qa="client-stats"]',
    'ul.client-stats',
    '[class*="client-stats"]'
  ),
  feedbackItem: chain(
    '[data-qa="client-job-history"] .air3-review-item',
    '[data-qa="client-job-history"] [class*="review"]',
    '[data-test="feedback-comment"]',
    '.air3-review-item',
    'li.feedback span',
    '[class*="review-text"]',
    '[class*="feedback"] p'
  ),
  jobDrawer: chain(
    '[data-test="job-details-modal"]',
    '[data-qa="job-details-modal"]',
    '[data-qa="job-details-slider"]',
    'aside[aria-label*="Job details" i]',
    '[role="dialog"]:has(a[href*="/jobs/"])',
    '.air3-slider',
    '[class*="slider-panel"]'
  ),
  cardTitleLink: chain('h2 a', 'h3 a', 'a.up-n-link', 'a[href*="/jobs/"]'),
  coverLetter: chain(
    '#cover-letter',
    '[data-test="cover-letter"]',
    '[data-qa="cover-letter"]',
    'textarea[name="coverLetter"]',
    'textarea[id*="cover-letter" i]'
  ),
  screeningQuestion: chain(
    '[data-test="screening-question"]',
    '[data-qa="screening-question"]',
    '[class*="screening-question"]'
  )
} satisfies Record<string, SelectorChain>

export function queryFirst(
  root: ParentNode,
  selectors: SelectorChain
): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const el = root.querySelector<HTMLElement>(selector)
      if (el) return el
    } catch {
      continue
    }
  }
  return null
}

export function queryFirstText(
  root: ParentNode,
  selectors: SelectorChain
): string | null {
  return queryFirst(root, selectors)?.textContent?.trim() ?? null
}

export function queryAll(root: ParentNode, selectors: SelectorChain): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const out: HTMLElement[] = []
  for (const selector of selectors) {
    try {
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el)
          out.push(el)
        }
      })
    } catch {
      continue
    }
  }
  return out
}
