/**
 * Extension OAuth token getter using chrome.identity API.
 * No external script needed — Chrome handles the OAuth flow natively.
 */

import type { TokenResult } from '@otp-vault/core'

export function makeExtensionTokenGetter(clientId: string): () => Promise<TokenResult> {
  return () => new Promise((resolve) => {
    const isChromeExt = typeof chrome !== 'undefined' && !!chrome.identity

    if (isChromeExt) {
      // Chrome handles OAuth natively — user doesn't leave the browser
      chrome.identity.getAuthToken(
        { interactive: true, scopes: ['https://www.googleapis.com/auth/drive.file', 'email', 'profile'] },
        (token) => {
          if (chrome.runtime.lastError || !token) {
            const message = chrome.runtime.lastError?.message
            console.warn('chrome.identity error:', message)
            resolve({ token: null, error: message })
          } else {
            resolve({ token })
          }
        }
      )
    } else {
      // Dev mode fallback — chrome.identity só existe em builds com "identity"
      // na manifest, gerada apenas por `yarn build:ext` com VITE_GOOGLE_CLIENT_ID definido.
      const message = 'chrome.identity indisponível. Rode "yarn build:ext" com VITE_GOOGLE_CLIENT_ID configurado e carregue a extensão a partir de dist/.'
      console.warn(message)
      resolve({ token: null, error: message })
    }
  })
}

/** Revoke cached token (used on disconnect) */
export function revokeExtensionToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.identity) {
      chrome.identity.removeCachedAuthToken({ token }, resolve)
    } else {
      resolve()
    }
  })
}
