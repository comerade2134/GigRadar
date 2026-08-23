export type SelectorChain = readonly string[]

const chain = (...selectors: string[]): SelectorChain => selectors

export const SELECTORS = {
  jobCard: chain(
    '[data-test="job-tile"]',
    'section.job-tile-responsive',
    '[data-test="JobTile"]',
    'section.up-card-section'
  ),
  titleLink: chain(
    '[data-test="job-tile-title-link"]',
    '.job-tile-title a',
    '[data-test="JobTileTitle"]',
    'h4 a'
  ),
  jobDescription: chain(
    '[data-test="job-description-text"]',
    '.job-tile-description',
    '[data-test="job-description"] p'
  ),
  paymentVerified: chain(
    '[data-test="payment-verification-status"]',
    '[data-test="payment-verified"]',
    '[aria-label="Payment verified"]'
  ),
  totalSpend: chain(
    '[data-qa="client-spend"]',
    '[data-test="total-spent"]',
    '[data-test="total-spend"]',
    '[data-test="client-spend"]'
  ),
  hireRate: chain('[data-test="hire-rate"]', '[data-test="client-hire-rate"]'),
  proposals: chain(
    '[data-test="proposals-count"]',
    '[data-test="number-of-proposals"]',
    '.job-details-proposals',
    'span[data-test="proposal-count"]'
  ),
  postedTime: chain(
    '[data-test="posted-on"]',
    '[data-test="publish-date"]',
    '.jo-chup-time'
  ),
  clientStats: chain(
    '[data-test="client-stats"]',
    'ul.client-stats',
    '[class*="client-stats"]'
  ),
  feedbackItem: chain(
    '[data-qa="client-job-history"] .air3-review-item',
    '.air3-review-item',
    '[data-test="feedback-comment"]',
    'li.feedback span',
    '[class*="review-text"]',
    '[class*="feedback"] p'
  ),
  jobDrawer: chain(
    '[data-test="job-details-modal"]',
    '.air3-slider',
    'aside[aria-label="Job details"]'
  ),
  cardTitleLink: chain('h2 a', 'a.up-n-link'),
  coverLetter: chain(
    '#cover-letter',
    '[data-test="cover-letter"]',
    'textarea[name="coverLetter"]',
    'textarea[id*="cover-letter" i]'
  ),
  screeningQuestion: chain(
    '[data-test="screening-question"]',
    '[class*="screening-question"]',
    '[data-qa="screening-question"]'
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
  const out: HTMLElement[] = []
  for (const selector of selectors) {
    try {
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => out.push(el))
    } catch {
      continue
    }
  }
  return out
}
