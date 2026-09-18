import { describe, expect, it } from 'vitest'
import {
  formatCustomJson,
  formatDiscordEmbed,
  formatSlackBlocks,
  shouldDispatch
} from './webhooks'
import type { WebhookConfig, WebhookEventPayload } from '../types'

describe('Webhook and CRM Dispatch Engine', () => {
  const samplePayload: WebhookEventPayload = {
    eventType: 'job_claimed',
    jobId: '~job_123',
    jobTitle: 'React & Node.js Dashboard',
    jobUrl: 'https://www.upwork.com/jobs/~job_123',
    clientName: 'Acme Corp',
    dealValueUsd: 2500,
    hireRatePct: 75,
    totalSpendUsd: 12000,
    paymentVerified: true,
    memberName: 'Sarah Jenkins',
    memberEmail: 'sarah@agency.com',
    status: 'drafting',
    notes: 'Starting proposal draft',
    timestamp: 1726000000000
  }

  const sampleConfig: WebhookConfig = {
    slackWebhookUrl: 'https://hooks.slack.com/services/xxx',
    discordWebhookUrl: 'https://discord.com/api/webhooks/xxx',
    customWebhookUrl: 'https://api.crm.internal/webhook',
    notifyOnClaim: true,
    notifyOnApplied: true,
    notifyOnHighValue: true,
    notifyOnCollision: true,
    highValueThresholdUsd: 1000
  }

  describe('formatSlackBlocks', () => {
    it('creates compliant Block Kit payload with header, fields, and action button', () => {
      const formatted = formatSlackBlocks(samplePayload)
      expect(formatted.text).toContain('React & Node.js Dashboard')
      expect(formatted.blocks.length).toBeGreaterThanOrEqual(3)

      const headerBlock = formatted.blocks[0] as { type: string; text: { text: string } }
      expect(headerBlock.type).toBe('header')
      expect(headerBlock.text.text).toContain('Claimed')

      const sectionBlock = formatted.blocks[1] as { type: string; fields: { text: string }[] }
      expect(sectionBlock.type).toBe('section')
      expect(sectionBlock.fields.some((f) => f.text.includes('Sarah Jenkins'))).toBe(true)
      expect(sectionBlock.fields.some((f) => f.text.includes('$2,500'))).toBe(true)

      const actionBlock = formatted.blocks[formatted.blocks.length - 1] as {
        type: string
        elements: { url: string }[]
      }
      expect(actionBlock.type).toBe('actions')
      expect(actionBlock.elements[0].url).toBe(samplePayload.jobUrl)
    })
  })

  describe('formatDiscordEmbed', () => {
    it('creates rich embed with proper color and fields', () => {
      const formatted = formatDiscordEmbed(samplePayload)
      expect(formatted.embeds).toBeDefined()
      expect(formatted.embeds.length).toBe(1)

      const embed = formatted.embeds[0]
      expect(embed.title).toContain('React & Node.js Dashboard')
      expect(embed.color).toBe(0xf59e0b) // Amber for job_claimed
      expect(embed.fields.some((f) => f.name === 'Deal Value' && f.value.includes('$2,500'))).toBe(true)
      expect(embed.fields.some((f) => f.name === 'Assigned BD' && f.value.includes('Sarah Jenkins'))).toBe(true)
    })

    it('uses green color for applied event', () => {
      const appliedPayload: WebhookEventPayload = {
        ...samplePayload,
        eventType: 'job_applied',
        status: 'applied'
      }
      const formatted = formatDiscordEmbed(appliedPayload)
      expect(formatted.embeds[0].color).toBe(0x10b981) // Emerald for applied
    })

    it('uses red color for collision prevented', () => {
      const collisionPayload: WebhookEventPayload = {
        ...samplePayload,
        eventType: 'collision_prevented',
        status: 'viewing'
      }
      const formatted = formatDiscordEmbed(collisionPayload)
      expect(formatted.embeds[0].color).toBe(0xef4444) // Red
    })
  })

  describe('formatCustomJson', () => {
    it('formats clean JSON with job, client, and team objects', () => {
      const json = formatCustomJson(samplePayload)
      expect(json.source).toBe('gigradar')
      expect(json.event).toBe('job_claimed')
      expect(json.job.id).toBe('~job_123')
      expect(json.job.dealValueUsd).toBe(2500)
      expect(json.client.name).toBe('Acme Corp')
      expect(json.client.hireRatePct).toBe(75)
      expect(json.team.memberName).toBe('Sarah Jenkins')
      expect(json.isoTime).toBeDefined()
    })
  })

  describe('shouldDispatch', () => {
    it('respects notifyOnClaim toggle', () => {
      expect(shouldDispatch(samplePayload, sampleConfig)).toBe(true)
      expect(shouldDispatch(samplePayload, { ...sampleConfig, notifyOnClaim: false })).toBe(false)
    })

    it('respects notifyOnApplied toggle', () => {
      const appliedPayload: WebhookEventPayload = { ...samplePayload, eventType: 'job_applied' }
      expect(shouldDispatch(appliedPayload, sampleConfig)).toBe(true)
      expect(shouldDispatch(appliedPayload, { ...sampleConfig, notifyOnApplied: false })).toBe(false)
    })

    it('filters high-value leads below threshold', () => {
      const highValuePayload: WebhookEventPayload = {
        ...samplePayload,
        eventType: 'high_value_lead',
        dealValueUsd: 500
      }
      expect(shouldDispatch(highValuePayload, { ...sampleConfig, highValueThresholdUsd: 1000 })).toBe(false)
      expect(shouldDispatch(highValuePayload, { ...sampleConfig, highValueThresholdUsd: 400 })).toBe(true)
    })
  })

  describe('requestWebhookPermissions', () => {
    it('handles empty or malformed URLs gracefully without error', async () => {
      const { requestWebhookPermissions } = await import('./webhooks')
      const result = await requestWebhookPermissions(['', 'not-a-url', 'http://'])
      expect(result).toBe(true)
    })
  })
})

