export interface Account {
  id: string
  issuer: string
  label: string
  secret: string
  period: number
  digits: number
}

export type Tab = 'codes' | 'sync'
