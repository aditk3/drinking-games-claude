/**
 * Merges one or more enrichment JSON files into src/data/games.json.
 *
 *   npx tsx scripts/merge-enrichment.ts path/to/a.json path/to/b.json
 *
 * Each input file is an array of objects with an "id". Objects whose id already
 * exists in games.json have their fields merged on top (seed fields are never
 * overwritten). Objects with a new id are appended as new games with source "added",
 * placed after the last game in the same subcategory.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Game } from '../src/data/types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const JSON_PATH = resolve(here, '../src/data/games.json')
const SEED_KEYS = new Set(['id', 'name', 'category', 'subcategory', 'needs', 'vibe', 'style', 'howToPlay', 'tip'])
const REQUIRED_NEW = ['name', 'category', 'subcategory', 'needs', 'vibe', 'style', 'howToPlay']

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: tsx scripts/merge-enrichment.ts <file.json> [...]')
  process.exit(1)
}

const games: Game[] = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
const byId = new Map(games.map((g) => [g.id, g]))
let updated = 0
let added = 0

for (const file of files) {
  const entries: Array<Record<string, unknown> & { id: string }> = JSON.parse(readFileSync(file, 'utf8'))
  for (const entry of entries) {
    if (!entry.id) throw new Error(`${file}: entry without id`)
    const existing = byId.get(entry.id)
    if (existing) {
      for (const [k, v] of Object.entries(entry)) {
        if (SEED_KEYS.has(k)) continue
        ;(existing as Record<string, unknown>)[k] = v
      }
      if (!existing.source) existing.source = 'seed'
      updated++
    } else {
      for (const k of REQUIRED_NEW) {
        if (!(k in entry)) throw new Error(`${file}: new game "${entry.id}" is missing "${k}"`)
      }
      const game = { ...entry, source: 'added' } as unknown as Game
      if (!game.tip) game.tip = ''
      let insertAt = -1
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].category === game.category && games[i].subcategory === game.subcategory) {
          insertAt = i + 1
          break
        }
      }
      if (insertAt === -1) games.push(game)
      else games.splice(insertAt, 0, game)
      byId.set(game.id, game)
      added++
    }
  }
}

writeFileSync(JSON_PATH, JSON.stringify(games, null, 2) + '\n')
console.log(`Updated ${updated} games, added ${added}. Total ${games.length}.`)
