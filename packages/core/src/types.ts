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
  accounts: Omit<Account, 'id'>[]
  passwords: Omit<PasswordEntry, 'id'>[]
}

export type Tab = 'codes' | 'passwords' | 'sync'
