/**
 * Pure game logic for the multi-phone room. The server owns the state and calls these;
 * the client only renders state and sends actions.
 */
import type { GameMode, HostAction, MiniKind, Player, PlayerAction, PlayerId, PromptKind, RoomState, Round, RoundKind } from './types.ts'
import { DARES, MOST_LIKELY, NEVER_HAVE_I_EVER, RULES, TRUTHS, WOULD_YOU_RATHER, pool } from './content.ts'

export const MAX_PLAYERS = 12
const LOG_LIMIT = 12

export type Pending = { at: number; what: 'go' | 'reveal' } | null

export function createRoom(code: string, now: number): RoomState {
  return {
    code,
    createdAt: now,
    updatedAt: now,
    hostId: null,
    players: [],
    phase: 'lobby',
    mode: 'mixed',
    spice: 'spicy',
    round: null,
    roundCount: 0,
    used: {},
    log: [],
    roundLog: [],
  }
}

export function upsertPlayer(state: RoomState, id: PlayerId, name: string, now: number): RoomState {
  const clean = name.trim().slice(0, 20) || 'Player'
  const existing = state.players.find((p) => p.id === id)
  let players: Player[]
  if (existing) {
    players = state.players.map((p) => (p.id === id ? { ...p, name: clean, connected: true } : p))
  } else {
    if (state.players.length >= MAX_PLAYERS) throw new Error('Room is full')
    players = [...state.players, { id, name: clean, connected: true, drinks: 0, joinedAt: now }]
  }
  const hostId = state.hostId && players.some((p) => p.id === state.hostId) ? state.hostId : id
  return { ...state, players, hostId, updatedAt: now }
}

export function setConnected(state: RoomState, id: PlayerId, connected: boolean, now: number): RoomState {
  const players = state.players.map((p) => (p.id === id ? { ...p, connected } : p))
  let hostId = state.hostId
  if (!connected && hostId === id) {
    const next = players.find((p) => p.connected && p.id !== id)
    if (next) hostId = next.id
  }
  return { ...state, players, hostId, updatedAt: now }
}

function log(state: RoomState, line: string): RoomState {
  return { ...state, log: [...state.log, line].slice(-LOG_LIMIT), roundLog: [...state.roundLog, line] }
}

function addDrinks(state: RoomState, id: PlayerId, n: number): RoomState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, drinks: p.drinks + n } : p)) }
}

function name(state: RoomState, id: PlayerId): string {
  return state.players.find((p) => p.id === id)?.name ?? 'Someone'
}

function shuffleIndex(state: RoomState, key: string, length: number): { state: RoomState; index: number } {
  let used = state.used[key] ?? []
  if (used.length >= length) used = []
  const free: number[] = []
  for (let i = 0; i < length; i++) if (!used.includes(i)) free.push(i)
  const index = free[Math.floor(Math.random() * free.length)]
  return { state: { ...state, used: { ...state.used, [key]: [...used, index] } }, index }
}

function randomPlayer(state: RoomState, exclude?: PlayerId): PlayerId {
  const pool = state.players.filter((p) => p.connected && p.id !== exclude)
  const list = pool.length ? pool : state.players
  return list[Math.floor(Math.random() * list.length)].id
}

function fill(state: RoomState, text: string, target: PlayerId): string {
  return text.replace('{player}', name(state, randomPlayer(state, target)))
}

const PROMPT_WEIGHTS: [PromptKind, number][] = [
  ['vote', 30],
  ['nhie', 25],
  ['wyr', 20],
  ['dare', 12],
  ['truth', 8],
  ['rule', 5],
]
const MINI_KINDS: MiniKind[] = ['reaction', 'taps', 'hold', 'math']

