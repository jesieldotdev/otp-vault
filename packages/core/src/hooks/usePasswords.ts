import { useState, useEffect, useCallback } from 'react'
import type { PasswordEntry } from '../types'
import { useStorage } from '../storage/StorageContext'
import { encryptVault, decryptVault } from '../utils/crypto'

const KEY         = 'otp_vault_passwords_enc'
const SESSION_KEY = 'otp_vault_pw_session'   // senha mestre em cache de sessão

export type PasswordVaultStatus = 'locked' | 'unlocked' | 'loading' | 'first-use'

export function usePasswords() {
  const storage = useStorage()

  const [entries,        setEntries]        = useState<PasswordEntry[]>([])
  const [status,         setStatus]         = useState<PasswordVaultStatus>('loading')
  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  const [error,          setError]          = useState<string | null>(null)

  // On mount: tenta desbloquear automaticamente via cache de sessão
  useEffect(() => {
    const init = async () => {
      const raw     = await storage.local.get(KEY)
      const cached  = await storage.session.get(SESSION_KEY)

      if (!raw) {
        // Sem vault — primeiro uso
        if (cached) {
          // Sessão tem senha — já define como desbloqueado com a senha cacheada
          setMasterPassword(cached)
          setStatus('unlocked')
        } else {
          setStatus('first-use')
        }
        return
      }

      if (cached) {
        // Tenta desbloquear silenciosamente com a senha cacheada
        try {
          const decrypted = await decryptVault(raw, cached)
          if (!Array.isArray(decrypted)) throw new Error()
          setEntries(decrypted as PasswordEntry[])
          setMasterPassword(cached)
          setStatus('unlocked')
          return
        } catch {
          // Senha cacheada inválida (vault foi recriado?) — limpa cache
          await storage.session.remove(SESSION_KEY)
        }
      }

      setStatus('locked')
    }
    init()
  }, [storage])

  // Persiste (criptografado) sempre que entries mudar enquanto desbloqueado
  useEffect(() => {
    if (status !== 'unlocked' || masterPassword === null) return
    encryptVault(entries, masterPassword).then((enc) => {
      storage.local.set(KEY, enc)
    })
  }, [entries, status, masterPassword, storage])

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    setError(null)
    const raw = await storage.local.get(KEY)

    if (!raw) {
      // Primeiro uso — define a senha mestre
      setMasterPassword(password)
      setStatus('unlocked')
      await storage.session.set(SESSION_KEY, password)
      return true
    }

    try {
      const decrypted = await decryptVault(raw, password)
      if (!Array.isArray(decrypted)) throw new Error('Formato inválido')
      setEntries(decrypted as PasswordEntry[])
      setMasterPassword(password)
      setStatus('unlocked')
      // Cacheia na sessão — próxima abertura do popup desbloqueia automaticamente
      await storage.session.set(SESSION_KEY, password)
      return true
    } catch {
      setError('Senha incorreta.')
      return false
    }
  }, [storage])

  const lock = useCallback(async () => {
    setEntries([])
    setMasterPassword(null)
    setStatus('locked')
    setError(null)
    // Limpa o cache de sessão — exige senha na próxima vez
    await storage.session.remove(SESSION_KEY)
  }, [storage])

  const addEntry = useCallback((data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now()
    setEntries((prev) => [...prev, { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }])
  }, [])

  const updateEntry = useCallback((id: string, data: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const importEntries = useCallback((incoming: Omit<PasswordEntry, 'id'>[]): number => {
    const existingKeys = new Set(entries.map((e) => `${e.title}::${e.username}`))
    const news = incoming
      .filter((e) => !existingKeys.has(`${e.title}::${e.username}`))
      .map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        createdAt: e.createdAt ?? Date.now(),
        updatedAt: e.updatedAt ?? Date.now(),
      }))
    setEntries((prev) => [...prev, ...news])
    return news.length
  }, [entries])

  const replaceEntries = useCallback((incoming: PasswordEntry[]) => {
    setEntries(incoming)
  }, [])

  return { entries, status, error, masterPassword, unlock, lock, addEntry, updateEntry, deleteEntry, importEntries, replaceEntries }
}