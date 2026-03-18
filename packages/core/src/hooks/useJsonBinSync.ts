import { useState, useCallback, useRef, useEffect } from 'react'
import type { Account, PasswordEntry, VaultPayload, SyncVersionInfo } from '../types'
import { encryptVault, decryptVault } from '../utils/crypto'
import { useStorage } from '../storage/StorageContext'
import { pushToBin, pullFromBin } from '../utils/jsonbin'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'checking'

const LS_KEY = 'otp_vault_jsonbin_config'
const VERSION_KEY = 'otp_vault_sync_version'

export interface JsonBinConfig {
  apiKey: string
  binId: string | null
}

/** Metadados de versão salvos localmente */
interface LocalVersionMeta {
  version: number
  syncedAt: number
  lastModifiedAt: number  // quando dados locais foram modificados
}

export interface PulledVault {
  accounts: Account[]
  passwords: PasswordEntry[]
  meta?: VaultPayload['meta']
}

export interface UseJsonBinSyncReturn {
  config: JsonBinConfig | null
  status: SyncStatus
  lastSyncedAt: Date | null
  errorMsg: string | null
  loading: boolean
  versionInfo: SyncVersionInfo | null
  configure: (apiKey: string, binId: string | null) => Promise<void>
  disconnect: () => Promise<void>
  push: (accounts: Account[], passwords: PasswordEntry[], password: string) => Promise<boolean>
  pull: (password: string) => Promise<PulledVault | null>
  checkRemoteVersion: (password: string) => Promise<void>
  markLocalChanges: () => Promise<void>
}

function sanitizeBinId(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/\/b\/([a-f0-9]{24})/i)
  if (match) return match[1]
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed
  return trimmed
}

