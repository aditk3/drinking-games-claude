import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSavedName, saveName, useRoom, type RoomHandle } from '../../lib/room.ts'
import Lobby from './Lobby.tsx'
import Game from './Game.tsx'

function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onDone(name.trim())
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent" />
      </label>
      <button type="submit" disabled={!name.trim()} className="rounded-lg bg-accent px-4 py-2.5 font-bold text-accent-ink disabled:opacity-40">
        Join room
      </button>
    </form>
  )
}

function Connected({ room, code }: { room: RoomHandle; code: string }) {
  const { state, status, error } = room
  if (status === 'gone') {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-3 text-center">
        <h2 className="font-display text-xl font-bold">Room {code} is not here</h2>
        <p className="text-sm text-muted">It may have expired, or the code is wrong.</p>
        <Link to="/play/room" className="rounded-lg bg-accent px-4 py-2.5 font-bold text-accent-ink">
          Back
        </Link>
      </div>
    )
  }
  if (!state) return <p className="text-center text-muted">Connecting to room {code}...</p>
  return (
    <div className="flex flex-col gap-3">
      {status === 'reconnecting' && <p className="rounded-lg border border-medium/40 bg-medium/10 px-3 py-2 text-center text-sm">Connection dropped. Reconnecting...</p>}
      {error && <p className="rounded-lg border border-heavy/40 bg-heavy/10 px-3 py-2 text-center text-sm text-heavy">{error}</p>}
      {state.phase === 'lobby' ? <Lobby room={room} /> : <Game room={room} />}
    </div>
  )
}

function Live({ code, name }: { code: string; name: string }) {
  const room = useRoom(code, name)
  return <Connected room={room} code={code} />
}

export default function RoomPage() {
  const { code = '' } = useParams()
  const [name, setName] = useState(getSavedName())
  const upper = code.toUpperCase()
  if (!name) {
    return (
      <NamePrompt
        onDone={(n) => {
          saveName(n)
          setName(n)
        }}
      />
    )
  }
  return <Live code={upper} name={name} />
}
