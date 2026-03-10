import { useState, useCallback, useRef, useEffect } from 'react'
import type { Account } from '../types'
import { encryptVault, decryptVault } from '../utils/crypto'
import {
  pushToBin,
  pullFromBin,
  loadJsonBinConfig,
  saveJsonBinConfig,
  sanitizeBinId,
  type JsonBinConfig,
} from '../utils/jsonbin'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

export interface UseJsonBinSyncReturn {
  config: JsonBinConfig | null
  status: SyncStatus
  lastSyncedAt: Date | null
  errorMsg: string | null
  configure: (apiKey: string, binId: string | null) => void
  disconnect: () => void
  push: (accounts: Account[], password: string) => Promise<boolean>
  pull: (password: string) => Promise<Account[] | null>
}

export function useJsonBinSync(): UseJsonBinSyncReturn {
  const [config, setConfig] = useState<JsonBinConfig | null>(() => {
    const cfg = loadJsonBinConfig()
    if (cfg?.binId) {
      cfg.binId = sanitizeBinId(cfg.binId)
      saveJsonBinConfig(cfg) // persiste versão sanitizada
    }
    return cfg
  })

  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Ref sempre espelha o estado mais recente do config
  const configRef = useRef<JsonBinConfig | null>(null)

  // Sincroniza o ref toda vez que o state muda
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Inicializa o ref imediatamente com o valor carregado do localStorage
  // (useEffect roda depois do render, então precisamos do valor inicial aqui)
  if (configRef.current === null && config !== null) {
    configRef.current = config
  }

  const setErr = useCallback((msg: string) => {
    setErrorMsg(msg)
    setStatus('error')
  }, [])

  const configure = useCallback((apiKey: string, binId: string | null) => {
    const cleanBinId = binId ? sanitizeBinId(binId) : null
    const cfg: JsonBinConfig = { apiKey: apiKey.trim(), binId: cleanBinId }
    configRef.current = cfg
    setConfig(cfg)
    saveJsonBinConfig(cfg)
    setStatus('idle')
    setErrorMsg(null)
  }, [])

  const disconnect = useCallback(() => {
    configRef.current = null
    setConfig(null)
    localStorage.removeItem('otp_vault_jsonbin_config')
    setStatus('idle')
    setErrorMsg(null)
    setLastSyncedAt(null)
  }, [])

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

      // Persiste binId se foi criado agora
      if (result.binId && result.binId !== cfg.binId) {
        const updated: JsonBinConfig = { ...cfg, binId: result.binId }
        configRef.current = updated
        setConfig(updated)
        saveJsonBinConfig(updated)
      }

      setStatus('ok')
      setLastSyncedAt(new Date())
      return true
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao enviar')
      return false
    }
  }, [setErr])

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

  return { config, status, lastSyncedAt, errorMsg, configure, disconnect, push, pull }
}
