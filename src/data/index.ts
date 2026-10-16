import raw from './games.json'
import type { Game, Vibe } from './types.ts'

export const games: Game[] = raw as Game[]

export const gamesById: Map<string, Game> = new Map(games.map((g) => [g.id, g]))

export type Category = {
  name: string
  slug: string
  subcategories: { name: string; slug: string; count: number }[]
  count: number
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Categories in the order they first appear in the data. */
export const categories: Category[] = (() => {
  const out: Category[] = []
  for (const g of games) {
    let cat = out.find((c) => c.name === g.category)
    if (!cat) {
      cat = { name: g.category, slug: slug(g.category), subcategories: [], count: 0 }
      out.push(cat)
    }
    cat.count++
    let sub = cat.subcategories.find((s) => s.name === g.subcategory)
    if (!sub) {
      sub = { name: g.subcategory, slug: slug(g.subcategory), count: 0 }
      cat.subcategories.push(sub)
    }
    sub.count++
  }
  return out
})()

export const VIBES: Vibe[] = ['Chill', 'Medium', 'Heavy', 'Mixed']

export const styles: string[] = (() => {
  const counts = new Map<string, number>()
  for (const g of games) for (const s of g.style) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
})()

export function hasFullRules(g: Game): boolean {
  return Boolean(g.rules && g.rules.length > 0)
}

/** Short display label for a category: strips a leading "Bonus: ". */
export function categoryLabel(name: string): string {
  const stripped = name.replace(/^Bonus:\s*/i, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}
