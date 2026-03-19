/**
 * Web OAuth token getter using Google Identity Services (GIS).
 * Loads the GIS script dynamically — no npm package needed.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }): { requestAccessToken(): void }
        }
      }
    }
  }
}

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

export function makeWebTokenGetter(clientId: string): () => Promise<string | null> {
  return () => new Promise(async (resolve) => {
    try {
      await loadGISScript()
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file email profile',
        callback: (response) => {
          if (response.access_token) resolve(response.access_token)
          else resolve(null)
        },
      })
      client.requestAccessToken()
    } catch {
      resolve(null)
    }
  })
}
