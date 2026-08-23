interface ExtPayUser {
  paid?: boolean
  paidAt?: string | Date | null
  email?: string | null
  installedAt?: string | Date
  trialStartedAt?: string | Date | null
  subscriptionStatus?: 'active' | 'past_due' | 'canceled'
}

interface ExtPayInstance {
  getUser(): Promise<ExtPayUser>
  openPaymentPage(): void
  openTrialPage(): void
  openRestorePage(): void
  openLoginPage(): void
  onPaid: { addListener(callback: () => void): void }
  startBackground(): void
}

declare function extpayFactory(extensionId: string): ExtPayInstance

export default extpayFactory
