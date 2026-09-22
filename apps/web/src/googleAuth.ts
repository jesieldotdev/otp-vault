/**
 * Web OAuth token getter using Google Identity Services (GIS).
 * Loads the GIS script dynamically — no npm package needed.
 */
import type { TokenResult } from '@otp-vault/core'

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

/**
 * Carrega o script do GIS assim que o app inicia, em vez de esperar o
 * clique do usuário. Se o script só começasse a carregar dentro do clique,
 * o tempo de rede consumia o "user activation" e o navegador bloqueava o
 * popup de login como se fosse um popup indesejado — mesmo com popups
 * permitidos nas configurações do site.
 */
export function preloadGoogleIdentityServices(): void {
  loadGISScript().catch(() => {})
}

export function makeWebTokenGetter(clientId: string): () => Promise<TokenResult> {
  return () => new Promise(async (resolve) => {
    try {
      await loadGISScript()
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file email profile',
        callback: (response) => {
          if (response.access_token) resolve({ token: response.access_token })
          else {
            if (response.error) console.error('Google login error:', response.error)
            resolve({ token: null, error: response.error })
          }
        },
      })
      client.requestAccessToken()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao carregar o script do Google'
      console.error('Google login error:', message)
      resolve({ token: null, error: message })
    }
  })
}
