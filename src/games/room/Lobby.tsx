import { useState } from 'react'
import type { GameMode } from '../../../shared/types.ts'
import type { Spice } from '../../../shared/content.ts'
import type { RoomHandle } from '../../lib/room.ts'

const MODES: { id: GameMode; title: string; blurb: string }[] = [
  { id: 'mixed', title: 'Mix it up', blurb: 'Prompts and mini-games, shuffled.' },
  { id: 'prompts', title: 'Prompts', blurb: 'Most likely to, never have I ever, would you rather, dares, truths, rules.' },
  { id: 'minigames', title: 'Mini-games', blurb: 'Reaction, tap race, hold steady, quick math. Loser drinks.' },
]

export default function Lobby({ room }: { room: RoomHandle }) {
  const { state, you, host, act } = room
  const [mode, setMode] = useState<GameMode>('mixed')
  const [spice, setSpice] = useState<Spice>('spicy')
  const [copied, setCopied] = useState(false)
  if (!state || !you) return null
  const isHost = state.hostId === you
  const me = state.players.find((p) => p.id === you)
  const connected = state.players.filter((p) => p.connected).length
  const joinUrl = `${location.origin}/play/room/${state.code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Room code</div>
        <div className="font-mono text-5xl font-bold tracking-[0.25em]">{state.code}</div>
        <div className="text-xs text-muted">{joinUrl}</div>
        <button type="button" onClick={copy} className="mt-1 rounded-md border border-border bg-surface px-3 py-1 text-xs font-semibold">
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center justify-between font-display text-lg font-bold">
          Players <span className="text-sm font-medium text-muted">{connected} here</span>
        </h2>
        <ul className="flex flex-col gap-1.5">
          {state.players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${p.connected ? 'bg-chill' : 'bg-border'}`} aria-label={p.connected ? 'connected' : 'away'} />
              <span className={`flex-1 ${p.connected ? '' : 'text-muted'}`}>
                {p.name}
                {p.id === you && <span className="text-muted"> (you)</span>}
              </span>
              {p.id === state.hostId && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">Host</span>}
              {isHost && p.id !== you && (
                <button type="button" onClick={() => host({ type: 'kick', playerId: p.id })} className="text-xs text-muted hover:text-heavy">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {me && (
          <button
            type="button"
            onClick={() => {
              const n = prompt('Your name', me.name)
              if (n && n.trim()) act({ type: 'rename', name: n.trim() })
            }}
            className="self-start text-xs text-muted hover:text-ink"
          >
            Change my name
          </button>
        )}
      </div>

      {isHost ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Pick a mode</h2>
          <div className="flex flex-col gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-xl border p-3 text-left ${mode === m.id ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
              >
                <div className="font-bold">{m.title}</div>
                <div className="text-sm text-muted">{m.blurb}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
            <div>
              <div className="font-bold">Spice</div>
              <div className="text-sm text-muted">{spice === 'spicy' ? 'Sex, exes and drunk stories are in.' : 'Keeps it clean-ish.'}</div>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {(['spicy', 'tame'] as Spice[]).map((sp) => (
                <button key={sp} type="button" onClick={() => setSpice(sp)} className={`rounded-md px-3 py-1 text-sm font-semibold ${spice === sp ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
                  {sp === 'spicy' ? 'Spicy' : 'Tame'}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => host({ type: 'start', mode, spice })} disabled={connected < 2} className="rounded-xl bg-accent px-4 py-3 text-lg font-bold text-accent-ink disabled:opacity-40">
            {connected < 2 ? 'Need at least 2 players' : 'Start'}
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-3 text-center text-sm text-muted">
          Waiting for {state.players.find((p) => p.id === state.hostId)?.name ?? 'the host'} to start.
        </p>
      )}
    </div>
  )
}
