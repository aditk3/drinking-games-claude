import { Link, useParams } from 'react-router-dom'
import { games, gamesById, categoryLabel, slug } from '../data/index.ts'
import { VibeBadge, Tag } from '../components/Badge.tsx'
import NotFound from './NotFound.tsx'

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm leading-snug">{value}</span>
    </div>
  )
}

export default function GameDetail() {
  const { id } = useParams()
  const game = id ? gamesById.get(id) : undefined
  if (!game) return <NotFound />

  const siblings = games.filter((g) => g.category === game.category && g.subcategory === game.subcategory)
  const idx = siblings.findIndex((g) => g.id === game.id)
  const prev = siblings[(idx - 1 + siblings.length) % siblings.length]
  const next = siblings[(idx + 1) % siblings.length]
  const catSlug = slug(game.category)
  const subSlug = slug(game.subcategory)
  const hasFull = Boolean(game.rules?.length)

  return (
    <article className="flex flex-col gap-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-accent">Library</Link>
        <span aria-hidden>/</span>
        <Link to={`/?cat=${catSlug}`} className="hover:text-accent">{categoryLabel(game.category)}</Link>
        {game.subcategory !== game.category && (
          <>
            <span aria-hidden>/</span>
            <Link to={`/?cat=${catSlug}&sub=${subSlug}`} className="hover:text-accent">{game.subcategory}</Link>
          </>
        )}
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <VibeBadge vibe={game.vibe} size="md" />
          {game.style.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
          {game.source === 'added' && <Tag tone="warn">Added by research. Review before trusting.</Tag>}
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{game.name}</h1>
        <p className="text-lg leading-relaxed text-muted">{game.howToPlay}</p>
        {game.tip && (
          <p className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
            <span className="font-semibold text-accent">Tip for four: </span>
            {game.tip}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact label="You need" value={game.needs} />
        <Fact label="How long" value={game.duration ?? 'Not recorded yet'} />
        <Fact label="At four players" value={game.playerSweetSpot ?? 'Not recorded yet'} />
      </div>

      {!hasFull && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          This entry only has the short version so far. Re-run the enrichment or edit <code>src/data/games.json</code> to add setup,
          rules, and drink triggers.
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          {game.setup?.length ? (
            <Section title="Setup" hint="before the first turn">
              <ol className="ordered-steps flex flex-col gap-2.5 text-[15px] leading-relaxed">
                {game.setup.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </Section>
          ) : null}

          {game.rules?.length ? (
            <Section title="How a turn goes">
              <ol className="ordered-steps flex flex-col gap-2.5 text-[15px] leading-relaxed">
                {game.rules.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </Section>
          ) : null}

          {game.variations?.length ? (
            <Section title="Variations and house rules">
              <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed">
                {game.variations.map((v, i) => (
                  <li key={i} className="rounded-lg border border-border bg-surface p-3">
                    {v}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          {game.drinkTriggers?.length ? (
            <div className="rounded-xl border border-heavy/30 bg-heavy/5 p-4">
              <h2 className="mb-3 font-display text-base font-bold text-heavy">When you drink</h2>
              <ul className="flex flex-col gap-2 text-sm leading-snug">
                {game.drinkTriggers.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-heavy" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {game.watchOut && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-2 font-display text-base font-bold">Watch out</h2>
              <p className="text-sm leading-relaxed text-muted">{game.watchOut}</p>
            </div>
          )}

          {game.links?.length ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-2 font-display text-base font-bold">Links</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {game.links.map((l) => (
                  <li key={l.url} className="flex flex-col">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
                      {l.label}
                    </a>
                    <span className="truncate text-xs text-muted" title={l.url}>
                      {l.url.replace(/^https?:\/\//, '')}
                      {l.verified === 'fetched' ? ' · checked' : l.verified === 'unverified' ? ' · not verified' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {game.notes && (
            <div className="rounded-xl border border-dashed border-border p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Research notes</h2>
              <p className="text-sm leading-relaxed text-muted">{game.notes}</p>
            </div>
          )}
        </aside>
      </div>

      {siblings.length > 1 && (
        <nav className="flex items-center justify-between gap-4 border-t border-border pt-6 text-sm">
          <Link to={`/game/${prev.id}`} className="group flex flex-col gap-0.5 hover:text-accent">
            <span className="text-xs text-muted">Previous</span>
            <span className="font-medium">{prev.name}</span>
          </Link>
          <Link to={`/game/${next.id}`} className="group flex flex-col items-end gap-0.5 text-right hover:text-accent">
            <span className="text-xs text-muted">Next</span>
            <span className="font-medium">{next.name}</span>
          </Link>
        </nav>
      )}
    </article>
  )
}
