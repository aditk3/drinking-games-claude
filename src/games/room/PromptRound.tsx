import type { RoomHandle } from '../../lib/room.ts'

function Card({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{eyebrow}</div>}
      <div className="font-display text-xl font-bold leading-snug sm:text-2xl">{children}</div>
    </div>
  )
}

function Waiting({ done, total }: { done: number; total: number }) {
  return (
    <p className="text-center text-sm text-muted">
      {done} of {total} answered. Waiting for the rest.
    </p>
  )
}

const big = 'rounded-xl border px-4 py-4 text-left text-[15px] font-semibold transition'
const idle = `${big} border-border bg-surface hover:border-accent`
const picked = `${big} border-accent bg-accent/15 text-accent`

export default function PromptRound({ room }: { room: RoomHandle }) {
  const { state, you, act } = room
  if (!state || !you || !state.round) return null
  const r = state.round
  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? 'Someone'
  const active = state.players.filter((p) => p.connected)

  switch (r.kind) {
    case 'vote': {
      const mine = r.votes[you]
      const counts = new Map<string, number>()
      for (const t of Object.values(r.votes)) counts.set(t, (counts.get(t) ?? 0) + 1)
      return (
        <div className="flex flex-col gap-3">
          <Card eyebrow="Point at someone">{r.prompt}</Card>
          <div className="grid grid-cols-2 gap-2">
            {state.players.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={r.revealed}
                onClick={() => act({ type: 'vote', target: p.id })}
                className={`${mine === p.id ? picked : idle} flex items-center justify-between disabled:opacity-80`}
              >
                <span>{p.name}</span>
                {r.revealed && <span className="rounded-full bg-surface-2 px-2 text-xs">{counts.get(p.id) ?? 0}</span>}
              </button>
            ))}
          </div>
          {!r.revealed && <Waiting done={Object.keys(r.votes).length} total={active.length} />}
        </div>
      )
    }
    case 'nhie': {
      const mine = r.answers[you]
      return (
        <div className="flex flex-col gap-3">
          <Card>{r.prompt}</Card>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={r.revealed} onClick={() => act({ type: 'nhie', value: true })} className={mine === true ? picked : idle}>
              I have
            </button>
            <button type="button" disabled={r.revealed} onClick={() => act({ type: 'nhie', value: false })} className={mine === false ? picked : idle}>
              Never
            </button>
          </div>
          {r.revealed ? (
            <p className="text-center text-sm text-muted">
              Has: {Object.entries(r.answers).filter(([, v]) => v).map(([id]) => name(id)).join(', ') || 'nobody'}
            </p>
          ) : (
            <Waiting done={Object.keys(r.answers).length} total={active.length} />
          )}
        </div>
      )
    }
    case 'wyr': {
      const mine = r.answers[you]
      const ca = Object.values(r.answers).filter((v) => v === 'a').length
      const cb = Object.values(r.answers).filter((v) => v === 'b').length
      return (
        <div className="flex flex-col gap-3">
          <Card eyebrow="Would you rather">Pick a side. The minority drinks.</Card>
          <div className="grid gap-2">
            <button type="button" disabled={r.revealed} onClick={() => act({ type: 'wyr', value: 'a' })} className={`${mine === 'a' ? picked : idle} flex items-center justify-between`}>
              <span>{r.a}</span>
              {r.revealed && <span className="rounded-full bg-surface-2 px-2 text-xs">{ca}</span>}
            </button>
            <button type="button" disabled={r.revealed} onClick={() => act({ type: 'wyr', value: 'b' })} className={`${mine === 'b' ? picked : idle} flex items-center justify-between`}>
              <span>{r.b}</span>
              {r.revealed && <span className="rounded-full bg-surface-2 px-2 text-xs">{cb}</span>}
            </button>
          </div>
          {!r.revealed && <Waiting done={Object.keys(r.answers).length} total={active.length} />}
        </div>
      )
    }
    case 'dare':
    case 'truth': {
      const isTarget = r.target === you
      const isHost = state.hostId === you
      return (
        <div className="flex flex-col gap-3">
          <Card eyebrow={`${r.kind === 'dare' ? 'Dare' : 'Truth'} for ${isTarget ? 'you' : name(r.target)}`}>{r.text}</Card>
          {r.outcome === null && (isTarget || isHost) && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => act({ type: 'outcome', value: 'did' })} className={`${idle} text-center`}>
                {isTarget ? 'Did it, I hand out 2' : `${name(r.target)} did it`}
              </button>
              <button type="button" onClick={() => act({ type: 'outcome', value: 'drank' })} className={`${idle} text-center text-heavy`}>
                {isTarget ? 'Drink 3 instead' : `${name(r.target)} drinks 3`}
              </button>
            </div>
          )}
          {r.outcome === null && !isTarget && <p className="text-center text-sm text-muted">Everyone watch {name(r.target)}.</p>}
        </div>
      )
    }
    case 'rule':
      return (
        <div className="flex flex-col gap-3">
          <Card eyebrow={`Rule master: ${name(r.master)}`}>{r.text}</Card>
          <p className="text-center text-sm text-muted">This rule lasts until the next rule round. Break it and drink 1.</p>
        </div>
      )
    default:
      return null
  }
}