function pickKind(mode: GameMode, lastKind: string | undefined): PromptKind | MiniKind {
  const wantMini = mode === 'minigames' || (mode === 'mixed' && Math.random() < 0.4)
  if (wantMini) {
    const pool = MINI_KINDS.filter((k) => k !== lastKind)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pool = PROMPT_WEIGHTS.filter(([k]) => k !== lastKind)
  const total = pool.reduce((n, [, w]) => n + w, 0)
  let r = Math.random() * total
  for (const [k, w] of pool) {
    r -= w
    if (r <= 0) return k
  }
  return 'vote'
}

function mathQuestion(): { question: string; answer: number } {
  const kind = Math.floor(Math.random() * 3)
  if (kind === 0) {
    const a = 10 + Math.floor(Math.random() * 80)
    const b = 10 + Math.floor(Math.random() * 80)
    return { question: `${a} + ${b}`, answer: a + b }
  }
  if (kind === 1) {
    const a = 30 + Math.floor(Math.random() * 70)
    const b = Math.floor(Math.random() * a)
    return { question: `${a} - ${b}`, answer: a - b }
  }
  const a = 3 + Math.floor(Math.random() * 10)
  const b = 3 + Math.floor(Math.random() * 10)
  return { question: `${a} x ${b}`, answer: a * b }
}

/** Starts a new round. Returns the state and any timer the server must set. */
export function startRound(state: RoomState, now: number, forced?: RoundKind): { state: RoomState; pending: Pending } {
  const kind = forced ?? pickKind(state.mode, state.round?.kind)
  const id = state.roundCount + 1
  const base = { id, revealed: false, startedAt: now }
  let s: RoomState = { ...state, roundCount: id, phase: 'playing', roundLog: [], updatedAt: now }
  let round: Round
  let pending: Pending = null
  switch (kind) {
    case 'vote': {
      const list = pool(MOST_LIKELY, s.spice)
      const r = shuffleIndex(s, `vote:${s.spice}`, list.length)
      s = r.state
      round = { ...base, kind, prompt: list[r.index].text, votes: {} }
      break
    }
    case 'nhie': {
      const list = pool(NEVER_HAVE_I_EVER, s.spice)
      const r = shuffleIndex(s, `nhie:${s.spice}`, list.length)
      s = r.state
      round = { ...base, kind, prompt: list[r.index].text, answers: {} }
      break
    }
    case 'wyr': {
      const list = pool(WOULD_YOU_RATHER, s.spice)
      const r = shuffleIndex(s, `wyr:${s.spice}`, list.length)
      s = r.state
      const { a, b } = list[r.index]
      round = { ...base, kind, a, b, answers: {} }
      break
    }
    case 'dare':
    case 'truth': {
      const list = pool(kind === 'dare' ? DARES : TRUTHS, s.spice)
      const r = shuffleIndex(s, `${kind}:${s.spice}`, list.length)
      s = r.state
      const target = randomPlayer(s)
      round = { ...base, kind, target, text: fill(s, list[r.index].text, target), outcome: null }
      break
    }
    case 'rule': {
      const r = shuffleIndex(s, 'rule', RULES.length)
      s = r.state
      round = { ...base, kind, master: randomPlayer(s), text: RULES[r.index].text }
      break
    }
    case 'reaction': {
      round = { ...base, kind, goAt: null, results: {} }
      pending = { at: now + 2500 + Math.floor(Math.random() * 4000), what: 'go' }
      break
    }
    case 'taps': {
      const seconds = 5
      round = { ...base, kind, seconds, endsAt: now + 3000 + seconds * 1000, results: {} }
      pending = { at: now + 3000 + seconds * 1000 + 2000, what: 'reveal' }
      break
    }
    case 'hold': {
      const targetMs = [3000, 4000, 5000, 7000][Math.floor(Math.random() * 4)]
      round = { ...base, kind, targetMs, results: {} }
      break
    }
    case 'math': {
      const q = mathQuestion()
      round = { ...base, kind, question: q.question, answer: q.answer, results: {} }
      break
    }
  }
  return { state: { ...s, round }, pending }
}

export function fireGo(state: RoomState, now: number): RoomState {
  if (state.round?.kind !== 'reaction' || state.round.goAt !== null) return state
  return { ...state, round: { ...state.round, goAt: now }, updatedAt: now }
}

function everyoneAnswered(state: RoomState): boolean {
  const r = state.round
  if (!r) return false
  const active = state.players.filter((p) => p.connected).map((p) => p.id)
  if (active.length === 0) return false
  const answered = (ids: string[]) => active.every((id) => ids.includes(id))
  switch (r.kind) {
    case 'vote': return answered(Object.keys(r.votes))
    case 'nhie': return answered(Object.keys(r.answers))
    case 'wyr': return answered(Object.keys(r.answers))
    case 'dare':
    case 'truth': return r.outcome !== null
    case 'rule': return false
    case 'reaction':
    case 'taps':
    case 'hold':
    case 'math': return answered(Object.keys(r.results))
  }
}

/** Applies a player's action. Throws on an invalid action. */
export function applyPlayer(state: RoomState, playerId: PlayerId, action: PlayerAction, now: number): RoomState {
  if (action.type === 'rename') {
    return upsertPlayer(state, playerId, action.name, now)
  }
  const r = state.round
  if (!r || r.revealed || state.phase !== 'playing') throw new Error('No open round')
  let round: Round = r
  switch (action.type) {
    case 'vote':
      if (r.kind !== 'vote') throw new Error('Wrong round')
      if (!state.players.some((p) => p.id === action.target)) throw new Error('Unknown player')
      round = { ...r, votes: { ...r.votes, [playerId]: action.target } }
      break
    case 'nhie':
      if (r.kind !== 'nhie') throw new Error('Wrong round')
      round = { ...r, answers: { ...r.answers, [playerId]: action.value } }
      break
    case 'wyr':
      if (r.kind !== 'wyr') throw new Error('Wrong round')
      round = { ...r, answers: { ...r.answers, [playerId]: action.value } }
      break
    case 'outcome':
      if (r.kind !== 'dare' && r.kind !== 'truth') throw new Error('Wrong round')
      if (r.target !== playerId && state.hostId !== playerId) throw new Error('Not your dare')
      round = { ...r, outcome: action.value }
      break
    case 'reaction':
      if (r.kind !== 'reaction') throw new Error('Wrong round')
      if (playerId in r.results) return state
      round = { ...r, results: { ...r.results, [playerId]: r.goAt === null ? -1 : Math.max(0, Math.round(action.ms)) } }
      break
    case 'taps':
      if (r.kind !== 'taps') throw new Error('Wrong round')
      round = { ...r, results: { ...r.results, [playerId]: Math.max(0, Math.min(200, Math.round(action.count))) } }
      break
    case 'hold':
      if (r.kind !== 'hold') throw new Error('Wrong round')
      if (playerId in r.results) return state
      round = { ...r, results: { ...r.results, [playerId]: Math.max(0, Math.round(action.ms)) } }
      break
    case 'math':
      if (r.kind !== 'math') throw new Error('Wrong round')
      if (playerId in r.results) return state
      round = { ...r, results: { ...r.results, [playerId]: { answer: Math.round(action.answer), at: now } } }
      break
  }
  let next: RoomState = { ...state, round, updatedAt: now }
  if (everyoneAnswered(next)) next = reveal(next, now)
  return next
}

/** Reveals the current round and hands out drinks. */
export function reveal(state: RoomState, now: number): RoomState {
  const r = state.round
  if (!r || r.revealed) return state
  let s: RoomState = { ...state, round: { ...r, revealed: true }, updatedAt: now }
  const n = (id: PlayerId) => name(s, id)
  const active = s.players.filter((p) => p.connected).map((p) => p.id)

  switch (r.kind) {
    case 'vote': {
      const counts = new Map<PlayerId, number>()
      for (const t of Object.values(r.votes)) counts.set(t, (counts.get(t) ?? 0) + 1)
      const max = Math.max(0, ...counts.values())
      if (max === 0) return log(s, 'Nobody voted. Nobody drinks.')
      for (const [id, c] of counts) {
        if (c === max) {
          s = addDrinks(s, id, c)
          s = log(s, `${n(id)} got ${c} vote${c === 1 ? '' : 's'} and drinks ${c}.`)
        }
      }
      return s
    }
    case 'nhie': {
      const guilty = Object.entries(r.answers).filter(([, v]) => v).map(([id]) => id)
      if (guilty.length === 0) return log(s, 'Nobody has. Everyone drinks 1 for being boring.')
      for (const id of guilty) s = addDrinks(s, id, 1)
      return log(s, `${guilty.map(n).join(', ')} ${guilty.length === 1 ? 'has' : 'have'}. Drink 1.`)
    }
    case 'wyr': {
      const a = Object.entries(r.answers).filter(([, v]) => v === 'a').map(([id]) => id)
      const b = Object.entries(r.answers).filter(([, v]) => v === 'b').map(([id]) => id)
      if (a.length === 0 || b.length === 0) {
        const side = a.length ? r.a : r.b
        return log(s, `Unanimous: "${side}". Nobody drinks.`)
      }
      if (a.length === b.length) {
        for (const id of [...a, ...b]) s = addDrinks(s, id, 1)
        return log(s, 'Split vote. Everyone drinks 1.')
      }
      const losers = a.length < b.length ? a : b
      const side = a.length < b.length ? r.a : r.b
      for (const id of losers) s = addDrinks(s, id, 1)
      return log(s, `Minority picked "${side}": ${losers.map(n).join(', ')} drink 1.`)
    }
    case 'dare':
    case 'truth': {
      if (r.outcome === 'did') return log(s, `${n(r.target)} did it and hands out 2.`)
      if (r.outcome === 'drank') {
        s = addDrinks(s, r.target, 3)
        return log(s, `${n(r.target)} chickened out and drinks 3.`)
      }
      return log(s, `${n(r.target)} skipped the ${r.kind}.`)
    }
    case 'rule':
      return log(s, `New rule from ${n(r.master)}: ${r.text}`)
    case 'reaction': {
      const rows = active.map((id) => ({ id, ms: id in r.results ? r.results[id] : Number.POSITIVE_INFINITY }))
      const valid = rows.filter((x) => x.ms >= 0 && Number.isFinite(x.ms)).sort((x, y) => x.ms - y.ms)
      const bad = rows.filter((x) => x.ms < 0 || !Number.isFinite(x.ms))
      const order = [...valid, ...bad]
      if (order.length < 2) return log(s, 'Not enough players for a result.')
      const last = order[order.length - 1]
      s = addDrinks(s, last.id, 2)
      const why = last.ms < 0 ? 'jumped the gun' : !Number.isFinite(last.ms) ? 'never tapped' : `was slowest at ${last.ms} ms`
      const first = valid[0]
      return log(s, `${first ? `${n(first.id)} was fastest (${first.ms} ms). ` : ''}${n(last.id)} ${why} and drinks 2.`)
    }
    case 'taps': {
      const rows = active.map((id) => ({ id, c: r.results[id] ?? 0 })).sort((x, y) => y.c - x.c)
      if (rows.length < 2) return log(s, 'Not enough players for a result.')
      const last = rows[rows.length - 1]
      s = addDrinks(s, last.id, 2)
      return log(s, `${n(rows[0].id)} tapped ${rows[0].c} times. ${n(last.id)} managed ${last.c} and drinks 2.`)
    }
    case 'hold': {
      const rows = active
        .map((id) => ({ id, off: id in r.results ? Math.abs(r.results[id] - r.targetMs) : Number.POSITIVE_INFINITY }))
        .sort((x, y) => x.off - y.off)
      if (rows.length < 2) return log(s, 'Not enough players for a result.')
      const last = rows[rows.length - 1]
      s = addDrinks(s, last.id, 2)
      const fmt = (ms: number) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(2)} s off` : 'never released')
      return log(s, `${n(rows[0].id)} was closest (${fmt(rows[0].off)}). ${n(last.id)} was ${fmt(last.off)} and drinks 2.`)
    }
    case 'math': {
      const correct = active
        .filter((id) => r.results[id]?.answer === r.answer)
        .sort((x, y) => r.results[x].at - r.results[y].at)
      const wrong = active.filter((id) => r.results[id]?.answer !== r.answer)
      for (const id of wrong) s = addDrinks(s, id, 1)
      const parts: string[] = [`${r.question} = ${r.answer}.`]
      if (correct.length) parts.push(`${n(correct[0])} was first and hands out 2.`)
      if (wrong.length) parts.push(`${wrong.map(n).join(', ')} drink 1.`)
      return log(s, parts.join(' '))
    }
  }
}

export function applyHost(state: RoomState, action: HostAction, now: number): { state: RoomState; pending: Pending; clearPending: boolean } {
  switch (action.type) {
    case 'start': {
      const base: RoomState = { ...state, mode: action.mode, spice: action.spice ?? state.spice, phase: 'playing', round: null, roundCount: 0, log: [], roundLog: [], players: state.players.map((p) => ({ ...p, drinks: 0 })) }
      const r = startRound(base, now)
      return { state: r.state, pending: r.pending, clearPending: true }
    }
    case 'next': {
      if (state.phase !== 'playing') throw new Error('Not playing')
      const revealed = state.round && !state.round.revealed ? reveal(state, now) : state
      const r = startRound(revealed, now, action.kind)
      return { state: r.state, pending: r.pending, clearPending: true }
    }
    case 'reveal':
      return { state: reveal(state, now), pending: null, clearPending: true }
    case 'end':
      return { state: { ...state, phase: 'ended', round: null, updatedAt: now }, pending: null, clearPending: true }
    case 'backToLobby':
      return { state: { ...state, phase: 'lobby', round: null, roundCount: 0, updatedAt: now }, pending: null, clearPending: true }
    case 'kick': {
      const players = state.players.filter((p) => p.id !== action.playerId)
      return { state: { ...state, players, updatedAt: now }, pending: null, clearPending: false }
    }
    case 'makeHost':
      if (!state.players.some((p) => p.id === action.playerId)) throw new Error('Unknown player')
      return { state: { ...state, hostId: action.playerId, updatedAt: now }, pending: null, clearPending: false }
  }
}
