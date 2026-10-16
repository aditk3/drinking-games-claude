/**
 * Types shared by the Worker (server/) and the React client (src/).
 * Keep this file free of imports from either side.
 */
export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
  connected: boolean
  /** Running tally of drinks assigned by the game. */
  drinks: number
  joinedAt: number
}

export type GameMode = 'prompts' | 'minigames' | 'mixed'

export type PromptKind = 'vote' | 'nhie' | 'wyr' | 'dare' | 'truth' | 'rule'
export type MiniKind = 'reaction' | 'taps' | 'hold' | 'math'
export type RoundKind = PromptKind | MiniKind

type Base = { id: number; kind: RoundKind; revealed: boolean; startedAt: number }

export type Round =
  | (Base & { kind: 'vote'; prompt: string; votes: Record<PlayerId, PlayerId> })
  | (Base & { kind: 'nhie'; prompt: string; answers: Record<PlayerId, boolean> })
  | (Base & { kind: 'wyr'; a: string; b: string; answers: Record<PlayerId, 'a' | 'b'> })
  | (Base & { kind: 'dare' | 'truth'; target: PlayerId; text: string; outcome: 'did' | 'drank' | 'skipped' | null })
  | (Base & { kind: 'rule'; master: PlayerId; text: string })
  | (Base & { kind: 'reaction'; goAt: number | null; results: Record<PlayerId, number> })
  | (Base & { kind: 'taps'; seconds: number; endsAt: number; results: Record<PlayerId, number> })
  | (Base & { kind: 'hold'; targetMs: number; results: Record<PlayerId, number> })
  | (Base & { kind: 'math'; question: string; answer: number; results: Record<PlayerId, { answer: number; at: number }> })

export type RoomState = {
  code: string
  createdAt: number
  updatedAt: number
  hostId: PlayerId | null
  players: Player[]
  phase: 'lobby' | 'playing' | 'ended'
  mode: GameMode
  spice: 'spicy' | 'tame'
  round: Round | null
  roundCount: number
  /** Indices of content already used, per kind, so prompts do not repeat. */
  used: Partial<Record<string, number[]>>
  /** Most recent result lines, newest last. */
  log: string[]
  /** Result lines produced by the current round's reveal. */
  roundLog: string[]
}

/** Actions a player (including the host) can send. */
export type PlayerAction =
  | { type: 'vote'; target: PlayerId }
  | { type: 'nhie'; value: boolean }
  | { type: 'wyr'; value: 'a' | 'b' }
  | { type: 'outcome'; value: 'did' | 'drank' }
  | { type: 'reaction'; ms: number }
  | { type: 'taps'; count: number }
  | { type: 'hold'; ms: number }
  | { type: 'math'; answer: number }
  | { type: 'rename'; name: string }

/** Actions only the host can send. */
export type HostAction =
  | { type: 'start'; mode: GameMode; spice?: 'spicy' | 'tame' }
  | { type: 'next'; kind?: RoundKind }
  | { type: 'reveal' }
  | { type: 'end' }
  | { type: 'backToLobby' }
  | { type: 'kick'; playerId: PlayerId }
  | { type: 'makeHost'; playerId: PlayerId }

export type ClientMessage = { type: 'act'; action: PlayerAction } | { type: 'host'; action: HostAction }

export type ServerMessage =
  | { type: 'state'; state: RoomState; you: PlayerId; serverTime: number }
  | { type: 'error'; message: string }
