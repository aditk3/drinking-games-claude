import { useMemo, useRef, useState } from 'react'
import { DARES, RULES, TRUTHS, WHEEL_DEFAULT, type WheelSlice } from '../../../shared/content.ts'
import PlayerSetup from '../../components/PlayerSetup.tsx'
import { TOKEN_COLORS, randomOf, useTableNames } from '../../lib/table.ts'

type Mode = 'outcomes' | 'names'

const TONE_FILL: Record<WheelSlice['tone'], string> = {
  drink: '#f87171',
  give: '#5ed49b',
  all: '#b49cff',
  safe: '#60a5fa',
  wild: '#f5b544',
}

type Result = { title: string; detail: string; extra?: string }

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
}

function slicePath(i: number, n: number, r: number): string {
  const a0 = (360 / n) * i
  const a1 = (360 / n) * (i + 1)
  const [x0, y0] = polar(0, 0, r, a0)
  const [x1, y1] = polar(0, 0, r, a1)
  const large = 360 / n > 180 ? 1 : 0
  return `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
}

export default function Roulette() {
  const [names, setNames] = useTableNames()
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<Mode>('outcomes')
  const [turn, setTurn] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [double, setDouble] = useState(false)
  const pendingRef = useRef<Result | null>(null)

  const slices = useMemo<WheelSlice[]>(() => {
    if (mode === 'names') {
      const pool = names.length ? names : ['Nobody']
      return pool.map((n, i) => ({ label: n, detail: `${n} drinks 2.`, tone: (['drink', 'give', 'all', 'wild', 'safe'] as const)[i % 5] }))
    }
    return WHEEL_DEFAULT
  }, [mode, names])

  const n = slices.length
  const sliceDeg = 360 / n
  const current = names[turn % Math.max(1, names.length)] ?? 'You'

  const spin = () => {
    if (spinning) return
    const index = Math.floor(Math.random() * n)
    const slice = slices[index]
    // The pointer sits at the top (0deg). Rotate so the middle of `index` lands under it, minus a little jitter.
    const jitter = (Math.random() - 0.5) * sliceDeg * 0.7
    const target = 360 - (index * sliceDeg + sliceDeg / 2) + jitter
    const turns = 5 + Math.floor(Math.random() * 3)
    const base = rotation - (rotation % 360)
    const next = base + turns * 360 + target
    const mult = double ? 2 : 1
    let res: Result
    if (mode === 'names') {
      res = { title: slice.label, detail: `${slice.label} drinks ${2 * mult}.` }
    } else {
      res = { title: slice.label, detail: slice.detail }
      if (slice.label === 'Dare') res.extra = randomOf(DARES).text.replace('{player}', randomOf(names.filter((x) => x !== current)) ?? 'someone')
      if (slice.label === 'Truth') res.extra = randomOf(TRUTHS).text
      if (slice.label === 'Make a rule') res.extra = `Need an idea? ${randomOf(RULES).text}`
      if (mult === 2 && slice.label !== 'Spin again') res.detail = `Doubled: ${slice.detail}`
    }
    pendingRef.current = res
    setResult(null)
    setSpinning(true)
    setRotation(next)
  }

  const landed = () => {
    if (!spinning) return
    setSpinning(false)
    const res = pendingRef.current
    if (!res) return
    setResult(res)
    const again = res.title === 'Spin again'
    setDouble(again)
    setLog((l) => [`${current}: ${res.title}`, ...l].slice(0, 8))
    if (!again) setTurn((t) => t + 1)
  }

  if (!started) {
    return (
      <PlayerSetup names={names} onChange={setNames} min={2} onStart={() => setStarted(true)} startLabel="Spin">
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted">
          Put the phone in the middle. Players take turns spinning. The wheel decides who drinks, who gives, and who gets a dare.
        </div>
      </PlayerSetup>
    )
  }

  const R = 150

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm">
        <div>
          <span className="text-muted">Spinning:</span> <strong>{current}</strong>
          {double && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">x2</span>}
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {(['outcomes', 'names'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={spinning}
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === m ? 'bg-accent text-accent-ink' : 'text-muted'}`}
            >
              {m === 'outcomes' ? 'Outcomes' : 'Names'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ width: 2 * R + 24, height: 2 * R + 24 }}>
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2" aria-hidden>
          <svg width="28" height="34" viewBox="0 0 28 34">
            <path d="M14 34 L2 6 Q14 -4 26 6 Z" fill="var(--c-ink)" stroke="var(--c-bg)" strokeWidth="2" />
          </svg>
        </div>
        <svg
          viewBox={`${-R - 12} ${-R - 12} ${2 * R + 24} ${2 * R + 24}`}
          className="h-full w-full"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(0.12, 0.7, 0.1, 1)' : 'none' }}
          onTransitionEnd={landed}
          role="img"
          aria-label="Roulette wheel"
        >
          <circle r={R + 8} fill="var(--c-surface-2)" stroke="var(--c-border)" strokeWidth="2" />
          {slices.map((s, i) => {
            const mid = (i + 0.5) * sliceDeg
            const [tx, ty] = polar(0, 0, R * 0.62, mid)
            // Radial text: rotate so it reads outward on the right half and inward on the left half.
            const textRot = mid > 180 ? mid + 90 : mid - 90
            const fill = mode === 'names' ? TOKEN_COLORS[i % TOKEN_COLORS.length] : TONE_FILL[s.tone]
            return (
              <g key={i}>
                <path d={slicePath(i, n, R)} fill={fill} fillOpacity={0.9} stroke="var(--c-bg)" strokeWidth="2" />
                <text
                  x={tx}
                  y={ty}
                  fill="#1a1203"
                  fontSize={n > 12 ? 10.5 : 12.5}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRot} ${tx} ${ty})`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {s.label}
                </text>
              </g>
            )
          })}
          <circle r={22} fill="var(--c-bg)" stroke="var(--c-border)" strokeWidth="2" />
        </svg>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-bold text-accent-ink shadow-lg shadow-black/20 disabled:opacity-50"
      >
        {spinning ? 'Spinning...' : `Spin, ${current}`}
      </button>

      {result && (
        <div className="w-full rounded-xl border border-accent/40 bg-accent/10 p-4" role="status">
          <div className="font-display text-2xl font-bold">{result.title}</div>
          <p className="mt-1 text-[15px]">{result.detail}</p>
          {result.extra && <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-[15px]">{result.extra}</p>}
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

      <button type="button" onClick={() => setStarted(false)} className="text-sm text-muted hover:text-ink">
        Change players
      </button>
    </div>
  )
}
