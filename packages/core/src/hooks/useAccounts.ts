import { useState, useEffect, useCallback } from 'react'
import type { Account } from '../types'
import { useStorage } from '../storage/StorageContext'

const KEY = 'otp_vault_accounts'

export function useAccounts() {
  const storage = useStorage()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    storage.local.get(KEY).then((raw) => {
      if (raw) {
        try { setAccounts(JSON.parse(raw)) } catch {}
      }
      setLoaded(true)
    })
  }, [storage])

  useEffect(() => {
    if (!loaded) return
    storage.local.set(KEY, JSON.stringify(accounts))
  }, [accounts, loaded, storage])

  const addAccount = useCallback((data: Omit<Account, 'id'>) => {
    setAccounts((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const importAccounts = useCallback((incoming: Omit<Account, 'id'>[]): number => {
    let count = 0
    setAccounts((prev) => {
      const existingSecrets = new Set(prev.map((a) => a.secret))
      const news = incoming
        .filter((a) => !existingSecrets.has(a.secret))
        .map((a) => ({ ...a, id: crypto.randomUUID() }))
      count = news.length
      return [...prev, ...news]
    })
    return count
  }, [])

  const replaceAccounts = useCallback((incoming: Account[]) => {
    setAccounts(incoming)
  }, [])

  return { accounts, loaded, addAccount, deleteAccount, importAccounts, replaceAccounts }
}
