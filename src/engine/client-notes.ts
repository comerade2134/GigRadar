import { extensionContextValid } from '../context'
import type { ClientRecord } from '../types'

export const CLIENT_NOTES_STORAGE_KEY = 'gigradar:client_notes'

export async function loadClientRecords(): Promise<ClientRecord[]> {
  if (!extensionContextValid()) return []
  try {
    const res = await chrome.storage.local.get(CLIENT_NOTES_STORAGE_KEY)
    const stored = res[CLIENT_NOTES_STORAGE_KEY]
    if (Array.isArray(stored)) {
      return stored as ClientRecord[]
    }
  } catch {
    // Return empty on error
  }
  return []
}

export async function saveClientRecord(
  input: Omit<ClientRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string
    createdAt?: number
  }
): Promise<ClientRecord> {
  const records = await loadClientRecords()
  const now = Date.now()
  const id = input.id || `client_${now}_${Math.random().toString(36).slice(2, 7)}`

  const existingIdx = records.findIndex((r) => r.id === id)
  const newRecord: ClientRecord = {
    id,
    clientName: input.clientName.trim(),
    companyName: input.companyName?.trim() || undefined,
    status: input.status,
    note: input.note?.trim() || undefined,
    createdAt: input.createdAt ?? (existingIdx >= 0 ? records[existingIdx].createdAt : now),
    updatedAt: now
  }

  if (existingIdx >= 0) {
    records[existingIdx] = newRecord
  } else {
    records.unshift(newRecord)
  }

  if (extensionContextValid()) {
    await chrome.storage.local.set({ [CLIENT_NOTES_STORAGE_KEY]: records })
  }
  return newRecord
}

export async function deleteClientRecord(id: string): Promise<boolean> {
  const records = await loadClientRecords()
  const filtered = records.filter((r) => r.id !== id)
  if (filtered.length === records.length) return false

  if (extensionContextValid()) {
    await chrome.storage.local.set({ [CLIENT_NOTES_STORAGE_KEY]: filtered })
  }
  return true
}

export interface ClientMatchQuery {
  clientName?: string | null
  companyName?: string | null
  feedbacks?: string[]
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
}

export function matchClientAgainstRecords(
  records: readonly ClientRecord[],
  query: ClientMatchQuery
): ClientRecord | null {
  if (records.length === 0) return null

  const queryName = query.clientName ? normalize(query.clientName) : ''
  const queryCompany = query.companyName ? normalize(query.companyName) : ''
  const feedbackText = (query.feedbacks ?? []).map(normalize).join(' ')

  for (const record of records) {
    const recName = normalize(record.clientName)
    const recCompany = record.companyName ? normalize(record.companyName) : ''

    // 1. Direct name match
    if (queryName && recName && (queryName === recName || queryName.includes(recName) || recName.includes(queryName))) {
      return record
    }

    // 2. Direct company match
    if (queryCompany && recCompany && (queryCompany === recCompany || queryCompany.includes(recCompany) || recCompany.includes(queryCompany))) {
      return record
    }

    // 3. Feedback mention match (checks full name/company or significant name words >= 4 chars)
    if (recName.length >= 4 && feedbackText.includes(recName)) {
      return record
    }
    const nameWords = recName.split(/\s+/).filter((w) => w.length >= 4)
    for (const w of nameWords) {
      if (feedbackText.includes(w)) {
        return record
      }
    }
    if (recCompany.length >= 4 && feedbackText.includes(recCompany)) {
      return record
    }
  }

  return null
}

export async function findMatchingClientRecord(
  query: ClientMatchQuery
): Promise<ClientRecord | null> {
  const records = await loadClientRecords()
  return matchClientAgainstRecords(records, query)
}
