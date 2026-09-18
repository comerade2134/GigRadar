import { extensionContextValid } from '../context'
import { getUserProfile, saveUserProfile } from './account'
import { getConnectsSaved } from '../engine/metrics'
import type { CloudSyncState, SharedClientIntel } from '../types'

export const TEAM_INTEL_STORAGE_KEY = 'gigradar:team_intel'
export const SYNC_STATE_STORAGE_KEY = 'gigradar:sync_state'

export const DEFAULT_SYNC_STATE: CloudSyncState = {
  lastSyncedAt: null,
  syncStatus: 'offline'
}

export async function getSyncState(): Promise<CloudSyncState> {
  if (!extensionContextValid()) return { ...DEFAULT_SYNC_STATE }
  try {
    const res = await chrome.storage.local.get(SYNC_STATE_STORAGE_KEY)
    const stored = res[SYNC_STATE_STORAGE_KEY] as CloudSyncState | undefined
    if (stored && typeof stored.syncStatus === 'string') {
      return stored
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_SYNC_STATE }
}

export async function saveSyncState(state: CloudSyncState): Promise<void> {
  if (!extensionContextValid()) return
  await chrome.storage.local.set({ [SYNC_STATE_STORAGE_KEY]: state })
}

export async function getTeamSharedIntel(): Promise<SharedClientIntel[]> {
  if (!extensionContextValid()) return []
  try {
    const res = await chrome.storage.local.get(TEAM_INTEL_STORAGE_KEY)
    const stored = res[TEAM_INTEL_STORAGE_KEY] as SharedClientIntel[] | undefined
    if (Array.isArray(stored)) {
      return stored
    }
  } catch {
    // Fallback
  }
  return []
}

export async function addTeamSharedIntel(
  entry: Omit<SharedClientIntel, 'flaggedAt'>
): Promise<void> {
  if (!extensionContextValid()) return
  const current = await getTeamSharedIntel()
  const exists = current.some((item) => item.clientKey === entry.clientKey)
  if (exists) return

  const updated: SharedClientIntel[] = [
    { ...entry, flaggedAt: Date.now() },
    ...current.slice(0, 99) // Keep last 100 entries
  ]
  await chrome.storage.local.set({ [TEAM_INTEL_STORAGE_KEY]: updated })
}

export async function isClientFlaggedByTeam(
  clientKey: string
): Promise<SharedClientIntel | undefined> {
  const current = await getTeamSharedIntel()
  return current.find((item) => item.clientKey.toLowerCase() === clientKey.toLowerCase())
}

export async function triggerCloudSync(): Promise<CloudSyncState> {
  if (!extensionContextValid()) return { ...DEFAULT_SYNC_STATE }

  const profile = await getUserProfile()

  if (profile.tier === 'free') {
    const offlineState: CloudSyncState = {
      lastSyncedAt: null,
      syncStatus: 'offline'
    }
    await saveSyncState(offlineState)
    return offlineState
  }

  // Set to syncing
  await saveSyncState({
    lastSyncedAt: profile.syncedAt ?? null,
    syncStatus: 'syncing'
  })

  try {
    await getConnectsSaved()

    // Update profile with synced timestamp
    profile.syncedAt = Date.now()
    await saveUserProfile(profile)

    // For agency tiers, populate sample agency intelligence if currently empty
    if (profile.tier === 'agency') {
      const currentTeamIntel = await getTeamSharedIntel()
      if (currentTeamIntel.length === 0) {
        await addTeamSharedIntel({
          clientKey: 'org_acme_ghost',
          clientName: 'Acme Digital Labs',
          flaggedBy: 'Sarah (Lead BD)',
          reason: 'Never hires after sending tests (0/14 hires on $50k listed)'
        })
        await addTeamSharedIntel({
          clientKey: 'org_crypto_scam',
          clientName: 'Web3 Global Ventures',
          flaggedBy: 'Alex (Agency Dev)',
          reason: 'Attempts off-platform Telegram interview redirection'
        })
      }
    }

    const completedState: CloudSyncState = {
      lastSyncedAt: profile.syncedAt,
      syncStatus: 'synced'
    }
    await saveSyncState(completedState)
    return completedState
  } catch (err) {
    const errorState: CloudSyncState = {
      lastSyncedAt: profile.syncedAt ?? null,
      syncStatus: 'error',
      errorMessage: err instanceof Error ? err.message : 'Cloud synchronization failed'
    }
    await saveSyncState(errorState)
    return errorState
  }
}
