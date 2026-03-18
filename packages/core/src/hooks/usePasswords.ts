import { useState, useEffect, useCallback } from 'react'
import type { PasswordEntry } from '../types'
import { useStorage } from '../storage/StorageContext'
import { encryptVault, decryptVault } from '../utils/crypto'

const KEY = 'otp_vault_passwords_enc'

export type PasswordVaultStatus = 'locked' | 'unlocked' | 'loading'

export function usePasswords() {
  const storage = useStorage()

  const [entries, setEntries] = useState<PasswordEntry[]>([])
  const [status, setStatus] = useState<PasswordVaultStatus>('loading')
  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // On mount: check if vault exists
  useEffect(() => {
    storage.local.get(KEY).then((raw) => {
      setStatus(raw ? 'locked' : 'unlocked') // no vault = first use, start unlocked
    })
  }, [storage])

  // Persist (encrypted) whenever entries change while unlocked
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
      // First use — no vault yet
      setMasterPassword(password)
      setStatus('unlocked')
      return true
    }
    try {
      const decrypted = await decryptVault(raw, password)
      if (!Array.isArray(decrypted)) throw new Error('Formato inválido')
      setEntries(decrypted as PasswordEntry[])
      setMasterPassword(password)
      setStatus('unlocked')
      return true
    } catch {
      setError('Senha incorreta.')
      return false
    }
  }, [storage])

  const lock = useCallback(() => {
    setEntries([])
    setMasterPassword(null)
    setStatus('locked')
    setError(null)
  }, [])

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

  /** Import passwords, merging with existing (skip duplicates by title+username) */
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

  /** Replace all passwords (used by JSONBin pull) */
  const replaceEntries = useCallback((incoming: PasswordEntry[]) => {
    setEntries(incoming)
  }, [])

  return { entries, status, error, masterPassword, unlock, lock, addEntry, updateEntry, deleteEntry, importEntries, replaceEntries }
}
