'use client'

import { useState, useEffect, useCallback } from 'react'

const isBrowser = typeof window !== 'undefined'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isBrowser) return
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        setValue(JSON.parse(raw) as T)
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true)
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        if (isBrowser) {
          try {
            window.localStorage.setItem(key, JSON.stringify(resolved))
          } catch {
            // ignore quota errors
          }
        }
        return resolved
      })
    },
    [key]
  )

  return [value, update, loaded] as const
}
