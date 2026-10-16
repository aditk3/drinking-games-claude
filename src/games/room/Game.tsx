import type { RoomHandle } from '../../lib/room.ts'
import PromptRound from './PromptRound.tsx'
import MiniRound from './MiniRound.tsx'

const KIND_LABEL: Record<string, string> = {
  vote: 'Most likely to',
  nhie: 'Never have I ever',
  wyr: 'Would you rather',
  dare: 'Dare',
  truth: 'Truth',
  rule: 'New rule',
  reaction: 'Reaction',
  taps: 'Tap race',
  hold: 'Hold steady',
  math: 'Quick math',
}

export default function Game({ room }: { room: RoomHandle }) {
  const { state, you, host } = room
  if (!state || !you) return null
  const isHost = state.hostId === you
  const round = state.round
  const sorted = [...state.players].sort((a, b) => b.drinks - a.drinks)
  const roundLog = state.roundLog ?? []

  if (state.phase === 'ended') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <h2 className="font-display text-2xl font-bold">Game over</h2>
        <ol className="flex flex-col gap-1.5">
          {sorted.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="w-5 text-sm text-muted">{i + 1}</span>
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="text-sm">{p.drinks} drinks</span>
            </li>
          ))}
        </ol>
        {isHost && (
          <button type="button" onClick={() => host({ type: 'backToLobby' })} className="rounded-xl bg-accent px-4 py-3 font-bold text-accent-ink">
            Back to lobby
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Round {state.roundCount}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">{round ? KIND_LABEL[round.kind] : ''}</span>
        </div>

        {round && (['reaction', 'taps', 'hold', 'math'].includes(round.kind) ? <MiniRound room={room} /> : <PromptRound room={room} />)}

        {round?.revealed && roundLog.length > 0 && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-4" role="status">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">Result</div>
            {roundLog.map((line, i) => (
              <p key={i} className="mt-1 text-[15px] font-medium">
                {line}
              </p>
            ))}
          </div>
        )}

        {isHost ? (
          <div className="flex gap-2">
            {round && !round.revealed && (
              <button type="button" onClick={() => host({ type: 'reveal' })} className="flex-1 rounded-xl border border-accent px-4 py-3 font-bold text-accent">
                Reveal now
              </button>
            )}
            <button type="button" onClick={() => host({ type: 'next' })} className="flex-1 rounded-xl bg-accent px-4 py-3 font-bold text-accent-ink">
              Next round
            </button>
            <button type="button" onClick={() => host({ type: 'end' })} className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
              End
            </button>
          </div>
        ) : (
          round?.revealed && <p className="text-center text-sm text-muted">Waiting for the host to start the next round.</p>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Drinks so far</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {sorted.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-chill' : 'bg-border'}`} />
                <span className={`flex-1 truncate ${p.id === you ? 'font-bold' : ''}`}>{p.name}</span>
                <span className="tabular-nums text-muted">{p.drinks}</span>
              </li>
            ))}
          </ul>
        </div>
        {state.log.length > roundLog.length && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Earlier</h3>
            <ul className="flex flex-col gap-1.5 text-xs text-muted">
              {state.log
                .slice(0, state.log.length - roundLog.length)
                .reverse()
                .map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
