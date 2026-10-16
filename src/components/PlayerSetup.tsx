import { useState } from 'react'
import { TOKEN_COLORS } from '../lib/table.ts'

type Props = {
  names: string[]
  onChange: (names: string[]) => void
  min?: number
  max?: number
  onStart: () => void
  startLabel?: string
  children?: React.ReactNode
}

/** Shared "who is playing" screen for the single-phone games. */
export default function PlayerSetup({ names, onChange, min = 2, max = 8, onStart, startLabel = 'Start', children }: Props) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const n = draft.trim().slice(0, 16)
    if (!n || names.length >= max) return
    onChange([...names, n])
    setDraft('')
  }
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">Who is playing?</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a name"
            maxLength={16}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
          />
          <button type="submit" disabled={!draft.trim() || names.length >= max} className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-40">
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-1.5">
          {names.map((n, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ background: TOKEN_COLORS[i % TOKEN_COLORS.length] }} aria-hidden />
              <span className="flex-1 font-medium">{n}</span>
              <button type="button" onClick={() => onChange(names.filter((_, j) => j !== i))} className="text-sm text-muted hover:text-heavy" aria-label={`Remove ${n}`}>
                Remove
              </button>
            </li>
          ))}
          {names.length === 0 && <li className="text-sm text-muted">Add at least {min} names. Seating order is play order.</li>}
        </ul>
      </div>
      {children}
      <button type="button" onClick={onStart} disabled={names.length < min} className="rounded-xl bg-accent px-4 py-3 text-lg font-bold text-accent-ink disabled:opacity-40">
        {startLabel}
      </button>
    </div>
  )
}