export function useJsonBinSync(): UseJsonBinSyncReturn {
  const storage = useStorage()
  const [config, setConfig] = useState<JsonBinConfig | null>(null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [versionInfo, setVersionInfo] = useState<SyncVersionInfo | null>(null)
  const [localMeta, setLocalMeta] = useState<LocalVersionMeta | null>(null)
  const configRef = useRef<JsonBinConfig | null>(null)

  useEffect(() => { configRef.current = config }, [config])

  // Carregar config e metadados de versão
  useEffect(() => {
    Promise.all([
      storage.sync.get(LS_KEY),
      storage.local.get(VERSION_KEY),
    ]).then(([rawConfig, rawVersion]) => {
      if (rawConfig) {
        try {
          const cfg = JSON.parse(rawConfig) as JsonBinConfig
          if (cfg.binId) cfg.binId = sanitizeBinId(cfg.binId)
          setConfig(cfg)
          configRef.current = cfg
          storage.sync.set(LS_KEY, JSON.stringify(cfg))
        } catch {}
      }
      if (rawVersion) {
        try {
          const meta = JSON.parse(rawVersion) as LocalVersionMeta
          setLocalMeta(meta)
          setLastSyncedAt(new Date(meta.syncedAt))
          setVersionInfo({
            localVersion: meta.version,
            localSyncedAt: meta.syncedAt,
            remoteVersion: null,
            remoteSyncedAt: null,
            isOutdated: false,
            hasLocalChanges: meta.lastModifiedAt > meta.syncedAt,
          })
        } catch {}
      }
      setLoading(false)
    })
  }, [storage])

  const setErr = useCallback((msg: string) => {
    setErrorMsg(msg)
    setStatus('error')
  }, [])

  const configure = useCallback(async (apiKey: string, binId: string | null) => {
    const cleanBinId = binId ? sanitizeBinId(binId) : null
    const cfg: JsonBinConfig = { apiKey: apiKey.trim(), binId: cleanBinId }
    configRef.current = cfg
    setConfig(cfg)
    await storage.sync.set(LS_KEY, JSON.stringify(cfg))
    setStatus('idle')
    setErrorMsg(null)
  }, [storage])

  const disconnect = useCallback(async () => {
    configRef.current = null
    setConfig(null)
    await storage.sync.remove(LS_KEY)
    await storage.local.remove(VERSION_KEY)
    setStatus('idle')
    setErrorMsg(null)
    setLastSyncedAt(null)
    setLocalMeta(null)
    setVersionInfo(null)
  }, [storage])

  const push = useCallback(async (accounts: Account[], passwords: PasswordEntry[], password: string): Promise<boolean> => {
    const cfg = configRef.current
    if (!cfg?.apiKey) { setErr('Configure a API Key primeiro.'); return false }
    setStatus('syncing')
    setErrorMsg(null)
    try {
      const now = Date.now()
      const newVersion = (localMeta?.version ?? 0) + 1
      
      const payload: VaultPayload = {
        meta: {
          version: newVersion,
          syncedAt: now,
          deviceId: await getDeviceId(storage),
        },
        accounts: accounts.map(({ id: _id, ...rest }) => rest),
        passwords: passwords.map(({ id: _id, ...rest }) => rest),
      }
      const encrypted = await encryptVault(payload, password)
      const result = await pushToBin(cfg, encrypted)
      if (!result.ok) { setErr(result.error ?? 'Erro desconhecido'); return false }

      if (result.binId && result.binId !== cfg.binId) {
        const updated: JsonBinConfig = { ...cfg, binId: result.binId }
        configRef.current = updated
        setConfig(updated)
        await storage.sync.set(LS_KEY, JSON.stringify(updated))
      }

      // Salvar metadados locais
      const newMeta: LocalVersionMeta = {
        version: newVersion,
        syncedAt: now,
        lastModifiedAt: now,
      }
      await storage.local.set(VERSION_KEY, JSON.stringify(newMeta))
      setLocalMeta(newMeta)
      setVersionInfo({
        localVersion: newVersion,
        localSyncedAt: now,
        remoteVersion: newVersion,
        remoteSyncedAt: now,
        isOutdated: false,
        hasLocalChanges: false,
      })

      setStatus('ok')
      setLastSyncedAt(new Date(now))
      return true
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao enviar')
      return false
    }
  }, [setErr, storage, localMeta])

  const pull = useCallback(async (password: string): Promise<PulledVault | null> => {
    const cfg = configRef.current
    if (!cfg?.apiKey || !cfg.binId) { setErr('Configure API Key e Bin ID primeiro.'); return null }
    setStatus('syncing')
    setErrorMsg(null)
    try {
      const result = await pullFromBin(cfg)
      if (!result.ok || !result.payload) { setErr(result.error ?? 'Vault vazia'); return null }

      const decrypted = await decryptVault(result.payload, password)
      
      // Compatibilidade: formato antigo (array simples) vs novo (VaultPayload)
      let rawAccounts: Record<string, unknown>[]
      let rawPasswords: Record<string, unknown>[] = []
      let meta: VaultPayload['meta'] | undefined
      
      if (Array.isArray(decrypted)) {
        // Formato antigo: apenas accounts
        rawAccounts = decrypted as Record<string, unknown>[]
      } else if (typeof decrypted === 'object' && decrypted !== null) {
        // Formato novo: VaultPayload
        const payload = decrypted as { accounts?: unknown[]; passwords?: unknown[]; meta?: VaultPayload['meta'] }
        rawAccounts = (payload.accounts ?? []) as Record<string, unknown>[]
        rawPasswords = (payload.passwords ?? []) as Record<string, unknown>[]
        meta = payload.meta
      } else {
        throw new Error('Formato de vault inválido')
      }

      const accounts = rawAccounts.map((a) => ({
        id: crypto.randomUUID(),
        issuer: String(a.issuer ?? ''),
        label: String(a.label ?? ''),
        secret: String(a.secret ?? ''),
        period: Number(a.period ?? 30),
        digits: Number(a.digits ?? 6),
      })) as Account[]

      const passwords = rawPasswords.map((p) => ({
        id: crypto.randomUUID(),
        title: String(p.title ?? ''),
        username: String(p.username ?? ''),
        password: String(p.password ?? ''),
        url: String(p.url ?? ''),
        notes: String(p.notes ?? ''),
        createdAt: Number(p.createdAt ?? Date.now()),
        updatedAt: Number(p.updatedAt ?? Date.now()),
      })) as PasswordEntry[]

      // Atualizar metadados locais
      const now = Date.now()
      const newMeta: LocalVersionMeta = {
        version: meta?.version ?? 1,
        syncedAt: now,
        lastModifiedAt: now,
      }
      await storage.local.set(VERSION_KEY, JSON.stringify(newMeta))
      setLocalMeta(newMeta)
      setVersionInfo({
        localVersion: newMeta.version,
        localSyncedAt: now,
        remoteVersion: meta?.version ?? null,
        remoteSyncedAt: meta?.syncedAt ?? null,
        isOutdated: false,
        hasLocalChanges: false,
      })

      setStatus('ok')
      setLastSyncedAt(new Date(now))
      return { accounts, passwords, meta }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao descriptografar'
      setErr(msg.includes('decrypt') || msg.includes('operation') ? 'Senha incorreta.' : msg)
      return null
    }
  }, [setErr, storage])

  /** Verificar se há versão mais recente no JSONBin (sem baixar dados completos) */
  const checkRemoteVersion = useCallback(async (password: string): Promise<void> => {
    const cfg = configRef.current
    if (!cfg?.apiKey || !cfg.binId) return
    
    setStatus('checking')
    setErrorMsg(null)
    
    try {
      const result = await pullFromBin(cfg)
      if (!result.ok || !result.payload) {
        setStatus('idle')
        return
      }

      const decrypted = await decryptVault(result.payload, password)
      
      let remoteMeta: VaultPayload['meta'] | undefined
      if (typeof decrypted === 'object' && decrypted !== null && !Array.isArray(decrypted)) {
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
    } catch {
      setStatus('idle')
    }
  }, [localMeta])

  /** Marcar que houve mudanças locais desde o último sync */
  const markLocalChanges = useCallback(async () => {
    if (!localMeta) return
    
    const updated: LocalVersionMeta = {
      ...localMeta,
      lastModifiedAt: Date.now(),
    }
    await storage.local.set(VERSION_KEY, JSON.stringify(updated))
    setLocalMeta(updated)
    setVersionInfo((prev) => prev ? { ...prev, hasLocalChanges: true } : null)
  }, [localMeta, storage])

  return { config, status, lastSyncedAt, errorMsg, loading, versionInfo, configure, disconnect, push, pull, checkRemoteVersion, markLocalChanges }
}

/** Gerar/recuperar ID único do dispositivo */
async function getDeviceId(storage: ReturnType<typeof useStorage>): Promise<string> {
  const key = 'otp_vault_device_id'
  let id = await storage.local.get(key)
  if (!id) {
    id = crypto.randomUUID().slice(0, 8)
    await storage.local.set(key, id)
  }
  return id
}
