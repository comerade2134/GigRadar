const STORAGE_KEY = 'gigradar:connects_saved'

export const CONNECTS_PER_SKIP = 8
export const DOLLARS_PER_CONNECT = 0.15

export async function getConnectsSaved(): Promise<number> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return typeof result[STORAGE_KEY] === 'number' ? (result[STORAGE_KEY] as number) : 0
}

export async function addConnectsSaved(count: number): Promise<void> {
  const current = await getConnectsSaved()
  await chrome.storage.local.set({ [STORAGE_KEY]: current + count })
}
