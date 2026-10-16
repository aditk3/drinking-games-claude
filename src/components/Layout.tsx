import { Link, Outlet, useLocation } from 'react-router-dom'
import { games } from '../data/index.ts'

export default function Layout() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  return (
    <div className="min-h-svh bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M7 3h10l-1.2 11.5A3 3 0 0 1 12.8 17h-1.6a3 3 0 0 1-3-2.5L7 3zm1.7 2 .5 4.5h5.6l.5-4.5H8.7zM10 19h4v2h-4z" />
              </svg>
            </span>
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">Drinking Games</span>
              <span className="sm:hidden">Games</span> <span className="font-medium text-muted">for 4</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/play" className={`rounded-md px-2 py-1.5 hover:bg-surface-2 hover:text-ink sm:px-3 ${pathname.startsWith('/play') ? 'text-accent' : 'text-muted'}`}>
              Play
            </Link>
            {!onHome && (
              <Link to="/" className="rounded-md px-2 py-1.5 text-muted hover:bg-surface-2 hover:text-ink sm:px-3">
                Library
              </Link>
            )}
            <Link
              to="/random"
              className="whitespace-nowrap rounded-md border border-border bg-surface px-3 py-1.5 font-medium hover:border-accent/60 hover:text-accent"
              title="Pick a random game"
            >
              <span className="hidden sm:inline">Surprise me</span>
              <span className="sm:hidden">Random</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-muted sm:px-6">
        {games.length} games. Drink water between rounds. Local app, nothing leaves this machine.
      </footer>
    </div>
  )
}
