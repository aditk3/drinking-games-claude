import { Room, type Env } from './room.ts'

export { Room }

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(): string {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const m = url.pathname.match(/^\/api\/rooms(?:\/([A-Za-z0-9]{4}))?(?:\/(ws))?$/)
    if (!m) return env.ASSETS.fetch(request)

    const [, rawCode, ws] = m

    // POST /api/rooms -> create a room, return its code.
    if (!rawCode) {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode()
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
        const { created } = await stub.create(code)
        if (created) return json({ code })
      }
      return json({ error: 'Could not allocate a room code' }, 500)
    }

    const code = rawCode.toUpperCase()
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code))

    // GET /api/rooms/:code -> does it exist, how many players.
    if (!ws) {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
      return json(await stub.info())
    }

    // GET /api/rooms/:code/ws -> websocket, handled by the Durable Object.
    return stub.fetch(request)
  },
} satisfies ExportedHandler<Env>
