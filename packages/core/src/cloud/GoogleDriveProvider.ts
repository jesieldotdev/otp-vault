import type { CloudProvider } from './CloudProvider'
import type { StorageAdapter } from '../storage/StorageAdapter'

const TOKEN_KEY   = 'otp_vault_gdrive_token'
const FILE_NAME   = 'otp-vault.enc'
const FOLDER_NAME = 'OTP Vault'

export interface GoogleDriveToken {
  access_token: string
  expires_at: number   // timestamp ms
  email?: string
}

export class GoogleDriveProvider implements CloudProvider {
  readonly id = 'gdrive' as const
  readonly name = 'Google Drive'

  private token: GoogleDriveToken | null = null
  private storage: StorageAdapter
  private clientId: string
  private _getToken: (() => Promise<string | null>) | null = null

  constructor(storage: StorageAdapter, clientId: string) {
    this.storage = storage
    this.clientId = clientId
  }

  /**
   * Inject platform-specific OAuth token getter.
   * Web: uses Google Identity Services popup.
   * Extension: uses chrome.identity.launchWebAuthFlow.
   */
  setTokenGetter(fn: () => Promise<string | null>) {
    this._getToken = fn
  }

  isReady(): boolean {
    return !!this.token && this.token.expires_at > Date.now()
  }

  getToken(): GoogleDriveToken | null {
    return this.token
  }

  async load(): Promise<void> {
    const raw = await this.storage.sync.get(TOKEN_KEY)
    if (!raw) return
    try {
      const t = JSON.parse(raw) as GoogleDriveToken
      if (t.expires_at > Date.now()) this.token = t
      else await this.storage.sync.remove(TOKEN_KEY)
    } catch {}
  }

  async signIn(): Promise<boolean> {
    if (!this._getToken) throw new Error('Token getter not set. Call setTokenGetter() first.')
    const accessToken = await this._getToken()
    if (!accessToken) return false

    // Fetch user info to get email
    let email: string | undefined
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        email = data.email
      }
    } catch {}

    this.token = {
      access_token: accessToken,
      expires_at: Date.now() + 3600_000, // 1h
      email,
    }
    await this.storage.sync.set(TOKEN_KEY, JSON.stringify(this.token))
    return true
  }

  async disconnect(): Promise<void> {
    this.token = null
    await this.storage.sync.remove(TOKEN_KEY)
  }

  // ── Drive API helpers ────────────────────────────────────────────────────

  private async getHeaders(): Promise<HeadersInit> {
    if (!this.token) throw new Error('Not authenticated')
    return {
      Authorization: `Bearer ${this.token.access_token}`,
      'Content-Type': 'application/json',
    }
  }

  private async findOrCreateFolder(): Promise<string> {
    const headers = await this.getHeaders()

    // Search for existing folder
    const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers })
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
    const data = await res.json()

    if (data.files?.length > 0) return data.files[0].id

    // Create folder
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
    if (!create.ok) throw new Error(`Failed to create folder: ${create.status}`)
    const folder = await create.json()
    return folder.id
  }

  private async findVaultFile(folderId: string): Promise<string | null> {
    const headers = await this.getHeaders()
    const q = encodeURIComponent(`name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    return data.files?.[0]?.id ?? null
  }

  async push(encrypted: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const folderId = await this.findOrCreateFolder()
      const fileId   = await this.findVaultFile(folderId)
      const headers  = { Authorization: `Bearer ${this.token!.access_token}` }

      const metadata = { name: FILE_NAME, parents: fileId ? undefined : [folderId] }
      const body = new FormData()
      body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      body.append('file',     new Blob([encrypted],                { type: 'text/plain' }))

      const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

      const res = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers,
        body,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, error: `Drive error (${res.status}): ${err.error?.message ?? 'unknown'}` }
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Erro ao enviar para o Drive' }
    }
  }

  async pull(): Promise<{ ok: boolean; payload?: string; error?: string }> {
    try {
      const folderId = await this.findOrCreateFolder()
      const fileId   = await this.findVaultFile(folderId)
      if (!fileId) return { ok: false, error: 'Nenhuma vault encontrada no Drive.' }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${this.token!.access_token}` } },
      )
      if (!res.ok) return { ok: false, error: `Drive error (${res.status})` }
      const payload = await res.text()
      return { ok: true, payload }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Erro ao buscar do Drive' }
    }
  }
}
