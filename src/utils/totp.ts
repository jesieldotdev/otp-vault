/**
 * TOTP (Time-based One-Time Password) — RFC 6238
 * Uses WebCrypto API, works fully offline.
 */

function base32Decode(base32: string): Uint8Array {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  const output: number[] = []

  for (const char of clean) {
    const idx = ALPHA.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((value >> bits) & 0xff)
    }
  }

  return new Uint8Array(output)
}

export async function generateTOTP(
  secret: string,
  period = 30,
  digits = 6,
): Promise<string> {
  const key = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / period)

  // Counter as big-endian 64-bit integer
  const buf = new ArrayBuffer(8)
  new DataView(buf).setUint32(4, counter, false)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )

  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, buf))

  // Dynamic truncation
  const offset = mac[mac.length - 1] & 0x0f
  const code =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3]

  return String(code % 10 ** digits).padStart(digits, '0')
}

export function secondsRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

export function isValidBase32(s: string): boolean {
  const clean = s.replace(/\s/g, '')
  return clean.length >= 8 && /^[A-Z2-7]+=*$/i.test(clean)
}
