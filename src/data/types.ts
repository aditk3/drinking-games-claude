export type Vibe = 'Chill' | 'Medium' | 'Heavy' | 'Mixed'

export type GameLink = {
  label: string
  url: string
  /** How the link was checked. "fetched" means the URL was loaded and returned the expected page. */
  verified?: 'fetched' | 'unverified'
}

/** Fields that come straight from drinking-games.md. The parser overwrites these on every run. */
export type SeedGame = {
  id: string
  name: string
  category: string
  subcategory: string
  needs: string
  vibe: Vibe
  style: string[]
  howToPlay: string
  tip: string
}

/** Fields added by research. The parser never touches these. */
export type Enrichment = {
  setup?: string[]
  rules?: string[]
  drinkTriggers?: string[]
  variations?: string[]
  watchOut?: string
  duration?: string
  playerSweetSpot?: string
  links?: GameLink[]
  /** "seed" = came from the .md, "added" = found during research and needs review. */
  source?: 'seed' | 'added'
  /** Free-form note on anything that could not be verified. */
  notes?: string
}

export type Game = SeedGame & Enrichment
