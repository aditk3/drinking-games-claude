import type { Game, Vibe } from '../data/types.ts'
import { categories, slug } from '../data/index.ts'

export type Filters = {
  q: string
  category: string | null // slug
  subcategory: string | null // slug
  vibes: Vibe[]
  styles: string[]
  addedOnly: boolean
  fullRulesOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  category: null,
  subcategory: null,
  vibes: [],
  styles: [],
  addedOnly: false,
  fullRulesOnly: false,
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const list = (key: string) => (params.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return {
    q: params.get('q') ?? '',
    category: params.get('cat'),
    subcategory: params.get('sub'),
    vibes: list('vibe') as Vibe[],
    styles: list('style'),
    addedOnly: params.get('added') === '1',
    fullRulesOnly: params.get('full') === '1',
  }
}

export function paramsFromFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('cat', f.category)
  if (f.subcategory) p.set('sub', f.subcategory)
  if (f.vibes.length) p.set('vibe', f.vibes.join(','))
  if (f.styles.length) p.set('style', f.styles.join(','))
  if (f.addedOnly) p.set('added', '1')
  if (f.fullRulesOnly) p.set('full', '1')
  return p
}

export function isDefault(f: Filters): boolean {
  return (
    !f.q && !f.category && !f.subcategory && f.vibes.length === 0 && f.styles.length === 0 && !f.addedOnly && !f.fullRulesOnly
  )
}

function matchesQuery(g: Game, q: string): boolean {
  const needle = q.toLowerCase()
  const hay = [g.name, g.needs, g.howToPlay, g.tip, g.subcategory, g.category, ...g.style, ...(g.variations ?? [])]
    .join(' ')
    .toLowerCase()
  return needle.split(/\s+/).every((word) => hay.includes(word))
}

export function applyFilters(games: Game[], f: Filters): Game[] {
  const cat = f.category ? categories.find((c) => c.slug === f.category) : null
  return games.filter((g) => {
    if (cat && g.category !== cat.name) return false
    if (f.subcategory && slug(g.subcategory) !== f.subcategory) return false
    if (f.vibes.length && !f.vibes.includes(g.vibe)) return false
    if (f.styles.length && !f.styles.some((s) => g.style.includes(s))) return false
    if (f.addedOnly && g.source !== 'added') return false
    if (f.fullRulesOnly && !(g.rules && g.rules.length)) return false
    if (f.q.trim() && !matchesQuery(g, f.q.trim())) return false
    return true
  })
}
