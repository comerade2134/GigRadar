/**
 * True while this script's extension context is alive. After a reload/update
 * (or an HMR swap) orphaned content scripts keep running with dead chrome.*
 * handles — every call then throws "Extension context invalidated".
 * Call sites should bail out silently instead of throwing into the page.
 */
export function extensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id
  } catch {
    return false
  }
}
