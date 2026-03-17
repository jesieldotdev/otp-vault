import type { StorageAdapter } from '@otp-vault/core'

/**
 * Web adapter — uses localStorage for both local and sync.
 * (No real cross-device sync on web without JSONBin)
 */
export const webStorage: StorageAdapter = {
  local: {
    async get(key) { return localStorage.getItem(key) },
    async set(key, value) { localStorage.setItem(key, value) },
    async remove(key) { localStorage.removeItem(key) },
  },
  sync: {
    async get(key) { return localStorage.getItem(key) },
    async set(key, value) { localStorage.setItem(key, value) },
    async remove(key) { localStorage.removeItem(key) },
  },
}
