import { categories, styles, VIBES, categoryLabel } from '../data/index.ts'
import type { Vibe } from '../data/types.ts'
import type { Filters } from '../lib/filters.ts'
import { isDefault } from '../lib/filters.ts'

type Props = {
  filters: Filters
  onChange: (next: Filters) => void
  resultCount: number
}

function Chip({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: Vibe
}) {
  const toneClass = tone
    ? { Chill: 'text-chill', Medium: 'text-medium', Heavy: 'text-heavy', Mixed: 'text-mixed' }[tone]
    : ''
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-accent bg-accent text-accent-ink font-semibold'
          : `border-border bg-surface hover:border-muted ${toneClass || 'text-ink'}`
      }`}
    >
      {children}
    </button>
  )
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export default function FilterBar({ filters, onChange, resultCount }: Props) {
  const activeCategory = categories.find((c) => c.slug === filters.category) ?? null
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search games</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search by name, gear, or rule text"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
          />
        </label>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            <strong className="text-ink">{resultCount}</strong> game{resultCount === 1 ? '' : 's'}
          </span>
          {!isDefault(filters) && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, q: '', category: null, subcategory: null, vibes: [], styles: [], addedOnly: false, fullRulesOnly: false })}
              className="rounded-md border border-border px-2.5 py-1 hover:border-accent hover:text-accent"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!filters.category} onClick={() => set({ category: null, subcategory: null })}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.slug}
            active={filters.category === c.slug}
            onClick={() => set({ category: filters.category === c.slug ? null : c.slug, subcategory: null })}
          >
            {categoryLabel(c.name)} <span className="opacity-60">{c.count}</span>
          </Chip>
        ))}
      </div>

      {activeCategory && activeCategory.subcategories.length > 1 && (
        <div className="flex flex-wrap gap-2 border-l-2 border-accent/40 pl-3">
          {activeCategory.subcategories.map((s) => (
            <Chip
              key={s.slug}
              active={filters.subcategory === s.slug}
              onClick={() => set({ subcategory: filters.subcategory === s.slug ? null : s.slug })}
            >
              {s.name} <span className="opacity-60">{s.count}</span>
            </Chip>
          ))}
        </div>
      )}

      <details className="group rounded-lg border border-border bg-surface/60 open:bg-surface">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm text-muted hover:text-ink">
          More filters
          {(filters.vibes.length > 0 || filters.styles.length > 0 || filters.addedOnly || filters.fullRulesOnly) && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">on</span>
          )}
        </summary>
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs font-semibold uppercase tracking-wide text-muted">Vibe</span>
            {VIBES.map((v) => (
              <Chip key={v} tone={v} active={filters.vibes.includes(v)} onClick={() => set({ vibes: toggle(filters.vibes, v) })}>
                {v}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs font-semibold uppercase tracking-wide text-muted">Style</span>
            {styles.map((s) => (
              <Chip key={s} active={filters.styles.includes(s)} onClick={() => set({ styles: toggle(filters.styles, s) })}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={filters.fullRulesOnly} onChange={(e) => set({ fullRulesOnly: e.target.checked })} className="accent-accent" />
              Full rules only
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={filters.addedOnly} onChange={(e) => set({ addedOnly: e.target.checked })} className="accent-accent" />
              Added by research (needs review)
            </label>
          </div>
        </div>
      </details>
    </div>
  )
}
