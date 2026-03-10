import { useState, useCallback } from 'react'

export function useToast(duration = 2400) {
  const [message, setMessage] = useState<string | null>(null)

  const fire = useCallback(
    (msg: string) => {
      setMessage(msg)
      setTimeout(() => setMessage(null), duration)
    },
    [duration],
  )

  return { message, fire }
}
