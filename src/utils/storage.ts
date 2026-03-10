import type { Account } from '../types'

export function exportVault(accounts: Account[]): void {
  const payload = accounts.map(({ id: _id, ...rest }) => rest)
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `otp-vault-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseVaultJSON(text: string): Omit<Account, 'id'>[] {
  const data: unknown = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('O JSON deve ser um array')

  return (data as Record<string, unknown>[])
    .filter(
      (a) =>
        typeof a.label === 'string' &&
        typeof a.secret === 'string' &&
        a.label.trim().length > 0,
    )
    .map((a) => ({
      issuer: typeof a.issuer === 'string' ? a.issuer.trim() : '',
      label: (a.label as string).trim(),
      secret: (a.secret as string).replace(/\s/g, '').toUpperCase(),
      period: typeof a.period === 'number' ? a.period : 30,
      digits: typeof a.digits === 'number' ? a.digits : 6,
    }))
}
