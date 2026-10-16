import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, HostAction, PlayerAction, RoomState, ServerMessage } from '../../shared/types.ts'

const PLAYER_KEY = 'dg.playerId'
const NAME_KEY = 'dg.name'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

/** Stable per-browser player id. */
export function getPlayerId(): string {
  let id = read(PLAYER_KEY)
  if (!id || !/^[a-z0-9-]{8,40}$/i.test(id)) {
    id = crypto.randomUUID()
    write(PLAYER_KEY, id)
  }
  return id
}

export function getSavedName(): string {
  return read(NAME_KEY) ?? ''
}
export function saveName(name: string) {
  write(NAME_KEY, name)
}

export type RoomStatus = 'connecting' | 'open' | 'reconnecting' | 'gone'

export type RoomHandle = {
  state: RoomState | null
  you: string | null
  status: RoomStatus
  error: string | null
  act: (action: PlayerAction) => void
  host: (action: HostAction) => void
  /** Estimated current server time in ms. */
  serverNow: () => number
}

export async function createRoom(): Promise<string> {
  const res = await fetch('/api/rooms', { method: 'POST' })
  if (!res.ok) throw new Error('Could not create a room')
  const data = (await res.json()) as { code: string }
  return data.code
}

export async function roomInfo(code: string): Promise<{ exists: boolean; players: number; phase: string | null }> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`)
  if (!res.ok) throw new Error('Lookup failed')
  return res.json()
}

export function useRoom(code: string, name: string): RoomHandle {
  const [state, setState] = useState<RoomState | null>(null)
  const [you, setYou] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const offsetRef = useRef(0)
  const attemptRef = useRef(0)
  const closedRef = useRef(false)

  useEffect(() => {
    closedRef.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${location.host}/api/rooms/${encodeURIComponent(code)}/ws?playerId=${getPlayerId()}&name=${encodeURIComponent(name)}`
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = () => {
        attemptRef.current = 0
        setStatus('open')
      }
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as ServerMessage
        if (msg.type === 'state') {
          offsetRef.current = msg.serverTime - Date.now()
          setState(msg.state)
          setYou(msg.you)
        } else if (msg.type === 'error') {
          setError(msg.message)
          setTimeout(() => setError(null), 3000)
        }
      }
      ws.onclose = (e) => {
        if (closedRef.current) return
        if (e.code === 1000 && e.reason === 'Room expired') {
          setStatus('gone')
          return
        }
        // A 404 on the upgrade shows up as an immediate close with no open; give up after a few tries.
        attemptRef.current += 1
        if (attemptRef.current > 6 && !state) {
          setStatus('gone')
          return
        }
        setStatus('reconnecting')
        timer = setTimeout(connect, Math.min(10000, 1000 * 2 ** Math.min(attemptRef.current, 4)))
      }
      ws.onerror = () => {
        /* onclose follows */
      }
    }
    connect()
    return () => {
      closedRef.current = true
      clearTimeout(timer)
      wsRef.current?.close(1000, 'leaving')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, name])

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])

  const handle: RoomHandle = {
    state,
    you,
    status,
    error,
    act: useCallback((action: PlayerAction) => send({ type: 'act', action }), [send]),
    host: useCallback((action: HostAction) => send({ type: 'host', action }), [send]),
    serverNow: useCallback(() => Date.now() + offsetRef.current, []),
  }
  if (import.meta.env.DEV) (window as unknown as { __dgRoom?: RoomHandle }).__dgRoom = handle
  return handle
}
