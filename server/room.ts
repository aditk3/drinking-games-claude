import { DurableObject } from 'cloudflare:workers'
import type { ClientMessage, RoomState, ServerMessage } from '../shared/types.ts'
import { applyHost, applyPlayer, createRoom, fireGo, reveal, setConnected, upsertPlayer, type Pending } from '../shared/game.ts'

export type Env = {
  ROOMS: DurableObjectNamespace<Room>
  ASSETS: Fetcher
}

const IDLE_MS = 6 * 60 * 60 * 1000

type Attachment = { playerId: string }

/** One Durable Object per room code. Holds the state and every player's websocket. */
export class Room extends DurableObject<Env> {
  private state: RoomState | null = null
  private pending: Pending = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      const saved = (await ctx.storage.get<RoomState>('state')) ?? null
      // Fill in fields added after a room was first saved, so older rooms keep working.
      this.state = saved ? { ...saved, roundLog: saved.roundLog ?? [], spice: saved.spice ?? 'spicy', used: saved.used ?? {} } : null
      this.pending = (await ctx.storage.get<Pending>('pending')) ?? null
    })
  }

  /** RPC from the Worker: create the room if it does not exist yet. */
  async create(code: string): Promise<{ created: boolean }> {
    if (this.state) return { created: false }
    this.state = createRoom(code, Date.now())
    await this.persist()
    await this.scheduleIdle()
    return { created: true }
  }

  /** RPC from the Worker: light info for the join screen. */
  async info(): Promise<{ exists: boolean; players: number; phase: string | null }> {
    if (!this.state) return { exists: false, players: 0, phase: null }
    return { exists: true, players: this.state.players.length, phase: this.state.phase }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 })
    if (!this.state) return new Response('Room not found', { status: 404 })
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId') ?? ''
    const name = url.searchParams.get('name') ?? ''
    if (!/^[a-z0-9-]{8,40}$/i.test(playerId)) return new Response('Bad player id', { status: 400 })

    try {
      this.state = upsertPlayer(this.state, playerId, name, Date.now())
    } catch (err) {
      return new Response((err as Error).message, { status: 403 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server, [playerId])
    server.serializeAttachment({ playerId } satisfies Attachment)
    await this.persist()
    this.broadcast()
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.state || typeof raw !== 'string') return
    const { playerId } = ws.deserializeAttachment() as Attachment
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const now = Date.now()
    try {
      if (msg.type === 'act') {
        this.state = applyPlayer(this.state, playerId, msg.action, now)
      } else if (msg.type === 'host') {
        if (this.state.hostId !== playerId) throw new Error('Only the host can do that')
        const r = applyHost(this.state, msg.action, now)
        this.state = r.state
        if (r.clearPending) await this.setPending(r.pending)
      } else {
        return
      }
    } catch (err) {
      this.send(ws, { type: 'error', message: (err as Error).message })
      return
    }
    await this.persist()
    this.broadcast()
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleGone(ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleGone(ws)
  }

  private async handleGone(ws: WebSocket): Promise<void> {
    if (!this.state) return
    const { playerId } = ws.deserializeAttachment() as Attachment
    const still = this.ctx.getWebSockets(playerId).filter((s) => s !== ws && s.readyState === WebSocket.READY_STATE_OPEN)
    if (still.length > 0) return
    this.state = setConnected(this.state, playerId, false, Date.now())
    await this.persist()
    this.broadcast()
  }

  async alarm(): Promise<void> {
    const now = Date.now()
    if (!this.state) return
    if (this.pending && now >= this.pending.at - 50) {
      if (this.pending.what === 'go') this.state = fireGo(this.state, now)
      else this.state = reveal(this.state, now)
      this.pending = null
      await this.persist()
      this.broadcast()
      await this.scheduleIdle()
      return
    }
    if (this.pending) {
      await this.ctx.storage.setAlarm(this.pending.at)
      return
    }
    if (now - this.state.updatedAt >= IDLE_MS) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room expired')
      await this.ctx.storage.deleteAll()
      this.state = null
      return
    }
    await this.scheduleIdle()
  }

  private async setPending(p: Pending): Promise<void> {
    this.pending = p
    await this.ctx.storage.put('pending', p)
    if (p) await this.ctx.storage.setAlarm(p.at)
    else await this.scheduleIdle()
  }

  private async scheduleIdle(): Promise<void> {
    if (this.pending) return
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS)
  }

  private async persist(): Promise<void> {
    if (this.state) await this.ctx.storage.put('state', this.state)
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      /* socket already gone */
    }
  }

  private broadcast(): void {
    if (!this.state) return
    const serverTime = Date.now()
    for (const ws of this.ctx.getWebSockets()) {
      const { playerId } = ws.deserializeAttachment() as Attachment
      this.send(ws, { type: 'state', state: this.state, you: playerId, serverTime })
    }
  }
}
