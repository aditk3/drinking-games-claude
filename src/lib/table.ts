import { useState } from 'react'

const KEY = 'dg.tableNames'
export const TOKEN_COLORS = ['#f5b544', '#5ed49b', '#f87171', '#b49cff', '#60a5fa', '#f472b6', '#fb923c', '#34d399']

/** Names of the people around the table, for the single-phone games. Persisted in this browser. */
export function useTableNames(): [string[], (names: string[]) => void] {
  const [names, setNamesState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []
    } catch {
      return []
    }
  })
  const setNames = (next: string[]) => {
    setNamesState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  return [names, setNames]
}

export function randomOf<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}
