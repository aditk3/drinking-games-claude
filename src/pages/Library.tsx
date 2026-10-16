import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { games, categories, categoryLabel } from '../data/index.ts'
import { applyFilters, filtersFromParams, paramsFromFilters } from '../lib/filters.ts'
import FilterBar from '../components/FilterBar.tsx'
import GameCard from '../components/GameCard.tsx'

const CATEGORY_BLURB: Record<string, string> = {
  'No devices': 'A deck, some dice, cups, or nothing at all.',
  'One shared device': 'One phone or laptop in the middle of the table.',
  'One device per person': 'Everyone joins a room on their own phone or laptop.',
}

export default function Library() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const results = useMemo(() => applyFilters(games, filters), [filters])

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        subcategories: cat.subcategories
          .map((sub) => ({ ...sub, games: results.filter((g) => g.category === cat.name && g.subcategory === sub.name) }))
          .filter((sub) => sub.games.length > 0),
      }))
      .filter((cat) => cat.subcategories.length > 0)
  }, [results])

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">What are we playing?</h1>
        <p className="max-w-2xl text-muted">
          {games.length} drinking games that work with exactly four people, grouped by what you have on the table. Open a game
          for setup, step-by-step rules, and exactly when everyone drinks.
        </p>
      </section>

      <FilterBar filters={filters} onChange={(next) => setParams(paramsFromFilters(next), { replace: true })} resultCount={results.length} />

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Nothing matches. Try fewer filters or a shorter search.
        </div>
      )}

      {grouped.map((cat) => (
        <section key={cat.slug} className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">{categoryLabel(cat.name)}</h2>
            {CATEGORY_BLURB[cat.name] && <p className="hidden text-sm text-muted sm:block">{CATEGORY_BLURB[cat.name]}</p>}
          </div>
          {cat.subcategories.map((sub) => (
            <div key={sub.slug} className="flex flex-col gap-3">
              {sub.name !== cat.name && (
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                  {sub.name}
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">{sub.games.length}</span>
                </h3>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sub.games.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
