import type { StorageAdapter } from '@otp-vault/core'

interface ElectronStorageArea {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

declare global {
  interface Window {
    electronStorage: {
      local: ElectronStorageArea
      sync: ElectronStorageArea
      session: ElectronStorageArea
    }
  }
}

export const electronStorage: StorageAdapter = {
  local: {
    async get(key) { return window.electronStorage.local.get(key) },
    async set(key, value) { return window.electronStorage.local.set(key, value) },
    async remove(key) { return window.electronStorage.local.remove(key) },
  },
  sync: {
    async get(key) { return window.electronStorage.sync.get(key) },
    async set(key, value) { return window.electronStorage.sync.set(key, value) },
    async remove(key) { return window.electronStorage.sync.remove(key) },
  },
  session: {
    async get(key) { return window.electronStorage.session.get(key) },
    async set(key, value) { return window.electronStorage.session.set(key, value) },
    async remove(key) { return window.electronStorage.session.remove(key) },
  },
}
