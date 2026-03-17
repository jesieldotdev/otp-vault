const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER  = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

export interface GeneratorOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
}

export function generatePassword(opts: GeneratorOptions): string {
  let charset = ''
  const required: string[] = []

  if (opts.upper)   { charset += UPPER;   required.push(pick(UPPER)) }
  if (opts.lower)   { charset += LOWER;   required.push(pick(LOWER)) }
  if (opts.digits)  { charset += DIGITS;  required.push(pick(DIGITS)) }
  if (opts.symbols) { charset += SYMBOLS; required.push(pick(SYMBOLS)) }

  if (!charset) charset = LOWER + DIGITS

  const arr = new Uint32Array(opts.length)
  crypto.getRandomValues(arr)

  const result = Array.from(arr).map((n) => charset[n % charset.length])

  // Inject required chars at random positions
  required.forEach((ch, i) => {
    const pos = arr[i] % opts.length
    result[pos] = ch
  })

  return result.join('')
}

function pick(charset: string): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return charset[arr[0] % charset.length]
}

export function passwordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Fraca',   color: '#f87171' }
  if (score <= 4) return { score, label: 'Média',   color: '#fb923c' }
  if (score <= 5) return { score, label: 'Boa',     color: '#facc15' }
  return           { score, label: 'Forte',   color: '#34d399' }
}
