import { useState, useCallback, useRef, useEffect } from 'react'
import type { Account } from '../types'
import { encryptVault, decryptVault } from '../utils/crypto'
import { useStorage } from '../storage/StorageContext'
import { pushToBin, pullFromBin } from '../utils/jsonbin'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

const LS_KEY = 'otp_vault_jsonbin_config'

export interface JsonBinConfig {
  apiKey: string
  binId: string | null
}

export interface UseJsonBinSyncReturn {
  config: JsonBinConfig | null
  status: SyncStatus
  lastSyncedAt: Date | null
  errorMsg: string | null
  loading: boolean
  configure: (apiKey: string, binId: string | null) => Promise<void>
  disconnect: () => Promise<void>
  push: (accounts: Account[], password: string) => Promise<boolean>
  pull: (password: string) => Promise<Account[] | null>
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
  const configRef = useRef<JsonBinConfig | null>(null)

  useEffect(() => { configRef.current = config }, [config])

  useEffect(() => {
    storage.sync.get(LS_KEY).then((raw) => {
      if (raw) {
        try {
          const cfg = JSON.parse(raw) as JsonBinConfig
          if (cfg.binId) cfg.binId = sanitizeBinId(cfg.binId)
          setConfig(cfg)
          configRef.current = cfg
          storage.sync.set(LS_KEY, JSON.stringify(cfg)) // persist sanitized
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
    setStatus('idle')
    setErrorMsg(null)
    setLastSyncedAt(null)
  }, [storage])

  const push = useCallback(async (accounts: Account[], password: string): Promise<boolean> => {
    const cfg = configRef.current
    if (!cfg?.apiKey) { setErr('Configure a API Key primeiro.'); return false }
    setStatus('syncing')
    setErrorMsg(null)
    try {
      const encrypted = await encryptVault(
        accounts.map(({ id: _id, ...rest }) => rest),
        password,
      )
      const result = await pushToBin(cfg, encrypted)
      if (!result.ok) { setErr(result.error ?? 'Erro desconhecido'); return false }

      if (result.binId && result.binId !== cfg.binId) {
        const updated: JsonBinConfig = { ...cfg, binId: result.binId }
        configRef.current = updated
        setConfig(updated)
        await storage.sync.set(LS_KEY, JSON.stringify(updated))
      }

      setStatus('ok')
      setLastSyncedAt(new Date())
      return true
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao enviar')
      return false
    }
  }, [setErr, storage])

  const pull = useCallback(async (password: string): Promise<Account[] | null> => {
    const cfg = configRef.current
    if (!cfg?.apiKey || !cfg.binId) { setErr('Configure API Key e Bin ID primeiro.'); return null }
    setStatus('syncing')
    setErrorMsg(null)
    try {
      const result = await pullFromBin(cfg)
      if (!result.ok || !result.payload) { setErr(result.error ?? 'Vault vazia'); return null }

      const decrypted = await decryptVault(result.payload, password)
      if (!Array.isArray(decrypted)) throw new Error('Formato de vault inválido')

      const accounts = (decrypted as Record<string, unknown>[]).map((a) => ({
        id: crypto.randomUUID(),
        issuer: String(a.issuer ?? ''),
        label: String(a.label ?? ''),
        secret: String(a.secret ?? ''),
        period: Number(a.period ?? 30),
        digits: Number(a.digits ?? 6),
      })) as Account[]

      setStatus('ok')
      setLastSyncedAt(new Date())
      return accounts
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao descriptografar'
      setErr(msg.includes('decrypt') || msg.includes('operation') ? 'Senha incorreta.' : msg)
      return null
    }
  }, [setErr])

  return { config, status, lastSyncedAt, errorMsg, loading, configure, disconnect, push, pull }
}
