import { describe, expect, it } from 'vitest'
import { shouldRefreshLicense } from './extpay-core'

describe('shouldRefreshLicense', () => {
  it('forces a refresh after checkout even when the unpaid cache is fresh', () => {
    expect(
      shouldRefreshLicense(
        { paid: false, checkedAt: 1_000 },
        true,
        2_000
      )
    ).toBe(true)
  })

  it('uses the fresh cache for non-forced reads', () => {
    expect(
      shouldRefreshLicense(
        { paid: false, checkedAt: 1_000 },
        false,
        2_000
      )
    ).toBe(false)
  })
})