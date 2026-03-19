import { useState, useCallback, useRef, useEffect } from 'react'
import type { Account, PasswordEntry, VaultPayload, SyncVersionInfo } from '../types'
import { encryptVault, decryptVault } from '../utils/crypto'
import { useStorage } from '../storage/StorageContext'
import type { CloudProvider } from '../cloud/CloudProvider'
import type { JsonBinProvider } from '../cloud/JsonBinProvider'
import type { GoogleDriveProvider } from '../cloud/GoogleDriveProvider'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'checking'
export type ActiveProvider = 'jsonbin' | 'gdrive' | null

const VERSION_KEY   = 'otp_vault_sync_version'
const PROVIDER_KEY  = 'otp_vault_active_provider'

interface LocalVersionMeta {
  version: number
  syncedAt: number
  lastModifiedAt: number
}

export interface PulledVault {
  accounts: Account[]
  passwords: PasswordEntry[]
  meta?: VaultPayload['meta']
}

export interface UseCloudSyncReturn {
  // State
  status: SyncStatus
  activeProvider: ActiveProvider
  lastSyncedAt: Date | null
  errorMsg: string | null
  loading: boolean
  versionInfo: SyncVersionInfo | null

  // JSONBin specific
  jsonbin: JsonBinProvider | null
  configureJsonBin: (apiKey: string, binId: string | null) => Promise<void>

  // Google Drive specific
  gdrive: GoogleDriveProvider | null
  signInGoogle: () => Promise<boolean>

  // Common
  switchProvider: (provider: ActiveProvider) => Promise<void>
  disconnect: () => Promise<void>
  push: (accounts: Account[], passwords: PasswordEntry[], password: string) => Promise<boolean>
  pull: (password: string) => Promise<PulledVault | null>
  checkRemoteVersion: (password: string) => Promise<void>
  markLocalChanges: () => Promise<void>
}

