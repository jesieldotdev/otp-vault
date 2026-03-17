import { createContext, useContext, type ReactNode } from 'react'
import type { StorageAdapter } from './StorageAdapter'

const StorageContext = createContext<StorageAdapter | null>(null)

export function StorageProvider({ adapter, children }: { adapter: StorageAdapter; children: ReactNode }) {
  return <StorageContext.Provider value={adapter}>{children}</StorageContext.Provider>
}

export function useStorage(): StorageAdapter {
  const ctx = useContext(StorageContext)
  if (!ctx) throw new Error('useStorage must be used inside <StorageProvider>')
  return ctx
}
