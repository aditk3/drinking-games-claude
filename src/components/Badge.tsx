import type { Vibe } from '../data/types.ts'

const VIBE_CLASS: Record<Vibe, string> = {
  Chill: 'text-chill border-chill/40 bg-chill/10',
  Medium: 'text-medium border-medium/40 bg-medium/10',
  Heavy: 'text-heavy border-heavy/40 bg-heavy/10',
  Mixed: 'text-mixed border-mixed/40 bg-mixed/10',
}

export function VibeBadge({ vibe, size = 'sm' }: { vibe: Vibe; size?: 'sm' | 'md' }) {
  const dots = { Chill: 1, Medium: 2, Heavy: 3, Mixed: 0 }[vibe]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide uppercase ${VIBE_CLASS[vibe]} ${
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
      }`}
      title={`Vibe: ${vibe}`}
    >
      <span className="inline-flex gap-0.5" aria-hidden>
        {dots === 0 ? (
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        ) : (
          [0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full bg-current ${i < dots ? '' : 'opacity-25'}`} />
          ))
        )}
      </span>
      {vibe}
    </span>
  )
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'warn' }) {
  const cls =
    tone === 'accent'
      ? 'bg-accent/15 text-accent border-accent/30'
      : tone === 'warn'
        ? 'bg-heavy/10 text-heavy border-heavy/30'
        : 'bg-surface-2 text-muted border-border'
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}
