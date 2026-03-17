/**
 * Platform-agnostic storage interface.
 * Each app (web, extension) provides its own implementation via StorageProvider.
 */

export interface StorageAdapter {
  /** Local storage — accounts, large data (no cross-device sync) */
  local: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
  }
  /** Sync storage — small config that syncs across devices */
  sync: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
  }
}
