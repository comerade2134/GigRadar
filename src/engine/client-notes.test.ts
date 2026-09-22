import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  matchClientAgainstRecords,
  saveClientRecord,
  loadClientRecords,
  deleteClientRecord
} from './client-notes'
import type { ClientRecord } from '../types'

describe('client-notes engine', () => {
  let mockStorage: Record<string, unknown> = {}

  beforeEach(() => {
    mockStorage = {}
    vi.stubGlobal('chrome', {
      runtime: { id: 'mock-ext-id' },
      storage: {
        local: {
          get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
          set: vi.fn((obj: Record<string, unknown>) => {
            Object.assign(mockStorage, obj)
            return Promise.resolve()
          })
        }
      }
    })
  })

  it('saves and loads client records correctly', async () => {
    const saved = await saveClientRecord({
      clientName: 'Acme Corp',
      companyName: 'Acme Global',
      status: 'blacklisted',
      note: 'Scope creep and disputed payment'
    })

    expect(saved.id).toBeDefined()
    expect(saved.clientName).toBe('Acme Corp')
    expect(saved.status).toBe('blacklisted')

    const loaded = await loadClientRecords()
    expect(loaded.length).toBe(1)
    expect(loaded[0].clientName).toBe('Acme Corp')
    expect(loaded[0].note).toBe('Scope creep and disputed payment')
  })

  it('updates existing record on save with same id', async () => {
    const initial = await saveClientRecord({
      clientName: 'Beta Studio',
      status: 'favorite',
      note: 'Prompt payments'
    })

    const updated = await saveClientRecord({
      id: initial.id,
      clientName: 'Beta Studio Inc',
      status: 'favorite',
      note: 'Very prompt payments and great team'
    })

    expect(updated.id).toBe(initial.id)
    const loaded = await loadClientRecords()
    expect(loaded.length).toBe(1)
    expect(loaded[0].clientName).toBe('Beta Studio Inc')
    expect(loaded[0].note).toBe('Very prompt payments and great team')
  })

  it('deletes a client record', async () => {
    const r1 = await saveClientRecord({ clientName: 'Client A', status: 'blacklisted' })
    const r2 = await saveClientRecord({ clientName: 'Client B', status: 'favorite' })

    let loaded = await loadClientRecords()
    expect(loaded.length).toBe(2)

    const deleted = await deleteClientRecord(r1.id)
    expect(deleted).toBe(true)

    loaded = await loadClientRecords()
    expect(loaded.length).toBe(1)
    expect(loaded[0].id).toBe(r2.id)
  })

  it('matches client against records by exact or substring name', () => {
    const records: ClientRecord[] = [
      {
        id: '1',
        clientName: 'Johnathan Miller',
        status: 'blacklisted',
        note: 'Refuses escrow release',
        createdAt: 1000,
        updatedAt: 1000
      },
      {
        id: '2',
        clientName: 'Sarah',
        companyName: 'Apex Innovations',
        status: 'favorite',
        note: 'Best client ever',
        createdAt: 2000,
        updatedAt: 2000
      }
    ]

    // Query by name
    const match1 = matchClientAgainstRecords(records, { clientName: 'Johnathan' })
    expect(match1?.id).toBe('1')
    expect(match1?.status).toBe('blacklisted')

    // Query by company
    const match2 = matchClientAgainstRecords(records, { companyName: 'Apex Innovations' })
    expect(match2?.id).toBe('2')
    expect(match2?.status).toBe('favorite')

    // Query by feedback mention
    const match3 = matchClientAgainstRecords(records, {
      feedbacks: ['Thanks Johnathan for the great project!']
    })
    expect(match3?.id).toBe('1')

    // Unmatched
    const matchNone = matchClientAgainstRecords(records, { clientName: 'Unknown Person' })
    expect(matchNone).toBeNull()
  })
})
