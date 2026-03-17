import { useState, useEffect } from 'react'
import { generateTOTP, secondsRemaining } from '../utils/totp'

interface UseTotpResult {
  code: string
  rem: number
}

export function useTotp(secret: string, period = 30, digits = 6): UseTotpResult {
  const [code, setCode] = useState('------')
  const [rem, setRem] = useState(secondsRemaining(period))

  useEffect(() => {
    let alive = true

    const tick = async () => {
      const c = await generateTOTP(secret, period, digits).catch(() => 'ERROR!')
      if (alive) {
        setCode(c)
        setRem(secondsRemaining(period))
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [secret, period, digits])

  return { code, rem }
}
