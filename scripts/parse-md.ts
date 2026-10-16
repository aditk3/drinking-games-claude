/**
 * Converts drinking-games.md into src/data/games.json.
 *
 * Run with:  npm run parse
 *
 * Seed fields (id, name, category, subcategory, needs, vibe, style, howToPlay, tip)
 * are rewritten from the markdown every time. Any other field already present on a
 * matching entry in games.json (setup, rules, drinkTriggers, links, ...) is preserved.
 * Entries in games.json that are not in the markdown (source: "added") are kept and
 * stay next to the other games in their subcategory.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Game, SeedGame, Vibe } from '../src/data/types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const MD_PATH = resolve(here, '../drinking-games.md')
const JSON_PATH = resolve(here, '../src/data/games.json')

const SEED_KEYS: (keyof SeedGame)[] = [
  'id', 'name', 'category', 'subcategory', 'needs', 'vibe', 'style', 'howToPlay', 'tip',
]

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripHeadingNumber(text: string): string {
  // "1. No devices" -> "No devices", "1a. Standard deck of cards" -> "Standard deck of cards"
  return text.replace(/^\d+[a-z]?\.\s*/i, '').trim()
}

function parseVibe(raw: string): Vibe {
  const v = raw.trim()
  if (v === 'Chill' || v === 'Medium' || v === 'Heavy' || v === 'Mixed') return v
  throw new Error(`Unknown vibe "${raw}"`)
}

export function parseMarkdown(md: string): SeedGame[] {
  const games: SeedGame[] = []
  let category = ''
  let subcategory = ''
  let current: Partial<SeedGame> | null = null
  const seen = new Set<string>()

  const flush = () => {
    if (!current) return
    const g = current
    for (const key of ['name', 'needs', 'vibe', 'howToPlay'] as const) {
      if (!g[key]) throw new Error(`Game "${g.name ?? '?'}" is missing "${key}"`)
    }
    let id = slugify(g.name!)
    if (seen.has(id)) {
      // Same name under two sections (e.g. "Skribbl.io" shared vs per-device). Disambiguate.
      id = `${id}-${slugify(subcategory)}`
    }
    seen.add(id)
    games.push({
      id,
      name: g.name!,
      category: g.category!,
      subcategory: g.subcategory!,
      needs: g.needs!,
      vibe: g.vibe!,
      style: g.style ?? [],
      howToPlay: g.howToPlay!,
      tip: g.tip ?? '',
    })
    current = null
  }

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trimEnd()
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      flush()
      category = stripHeadingNumber(line.slice(3))
      subcategory = ''
      continue
    }
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      flush()
      subcategory = stripHeadingNumber(line.slice(4))
      continue
    }
    if (line.startsWith('#### ')) {
      flush()
      if (category === 'Sources') continue
      current = {
        name: line.slice(5).trim(),
        category,
        subcategory: subcategory || category,
      }
      continue
    }
    if (!current) continue
    const m = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/)
    if (!m) continue
    const [, label, value] = m
    switch (label) {
      case 'Needs': current.needs = value.trim(); break
      case 'Vibe': current.vibe = parseVibe(value); break
      case 'Style': current.style = value.split('/').map((s) => s.trim()).filter(Boolean); break
      case 'How to play': current.howToPlay = value.trim(); break
      case 'Tip': current.tip = value.trim(); break
    }
  }
  flush()
  return games
}

export function merge(parsed: SeedGame[], existing: Game[]): Game[] {
  const byId = new Map(existing.map((g) => [g.id, g]))
  const parsedIds = new Set(parsed.map((g) => g.id))

  // Seed games in markdown order, with enrichment carried over.
  const merged: Game[] = parsed.map((seed) => {
    const prev = byId.get(seed.id)
    if (!prev) return { ...seed, source: 'seed' }
    const enrichment: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(prev)) {
      if (!SEED_KEYS.includes(k as keyof SeedGame)) enrichment[k] = v
    }
    return { ...seed, ...enrichment, source: 'seed' } as Game
  })

  // Keep added games, placing each after the last game of its subcategory.
  for (const extra of existing) {
    if (parsedIds.has(extra.id)) continue
    const kept: Game = { ...extra, source: extra.source ?? 'added' }
    let insertAt = -1
    for (let i = merged.length - 1; i >= 0; i--) {
      if (merged[i].category === kept.category && merged[i].subcategory === kept.subcategory) {
        insertAt = i + 1
        break
      }
    }
    if (insertAt === -1) merged.push(kept)
    else merged.splice(insertAt, 0, kept)
  }
  return merged
}

function main() {
  const md = readFileSync(MD_PATH, 'utf8')
  const parsed = parseMarkdown(md)
  const existing: Game[] = existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, 'utf8')) : []
  const merged = merge(parsed, existing)
  writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2) + '\n')
  const added = merged.filter((g) => g.source === 'added').length
  const enriched = merged.filter((g) => g.rules && g.rules.length > 0).length
  console.log(`Parsed ${parsed.length} games from markdown.`)
  console.log(`Wrote ${merged.length} games to ${JSON_PATH} (${added} added, ${enriched} with full rules).`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
