import { useRef, useState } from 'react'
import { BOARD, CHANCE, DARES, RULES, TRUTHS, type Square } from '../../../shared/content.ts'
import PlayerSetup from '../../components/PlayerSetup.tsx'
import { TOKEN_COLORS, randomOf, useTableNames } from '../../lib/table.ts'

type Token = { name: string; color: string; pos: number; laps: number; skip: boolean }
type Modal = { title: string; body: string; extra?: string; after?: () => Promise<void> | void }

const N = BOARD.length // 24, laid out as a 7x7 ring
const SIDE = 7

function cell(i: number): { row: number; col: number } {
  if (i < 7) return { row: 0, col: i }
  if (i < 12) return { row: i - 6, col: 6 }
  if (i < 19) return { row: 6, col: 18 - i }
  return { row: 24 - i, col: 0 }
}

const TYPE_STYLE: Record<Square['type'], string> = {
  start: 'bg-accent text-accent-ink',
  drink: 'bg-heavy/80 text-white',
  give: 'bg-chill/80 text-black',
  all: 'bg-mixed/80 text-white',
  waterfall: 'bg-mixed text-white',
  truth: 'bg-surface-2 text-ink',
  dare: 'bg-surface-2 text-ink',
  rule: 'bg-surface-2 text-ink',
  chance: 'bg-medium/80 text-black',
  safe: 'bg-surface text-muted',
  skip: 'bg-surface text-muted',
  again: 'bg-surface text-ink',
  back: 'bg-surface text-ink',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Board() {
  const [names, setNames] = useTableNames()
  const [lapsToWin, setLapsToWin] = useState(2)
  const [tokens, setTokens] = useState<Token[] | null>(null)
  const [turn, setTurn] = useState(0)
  const [die, setDie] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const tokensRef = useRef<Token[]>([])

  const start = () => {
    const t = names.map((name, i) => ({ name, color: TOKEN_COLORS[i % TOKEN_COLORS.length], pos: 0, laps: 0, skip: false }))
    tokensRef.current = t
    setTokens(t)
    setTurn(0)
    setDie(null)
    setWinner(null)
    setLog([])
    setModal(null)
  }

  const commit = (next: Token[]) => {
    tokensRef.current = next
    setTokens(next)
  }

  const update = (i: number, patch: Partial<Token>) => {
    commit(tokensRef.current.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  }

  const addLog = (line: string) => setLog((l) => [line, ...l].slice(0, 10))

  /** Moves one token step by step. Returns how many times it passed Start. */
  const step = async (i: number, steps: number): Promise<number> => {
    let passed = 0
    const dir = Math.sign(steps)
    for (let k = 0; k < Math.abs(steps); k++) {
      const t = tokensRef.current[i]
      let pos = t.pos + dir
      let laps = t.laps
      if (pos >= N) {
        pos = 0
        laps += 1
        passed += 1
      }
      if (pos < 0) pos = 0
      update(i, { pos, laps })
      await sleep(220)
      if (pos === 0 && dir < 0) break
    }
    return passed
  }

  const nextTurn = (from: number) => {
    const t = tokensRef.current
    let n = (from + 1) % t.length
    if (t[n].skip) {
      update(n, { skip: false })
      addLog(`${t[n].name} skips a turn.`)
      n = (n + 1) % t.length
    }
    setTurn(n)
    setDie(null)
  }

  const resolve = async (i: number, fromChance = false): Promise<void> => {
    const t = tokensRef.current[i]
    const sq = BOARD[t.pos]
    const me = t.name
    const others = tokensRef.current.filter((_, j) => j !== i).map((x) => x.name)
    const finish = (m: Omit<Modal, 'after'> & { after?: Modal['after'] }) =>
      new Promise<void>((done) => {
        setModal({
          ...m,
          after: async () => {
            setModal(null)
            if (m.after) await m.after()
            done()
          },
        })
      })

    switch (sq.type) {
      case 'start':
        return finish({ title: 'Landed on Start', body: `${me} hands out 2.` })
      case 'drink':
        return finish({ title: `Drink ${sq.n}`, body: `${me} drinks ${sq.n}.` })
      case 'give':
        return finish({ title: `Give ${sq.n}`, body: `${me} hands out ${sq.n} to anyone.` })
      case 'all':
        return finish({ title: 'Everyone drinks', body: 'Everyone at the table drinks 1.' })
      case 'waterfall':
        return finish({ title: 'Waterfall', body: `${me} starts. Nobody can stop drinking until the person on their right stops.` })
      case 'truth':
        return finish({ title: 'Truth', body: randomOf(TRUTHS).text, extra: 'Answer honestly or drink 2.' })
      case 'dare':
        return finish({ title: 'Dare', body: randomOf(DARES).text.replace('{player}', others.length ? randomOf(others) : 'someone'), extra: 'Do it or drink 3.' })
      case 'rule':
        return finish({ title: 'Make a rule', body: `${me} makes a rule that lasts until the next rule.`, extra: `Need an idea? ${randomOf(RULES).text}` })
      case 'safe':
        return finish({ title: 'Safe', body: 'Nothing happens. Breathe.' })
      case 'skip':
        update(i, { skip: true })
        return finish({ title: 'Skip', body: `${me} misses their next turn.` })
      case 'again':
        return finish({ title: 'Roll again', body: `${me} rolls again right away.` })
      case 'back':
        return finish({
          title: 'Back 3',
          body: `${me} moves back 3 squares.`,
          after: async () => {
            await step(i, -3)
            await resolve(i, true)
          },
        })
      case 'chance': {
        if (fromChance) return finish({ title: 'Chance', body: 'Already moved by a card this turn. Nothing more happens.' })
        const card = randomOf(CHANCE)
        let after: Modal['after']
        if (card.move === -100) {
          after = async () => {
            update(i, { pos: 0 })
          }
        } else if (card.move === 0) {
          after = async () => {
            let steps = 1
            while (BOARD[(t.pos + steps) % N].type !== 'safe') steps++
            await step(i, steps)
          }
        } else if (card.move) {
          const mv = card.move
          after = async () => {
            await step(i, mv)
            if (mv > 0) await resolve(i, true)
          }
        }
        return finish({ title: 'Chance', body: card.text, after })
      }
    }
  }

  const roll = async () => {
    if (busy || !tokens || winner) return
    setBusy(true)
    const i = turn
    for (let k = 0; k < 8; k++) {
      setDie(1 + Math.floor(Math.random() * 6))
      await sleep(70)
    }
    const value = 1 + Math.floor(Math.random() * 6)
    setDie(value)
    await sleep(350)
    const passed = await step(i, value)
    const t = tokensRef.current[i]
    if (passed > 0) {
      addLog(`${t.name} passed Start and hands out 1.`)
      if (t.laps >= lapsToWin) {
        setWinner(t.name)
        setBusy(false)
        return
      }
    }
    await resolve(i)
    const landedAgain = BOARD[tokensRef.current[i].pos].type === 'again'
    addLog(`${t.name} rolled ${value}: ${BOARD[tokensRef.current[i].pos].label}.`)
    if (!landedAgain) nextTurn(i)
    else setDie(null)
    setBusy(false)
  }

  if (!tokens) {
    return (
      <PlayerSetup names={names} onChange={setNames} min={2} onStart={start} startLabel="Start the board">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
          <span>Laps to win</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLapsToWin(n)}
                className={`h-8 w-8 rounded-md text-sm font-bold ${lapsToWin === n ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted">Pass the phone around. Tap Roll on your turn, move, and do what the square says. First to finish the laps wins; everyone else finishes their drink.</p>
      </PlayerSetup>
    )
  }

  const current = tokens[turn]

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${SIDE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${SIDE}, minmax(0, 1fr))` }}>
        {BOARD.map((sq, i) => {
          const { row, col } = cell(i)
          const here = tokens.map((t, j) => ({ ...t, j })).filter((t) => t.pos === i)
          return (
            <div
              key={i}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-md border border-border/60 p-0.5 text-center text-[10px] font-bold leading-tight ${TYPE_STYLE[sq.type]}`}
            >
              <span>{sq.label}</span>
              {sq.n && <span className="text-[9px] opacity-80">{sq.n}</span>}
              {here.length > 0 && (
                <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {here.map((t) => (
                    <span key={t.j} className="h-3 w-3 rounded-full border-2 border-bg shadow" style={{ background: t.color }} title={t.name} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div className="col-start-2 col-end-7 row-start-2 row-end-7 flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-2">
          <div className="text-center text-xs text-muted">{winner ? 'Winner' : 'Up now'}</div>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: winner ? tokens.find((t) => t.name === winner)?.color : current.color }} />
            {winner ?? current.name}
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-xl border-2 border-border bg-bg font-display text-3xl font-bold" aria-live="polite">
            {die ?? '?'}
          </div>
          {winner ? (
            <button type="button" onClick={start} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-accent-ink">
              Play again
            </button>
          ) : (
            <button type="button" onClick={roll} disabled={busy || modal !== null} className="rounded-lg bg-accent px-4 py-2 text-base font-bold text-accent-ink disabled:opacity-50">
              Roll
            </button>
          )}
          <div className="text-[11px] text-muted">
            Lap {current.laps + 1} of {lapsToWin}
          </div>
        </div>
      </div>

      <ul className="flex w-full flex-wrap gap-x-4 gap-y-1 text-sm">
        {tokens.map((t, i) => (
          <li key={i} className={`flex items-center gap-1.5 ${i === turn && !winner ? 'font-bold' : 'text-muted'}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
            <span className="text-xs">lap {t.laps + 1}</span>
          </li>
        ))}
      </ul>

      {winner && (
        <div className="w-full rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
          <div className="font-display text-2xl font-bold">{winner} wins</div>
          <p className="mt-1 text-sm">Everyone else finishes their drink.</p>
        </div>
      )}

      {log.length > 0 && (
        <ul className="w-full text-xs text-muted">
          {log.map((l, i) => (
            <li key={i} className="border-t border-border py-1 first:border-t-0">
              {l}
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => setTokens(null)} className="text-sm text-muted hover:text-ink">
        Change players
      </button>

      {modal && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{current.name}</div>
            <h2 className="mt-1 font-display text-2xl font-bold">{modal.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{modal.body}</p>
            {modal.extra && <p className="mt-2 rounded-lg border border-border bg-bg p-3 text-sm">{modal.extra}</p>}
            <button type="button" onClick={() => modal.after?.()} className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-base font-bold text-accent-ink">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
