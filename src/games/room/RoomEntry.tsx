import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, getSavedName, roomInfo, saveName } from '../../lib/room.ts'

export default function RoomEntry() {
  const navigate = useNavigate()
  const [name, setName] = useState(getSavedName())
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = name.trim().length > 0

  const create = async () => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      saveName(name.trim())
      const c = await createRoom()
      navigate(`/play/room/${c}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!ready || c.length !== 4) return
    setBusy(true)
    setError(null)
    try {
      saveName(name.trim())
      const info = await roomInfo(c)
      if (!info.exists) {
        setError('No room with that code. Check it with the host.')
        return
      }
      navigate(`/play/room/${c}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="What everyone calls you"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
      </label>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Host a room</h2>
        <p className="text-sm text-muted">You get a 4-letter code. Everyone else types it in on their phone.</p>
        <button type="button" onClick={create} disabled={!ready || busy} className="rounded-lg bg-accent px-4 py-2.5 font-bold text-accent-ink disabled:opacity-40">
          Create room
        </button>
      </div>

      <form onSubmit={join} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Join a room</h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
            placeholder="CODE"
            autoCapitalize="characters"
            autoComplete="off"
            className="w-32 rounded-lg border border-border bg-bg px-3 py-2.5 text-center font-mono text-xl font-bold tracking-[0.3em] outline-none focus:border-accent"
          />
          <button type="submit" disabled={!ready || code.length !== 4 || busy} className="flex-1 rounded-lg border border-accent px-4 py-2.5 font-bold text-accent disabled:opacity-40">
            Join
          </button>
        </div>
      </form>

      {error && <p className="rounded-lg border border-heavy/40 bg-heavy/10 px-3 py-2 text-sm text-heavy">{error}</p>}
      <p className="text-xs text-muted">Everyone needs to reach the same address as this page. On a home network that means the host's computer address, not localhost.</p>
    </div>
  )
}
