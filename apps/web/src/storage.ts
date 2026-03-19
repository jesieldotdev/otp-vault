import type { StorageAdapter } from '@otp-vault/core'

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
  // Web: sessionStorage — clears when tab/browser closes
  session: {
    async get(key) { return sessionStorage.getItem(key) },
    async set(key, value) { sessionStorage.setItem(key, value) },
    async remove(key) { sessionStorage.removeItem(key) },
  },
}
