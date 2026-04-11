/**
 * Extension OAuth token getter using chrome.identity API.
 * No external script needed — Chrome handles the OAuth flow natively.
 */

export function makeExtensionTokenGetter(clientId: string): () => Promise<string | null> {
  return () => new Promise((resolve) => {
    const isChromeExt = typeof chrome !== 'undefined' && !!chrome.identity

    if (isChromeExt) {
      // Chrome handles OAuth natively — user doesn't leave the browser
      chrome.identity.getAuthToken(
        { interactive: true, scopes: ['https://www.googleapis.com/auth/drive.file', 'email', 'profile'] },
        (token) => {
          if (chrome.runtime.lastError || !token) {
            console.warn('chrome.identity error:', chrome.runtime.lastError?.message)
            resolve(null)
          } else {
            resolve(token)
          }
        }
      )
    } else {
      // Dev mode fallback — use web flow
      resolve(null)
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
