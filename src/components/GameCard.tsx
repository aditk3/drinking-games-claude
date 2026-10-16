import { Link } from 'react-router-dom'
import type { Game } from '../data/types.ts'
import { VibeBadge, Tag } from './Badge.tsx'

export default function GameCard({ game }: { game: Game }) {
  const hasRules = Boolean(game.rules?.length)
  return (
    <Link
      to={`/game/${game.id}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-bold leading-snug group-hover:text-accent">{game.name}</h3>
        <VibeBadge vibe={game.vibe} />
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{game.howToPlay}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {game.style.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
        {game.duration && <Tag>{game.duration.replace(/\s*per.*$/i, '')}</Tag>}
        {game.source === 'added' && <Tag tone="warn">Added, review</Tag>}
        {game.playUrl && <Tag tone="accent">Play here</Tag>}
        {!hasRules && <Tag>Short rules only</Tag>}
      </div>
      <p className="truncate text-xs text-muted/80">
        <span className="font-medium text-muted">Needs:</span> {game.needs}
      </p>
    </Link>
  )
}
