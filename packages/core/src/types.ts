export interface Account {
  id: string
  issuer: string
  label: string
  secret: string
  period: number
  digits: number
}

export interface PasswordEntry {
  id: string
  title: string       // nome do serviço
  username: string    // login / e-mail
  password: string    // senha (armazenada criptografada em repouso)
  url: string         // URL do serviço
  notes: string       // notas livres
  createdAt: number   // timestamp
  updatedAt: number
}

/** Payload completo da vault para sync/export */
export interface VaultPayload {
  /** Metadados de sincronização */
  meta?: {
    version: number        // Incrementa a cada push
    syncedAt: number       // Timestamp do último push
    deviceId?: string      // ID do dispositivo que fez o push
  }
  accounts: Omit<Account, 'id'>[]
  passwords: Omit<PasswordEntry, 'id'>[]
}

/** Status de sincronização com versão */
export interface SyncVersionInfo {
  localVersion: number | null
  localSyncedAt: number | null
  remoteVersion: number | null
  remoteSyncedAt: number | null
  isOutdated: boolean        // true se remote > local
  hasLocalChanges: boolean   // true se houve mudanças desde último sync
}

export type Tab = 'codes' | 'passwords' | 'sync'
