import type { StorageAdapter } from '@otp-vault/core'

const isChromeExt = typeof chrome !== 'undefined' && !!chrome.storage

function chromeGet(area: chrome.storage.StorageArea, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    area.get([key], (result) => resolve(result[key] ?? null))
  })
}

function chromeSet(area: chrome.storage.StorageArea, key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    area.set({ [key]: value }, resolve)
  })
}

function chromeRemove(area: chrome.storage.StorageArea, key: string): Promise<void> {
  return new Promise((resolve) => {
    area.remove(key, resolve)
  })
}

/**
 * Extension adapter:
 * - local  → chrome.storage.local  (accounts, up to 5MB, device-only)
 * - sync   → chrome.storage.sync   (config, syncs via Google account)
 *
 * Falls back to localStorage in dev mode (npm run dev outside extension).
 */
export const extensionStorage: StorageAdapter = {
  local: {
    async get(key) {
      if (isChromeExt) return chromeGet(chrome.storage.local, key)
      return localStorage.getItem(key)
    },
    async set(key, value) {
      if (isChromeExt) return chromeSet(chrome.storage.local, key, value)
      localStorage.setItem(key, value)
    },
    async remove(key) {
      if (isChromeExt) return chromeRemove(chrome.storage.local, key)
      localStorage.removeItem(key)
    },
  },
  sync: {
    async get(key) {
      if (isChromeExt) return chromeGet(chrome.storage.sync, key)
      return localStorage.getItem(key)
    },
    async set(key, value) {
      if (isChromeExt) return chromeSet(chrome.storage.sync, key, value)
      localStorage.setItem(key, value)
    },
    async remove(key) {
      if (isChromeExt) return chromeRemove(chrome.storage.sync, key)
      localStorage.removeItem(key)
    },
  },
}
