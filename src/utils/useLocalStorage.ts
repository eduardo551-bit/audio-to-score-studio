import { useState } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  function set(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // storage full ou modo privado
    }
    setValue(next)
  }

  return [value, set]
}
