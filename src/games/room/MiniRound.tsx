import { useEffect, useRef, useState } from 'react'
import type { Round } from '../../../shared/types.ts'
import type { RoomHandle } from '../../lib/room.ts'

type Of<K extends Round['kind']> = Extract<Round, { kind: K }>

function Ranking({ rows }: { rows: { name: string; value: string; bad?: boolean }[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <li key={i} className={`flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm ${r.bad ? 'text-heavy' : ''}`}>
          <span className="w-5 text-muted">{i + 1}</span>
          <span className="flex-1 font-medium">{r.name}</span>
          <span className="tabular-nums">{r.value}</span>
        </li>
      ))}
    </ol>
  )
}

const bigBtn = 'w-full rounded-2xl px-4 py-16 text-center font-display text-3xl font-bold shadow-lg shadow-black/20 select-none touch-manipulation'

function useName(room: RoomHandle) {
  return (id: string) => room.state?.players.find((p) => p.id === id)?.name ?? '?'
}

function Reaction({ room, r }: { room: RoomHandle; r: Of<'reaction'> }) {
  const { you, act } = room
  const goSeen = useRef<number | null>(null)
  const [mine, setMine] = useState<number | null>(you && you in r.results ? r.results[you] : null)
  const name = useName(room)
  useEffect(() => {
    if (r.goAt !== null && goSeen.current === null) goSeen.current = performance.now()
  }, [r.goAt])
  const tap = () => {
    if (mine !== null) return
    const ms = goSeen.current === null ? -1 : Math.round(performance.now() - goSeen.current)
    setMine(ms)
    act({ type: 'reaction', ms: ms < 0 ? 0 : ms })
  }
  if (r.revealed) {
    const rows = Object.entries(r.results)
      .map(([id, ms]) => ({ id, ms }))
      .sort((a, b) => (a.ms < 0 ? 1 : b.ms < 0 ? -1 : a.ms - b.ms))
      .map((x) => ({ name: name(x.id), value: x.ms < 0 ? 'false start' : `${x.ms} ms`, bad: x.ms < 0 }))
    return <Ranking rows={rows} />
  }
  if (mine !== null) return <div className={`${bigBtn} bg-surface-2 text-muted`}>{mine < 0 ? 'Too early' : `${mine} ms`}</div>
  const go = r.goAt !== null
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted">Tap the box the moment it turns green. Tap early and you are last.</p>
      <button type="button" onPointerDown={tap} className={`${bigBtn} ${go ? 'bg-chill text-black' : 'bg-heavy/80 text-white'}`}>
        {go ? 'TAP!' : 'Wait...'}
      </button>
    </div>
  )
}

function Taps({ room, r }: { room: RoomHandle; r: Of<'taps'> }) {
  const { you, act, serverNow } = room
  const [count, setCount] = useState(0)
  const [now, setNow] = useState(serverNow())
  const sent = useRef(false)
  const countRef = useRef(0)
  const name = useName(room)
  useEffect(() => {
    countRef.current = count
  }, [count])
  const startAt = r.endsAt - r.seconds * 1000
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 100)
    return () => clearInterval(t)
  }, [serverNow])
  const answered = you !== null && you in r.results
  useEffect(() => {
    if (now >= r.endsAt && !sent.current && !r.revealed && !answered) {
      sent.current = true
      act({ type: 'taps', count: countRef.current })
    }
  }, [now, r.endsAt, r.revealed, answered, act])
  if (r.revealed) {
    const rows = Object.entries(r.results)
      .sort((a, b) => b[1] - a[1])
      .map(([id, c]) => ({ name: name(id), value: `${c} taps` }))
    return <Ranking rows={rows} />
  }
  if (now < startAt) return <div className={`${bigBtn} bg-surface-2`}>Ready in {Math.ceil((startAt - now) / 1000)}</div>
  if (now >= r.endsAt) return <div className={`${bigBtn} bg-surface-2 text-muted`}>{count} taps</div>
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm text-muted">{((r.endsAt - now) / 1000).toFixed(1)} s left</p>
      <button type="button" onPointerDown={() => setCount((c) => c + 1)} className={`${bigBtn} bg-accent text-accent-ink`}>
        {count}
      </button>
    </div>
  )
}

