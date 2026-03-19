import type { StorageAdapter } from '@otp-vault/core'

const isChromeExt = typeof chrome !== 'undefined' && !!chrome.storage

function chromeGet(area: chrome.storage.StorageArea, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    area.get([key], (result) => resolve(result[key] ?? null))
  })
}
function chromeSet(area: chrome.storage.StorageArea, key: string, value: string): Promise<void> {
  return new Promise((resolve) => { area.set({ [key]: value }, resolve) })
}
function chromeRemove(area: chrome.storage.StorageArea, key: string): Promise<void> {
  return new Promise((resolve) => { area.remove(key, resolve) })
}

export const extensionStorage: StorageAdapter = {
  local: {
    async get(key) { return isChromeExt ? chromeGet(chrome.storage.local, key) : localStorage.getItem(key) },
    async set(key, value) { return isChromeExt ? chromeSet(chrome.storage.local, key, value) : void localStorage.setItem(key, value) },
    async remove(key) { return isChromeExt ? chromeRemove(chrome.storage.local, key) : void localStorage.removeItem(key) },
  },
  sync: {
    async get(key) { return isChromeExt ? chromeGet(chrome.storage.sync, key) : localStorage.getItem(key) },
    async set(key, value) { return isChromeExt ? chromeSet(chrome.storage.sync, key, value) : void localStorage.setItem(key, value) },
    async remove(key) { return isChromeExt ? chromeRemove(chrome.storage.sync, key) : void localStorage.removeItem(key) },
  },
  // Extension: chrome.storage.session — persists while browser is open, clears on browser close
  // Popup close does NOT clear it — perfect for caching master password
  session: {
    async get(key) {
      if (isChromeExt && chrome.storage.session) return chromeGet(chrome.storage.session, key)
      return sessionStorage.getItem(key)
    },
    async set(key, value) {
      if (isChromeExt && chrome.storage.session) return chromeSet(chrome.storage.session, key, value)
      sessionStorage.setItem(key, value)
    },
    async remove(key) {
      if (isChromeExt && chrome.storage.session) return chromeRemove(chrome.storage.session, key)
      sessionStorage.removeItem(key)
    },
  },
}