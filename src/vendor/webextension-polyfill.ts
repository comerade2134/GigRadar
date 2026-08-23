interface ExtensionApi {
  runtime?: unknown
  storage?: unknown
  management?: unknown
  tabs?: unknown
  windows?: unknown
}

const globals = globalThis as Record<string, unknown>

const source: ExtensionApi =
  (globals.browser as ExtensionApi | undefined) ??
  (globals.chrome as ExtensionApi | undefined) ??
  {}

export const runtime = source.runtime
export const storage = source.storage
export const management = source.management
export const tabs = source.tabs
export const windows = source.windows