function Hold({ room, r }: { room: RoomHandle; r: Of<'hold'> }) {
  const { you, act } = room
  const [holding, setHolding] = useState(false)
  const [mine, setMine] = useState<number | null>(you && you in r.results ? r.results[you] : null)
  const downAt = useRef(0)
  const name = useName(room)
  const down = () => {
    if (mine !== null) return
    downAt.current = performance.now()
    setHolding(true)
  }
  const up = () => {
    if (!holding || mine !== null) return
    const ms = Math.round(performance.now() - downAt.current)
    setHolding(false)
    setMine(ms)
    act({ type: 'hold', ms })
  }
  if (r.revealed) {
    const rows = Object.entries(r.results)
      .sort((a, b) => Math.abs(a[1] - r.targetMs) - Math.abs(b[1] - r.targetMs))
      .map(([id, ms]) => ({ name: name(id), value: `${(ms / 1000).toFixed(2)} s` }))
    return (
      <div className="flex flex-col gap-2">
        <p className="text-center text-sm text-muted">Target was {r.targetMs / 1000} s</p>
        <Ranking rows={rows} />
      </div>
    )
  }
  if (mine !== null) return <div className={`${bigBtn} bg-surface-2 text-muted`}>Locked in</div>
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted">
        Hold the button and let go at exactly <strong className="text-ink">{r.targetMs / 1000} seconds</strong>. No clocks allowed.
      </p>
      <button
        type="button"
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        className={`${bigBtn} ${holding ? 'bg-mixed text-white' : 'bg-accent text-accent-ink'}`}
      >
        {holding ? 'Holding...' : 'Hold me'}
      </button>
    </div>
  )
}

function MathRound({ room, r }: { room: RoomHandle; r: Of<'math'> }) {
  const { you, act } = room
  const [value, setValue] = useState('')
  const name = useName(room)
  const mine = you ? r.results[you] : undefined
  if (r.revealed) {
    const rows = Object.entries(r.results)
      .sort((a, b) => (a[1].answer === r.answer ? (b[1].answer === r.answer ? a[1].at - b[1].at : -1) : 1))
      .map(([id, x]) => ({ name: name(id), value: x.answer === r.answer ? `${x.answer}, right` : `${x.answer}, wrong`, bad: x.answer !== r.answer }))
    return (
      <div className="flex flex-col gap-2">
        <p className="text-center text-sm text-muted">
          {r.question} = {r.answer}
        </p>
        <Ranking rows={rows} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center font-display text-4xl font-bold">{r.question}</div>
      {mine ? (
        <p className="text-center text-sm text-muted">You said {mine.answer}. Waiting for the others.</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim() !== '') act({ type: 'math', answer: Number(value) })
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
            inputMode="numeric"
            autoFocus
            placeholder="Answer"
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-center text-2xl font-bold outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-xl bg-accent px-5 py-3 font-bold text-accent-ink">
            Go
          </button>
        </form>
      )}
    </div>
  )
}

/** Each mini-game is keyed by round id so it remounts with fresh local state every round. */
export default function MiniRound({ room }: { room: RoomHandle }) {
  const r = room.state?.round
  if (!r) return null
  switch (r.kind) {
    case 'reaction':
      return <Reaction key={r.id} room={room} r={r} />
    case 'taps':
      return <Taps key={r.id} room={room} r={r} />
    case 'hold':
      return <Hold key={r.id} room={room} r={r} />
    case 'math':
      return <MathRound key={r.id} room={room} r={r} />
    default:
      return null
  }
}
