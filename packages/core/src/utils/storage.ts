import type { Account, PasswordEntry, VaultPayload } from '../types'

export interface ParsedVault {
  accounts: Omit<Account, 'id'>[]
  passwords: Omit<PasswordEntry, 'id'>[]
}

export function exportVault(accounts: Account[], passwords: PasswordEntry[]): void {
  const payload: VaultPayload = {
    accounts: accounts.map(({ id: _id, ...rest }) => rest),
    passwords: passwords.map(({ id: _id, ...rest }) => rest),
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `otp-vault-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseVaultJSON(text: string): ParsedVault {
  const data: unknown = JSON.parse(text)
  
  // Compatibilidade: formato antigo (array simples) vs novo (VaultPayload)
  let rawAccounts: Record<string, unknown>[]
  let rawPasswords: Record<string, unknown>[] = []
  
  if (Array.isArray(data)) {
    // Formato antigo: apenas accounts
    rawAccounts = data as Record<string, unknown>[]
  } else if (typeof data === 'object' && data !== null) {
    // Formato novo: VaultPayload
    const payload = data as { accounts?: unknown[]; passwords?: unknown[] }
    if (!Array.isArray(payload.accounts)) throw new Error('O JSON deve ter um array "accounts"')
    rawAccounts = payload.accounts as Record<string, unknown>[]
    rawPasswords = (payload.passwords ?? []) as Record<string, unknown>[]
  } else {
    throw new Error('O JSON deve ser um objeto com "accounts" e "passwords"')
  }

  const accounts = rawAccounts
    .filter(
      (a) =>
        typeof a.label === 'string' &&
        typeof a.secret === 'string' &&
        (a.label as string).trim().length > 0,
    )
    .map((a) => ({
      issuer: typeof a.issuer === 'string' ? a.issuer.trim() : '',
      label: (a.label as string).trim(),
      secret: (a.secret as string).replace(/\s/g, '').toUpperCase(),
      period: typeof a.period === 'number' ? a.period : 30,
      digits: typeof a.digits === 'number' ? a.digits : 6,
    }))

  const passwords = rawPasswords
    .filter((p) => typeof p.title === 'string' && (p.title as string).trim().length > 0)
    .map((p) => ({
      title: (p.title as string).trim(),
      username: typeof p.username === 'string' ? p.username : '',
      password: typeof p.password === 'string' ? p.password : '',
      url: typeof p.url === 'string' ? p.url : '',
      notes: typeof p.notes === 'string' ? p.notes : '',
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    }))

  return { accounts, passwords }
}
