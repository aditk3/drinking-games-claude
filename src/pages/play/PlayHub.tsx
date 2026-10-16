import { Link } from 'react-router-dom'

const BUILT_IN = [
  {
    path: '/play/roulette',
    title: 'Drink Roulette',
    kind: 'One phone',
    blurb: 'Spin the wheel. It decides who drinks, who gives, and who gets a dare.',
  },
  {
    path: '/play/board',
    title: 'Drinkopoly',
    kind: 'One phone',
    blurb: 'A board game on a phone. Roll, move, and do what the square says.',
  },
  {
    path: '/play/room',
    title: 'Party Room',
    kind: 'Phone each',
    blurb: 'Everyone joins with a code. Prompts, votes, dares and reaction mini-games on every phone at once.',
  },
]

export default function PlayHub() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Play here</h1>
        <p className="mt-1 max-w-2xl text-muted">Games built into this site, for the apps that no longer exist. Nothing to install.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {BUILT_IN.map((g) => (
          <Link key={g.path} to={g.path} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
            <span className="self-start rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">{g.kind}</span>
            <span className="font-display text-lg font-bold">{g.title}</span>
            <span className="text-sm text-muted">{g.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