export function useCloudSync(
  jsonbinProvider: JsonBinProvider | null,
  gdriveProvider: GoogleDriveProvider | null,
): UseCloudSyncReturn {
  const storage = useStorage()

  const [status,         setStatus]         = useState<SyncStatus>('idle')
  const [activeProvider, setActiveProvider] = useState<ActiveProvider>(null)
  const [lastSyncedAt,   setLastSyncedAt]   = useState<Date | null>(null)
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [versionInfo,    setVersionInfo]    = useState<SyncVersionInfo | null>(null)
  const [localMeta,      setLocalMeta]      = useState<LocalVersionMeta | null>(null)

  const activeProviderRef = useRef<ActiveProvider>(null)
  useEffect(() => { activeProviderRef.current = activeProvider }, [activeProvider])

  // Load saved state on mount
  useEffect(() => {
    const init = async () => {
      // Load providers
      if (jsonbinProvider) await jsonbinProvider.load()
      if (gdriveProvider)  await gdriveProvider.load()

      // Load active provider preference
      const saved = await storage.sync.get(PROVIDER_KEY) as ActiveProvider | null

      // Auto-select: use saved preference, or first available
      let active: ActiveProvider = null
      if (saved === 'gdrive'  && gdriveProvider?.isReady())  active = 'gdrive'
      else if (saved === 'jsonbin' && jsonbinProvider?.isReady()) active = 'jsonbin'
      else if (gdriveProvider?.isReady())  active = 'gdrive'
      else if (jsonbinProvider?.isReady()) active = 'jsonbin'

      setActiveProvider(active)
      activeProviderRef.current = active

      // Load version meta
      const rawVersion = await storage.local.get(VERSION_KEY)
      if (rawVersion) {
        try {
          const meta = JSON.parse(rawVersion) as LocalVersionMeta
          setLocalMeta(meta)
          setLastSyncedAt(new Date(meta.syncedAt))
          setVersionInfo({
            localVersion:    meta.version,
            localSyncedAt:   meta.syncedAt,
            remoteVersion:   null,
            remoteSyncedAt:  null,
            isOutdated:      false,
            hasLocalChanges: meta.lastModifiedAt > meta.syncedAt,
          })
        } catch {}
      }

      setLoading(false)
    }
    init()
  }, [storage, jsonbinProvider, gdriveProvider])

  const setErr = useCallback((msg: string) => {
    setErrorMsg(msg)
    setStatus('error')
  }, [])

  const getActiveProvider = useCallback((): CloudProvider | null => {
    const ap = activeProviderRef.current
    if (ap === 'jsonbin') return jsonbinProvider
    if (ap === 'gdrive')  return gdriveProvider
    return null
  }, [jsonbinProvider, gdriveProvider])

  const configureJsonBin = useCallback(async (apiKey: string, binId: string | null) => {
    if (!jsonbinProvider) return
    await jsonbinProvider.configure(apiKey, binId)
    setActiveProvider('jsonbin')
    await storage.sync.set(PROVIDER_KEY, 'jsonbin')
    setStatus('idle')
    setErrorMsg(null)
  }, [jsonbinProvider, storage])

  const signInGoogle = useCallback(async (): Promise<boolean> => {
    if (!gdriveProvider) return false
    const ok = await gdriveProvider.signIn()
    if (ok) {
      setActiveProvider('gdrive')
      await storage.sync.set(PROVIDER_KEY, 'gdrive')
      setStatus('idle')
      setErrorMsg(null)
    }
    return ok
  }, [gdriveProvider, storage])

  const switchProvider = useCallback(async (provider: ActiveProvider) => {
    setActiveProvider(provider)
    activeProviderRef.current = provider
    if (provider) await storage.sync.set(PROVIDER_KEY, provider)
    setStatus('idle')
    setErrorMsg(null)
  }, [storage])

  const disconnect = useCallback(async () => {
    const ap = activeProviderRef.current
    if (ap === 'jsonbin') await jsonbinProvider?.disconnect()
    if (ap === 'gdrive')  await gdriveProvider?.disconnect()
    setActiveProvider(null)
    activeProviderRef.current = null
    await storage.sync.remove(PROVIDER_KEY)
    await storage.local.remove(VERSION_KEY)
    setLocalMeta(null)
    setVersionInfo(null)
    setStatus('idle')
    setErrorMsg(null)
    setLastSyncedAt(null)
  }, [jsonbinProvider, gdriveProvider, storage])

  const push = useCallback(async (
    accounts: Account[],
    passwords: PasswordEntry[],
    password: string,
  ): Promise<boolean> => {
    const provider = getActiveProvider()
    if (!provider) { setErr('Nenhum provedor configurado.'); return false }

    setStatus('syncing')
    setErrorMsg(null)

    try {
      const now        = Date.now()
      const newVersion = (localMeta?.version ?? 0) + 1
      const payload: VaultPayload = {
        meta: { version: newVersion, syncedAt: now },
        accounts:  accounts.map(({ id: _id, ...r }) => r),
        passwords: passwords.map(({ id: _id, ...r }) => r),
      }
      const encrypted = await encryptVault(payload, password)
      const result    = await provider.push(encrypted)

      if (!result.ok) { setErr(result.error ?? 'Erro desconhecido'); return false }

      const newMeta: LocalVersionMeta = { version: newVersion, syncedAt: now, lastModifiedAt: now }
      await storage.local.set(VERSION_KEY, JSON.stringify(newMeta))
      setLocalMeta(newMeta)
      setVersionInfo({ localVersion: newVersion, localSyncedAt: now, remoteVersion: newVersion, remoteSyncedAt: now, isOutdated: false, hasLocalChanges: false })
      setStatus('ok')
      setLastSyncedAt(new Date(now))
      return true
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao enviar')
      return false
    }
  }, [getActiveProvider, localMeta, setErr, storage])

  const pull = useCallback(async (password: string): Promise<PulledVault | null> => {
    const provider = getActiveProvider()
    if (!provider) { setErr('Nenhum provedor configurado.'); return null }

    setStatus('syncing')
    setErrorMsg(null)

    try {
      const result = await provider.pull()
      if (!result.ok || !result.payload) { setErr(result.error ?? 'Vault vazia'); return null }

      const decrypted = await decryptVault(result.payload, password)

      let rawAccounts:  Record<string, unknown>[] = []
      let rawPasswords: Record<string, unknown>[] = []
      let meta: VaultPayload['meta'] | undefined

      if (Array.isArray(decrypted)) {
        rawAccounts = decrypted as Record<string, unknown>[]
      } else if (typeof decrypted === 'object' && decrypted !== null) {
        const p = decrypted as { accounts?: unknown[]; passwords?: unknown[]; meta?: VaultPayload['meta'] }
        rawAccounts  = (p.accounts  ?? []) as Record<string, unknown>[]
        rawPasswords = (p.passwords ?? []) as Record<string, unknown>[]
        meta = p.meta
      } else {
        throw new Error('Formato de vault inválido')
      }

      const accounts = rawAccounts.map((a) => ({
        id: crypto.randomUUID(),
        issuer: String(a.issuer ?? ''), label:  String(a.label  ?? ''),
        secret: String(a.secret ?? ''), period: Number(a.period ?? 30), digits: Number(a.digits ?? 6),
      })) as Account[]

      const passwords = rawPasswords.map((p) => ({
        id: crypto.randomUUID(),
        title: String(p.title ?? ''), username: String(p.username ?? ''),
        password: String(p.password ?? ''), url: String(p.url ?? ''),
        notes: String(p.notes ?? ''), createdAt: Number(p.createdAt ?? Date.now()), updatedAt: Number(p.updatedAt ?? Date.now()),
      })) as PasswordEntry[]

      const now     = Date.now()
      const newMeta: LocalVersionMeta = { version: meta?.version ?? 1, syncedAt: now, lastModifiedAt: now }
      await storage.local.set(VERSION_KEY, JSON.stringify(newMeta))
      setLocalMeta(newMeta)
      setVersionInfo({ localVersion: newMeta.version, localSyncedAt: now, remoteVersion: meta?.version ?? null, remoteSyncedAt: meta?.syncedAt ?? null, isOutdated: false, hasLocalChanges: false })
      setStatus('ok')
      setLastSyncedAt(new Date(now))
      return { accounts, passwords, meta }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao descriptografar'
      setErr(msg.includes('decrypt') || msg.includes('operation') ? 'Senha incorreta.' : msg)
      return null
    }
  }, [getActiveProvider, setErr, storage])

  const checkRemoteVersion = useCallback(async (password: string): Promise<void> => {
    const provider = getActiveProvider()
    if (!provider) return
    setStatus('checking')
    setErrorMsg(null)
    try {
      const result = await provider.pull()
      if (!result.ok || !result.payload) { setStatus('idle'); return }
      const decrypted = await decryptVault(result.payload, password)
      let remoteMeta: VaultPayload['meta'] | undefined
      if (typeof decrypted === 'object' && !Array.isArray(decrypted) && decrypted !== null) {
        remoteMeta = (decrypted as { meta?: VaultPayload['meta'] }).meta
      }
      const remoteVersion = remoteMeta?.version ?? null
      const remoteSyncedAt = remoteMeta?.syncedAt ?? null
      const localVersion = localMeta?.version ?? null
      setVersionInfo((prev) => ({
        localVersion: prev?.localVersion ?? localVersion,
        localSyncedAt: prev?.localSyncedAt ?? localMeta?.syncedAt ?? null,
        remoteVersion,
        remoteSyncedAt,
        isOutdated: remoteVersion !== null && localVersion !== null && remoteVersion > localVersion,
        hasLocalChanges: prev?.hasLocalChanges ?? false,
      }))
      setStatus('idle')
    } catch { setStatus('idle') }
  }, [getActiveProvider, localMeta])

  const markLocalChanges = useCallback(async () => {
    if (!localMeta) return
    const updated: LocalVersionMeta = { ...localMeta, lastModifiedAt: Date.now() }
    await storage.local.set(VERSION_KEY, JSON.stringify(updated))
    setLocalMeta(updated)
    setVersionInfo((prev) => prev ? { ...prev, hasLocalChanges: true } : null)
  }, [localMeta, storage])

  return {
    status, activeProvider, lastSyncedAt, errorMsg, loading, versionInfo,
    jsonbin: jsonbinProvider,
    gdrive:  gdriveProvider,
    configureJsonBin, signInGoogle, switchProvider, disconnect,
    push, pull, checkRemoteVersion, markLocalChanges,
  }
}
