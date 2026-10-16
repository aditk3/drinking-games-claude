import { Link } from 'react-router-dom'

/** Common header for a built-in game page. */
export default function GameShell({ title, libraryId, children }: { title: string; libraryId?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to="/play" className="text-xs text-muted hover:text-accent">
            Play here
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {libraryId && (
          <Link to={`/game/${libraryId}`} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent">
            Rules
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}
