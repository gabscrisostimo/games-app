// src/net/server/index.ts
// Room server multiplayer em Cloudflare Workers + Durable Objects (partyserver).
// Migrado do partykit/server — a lógica de sala (roomEngine) é pura e inalterada;
// aqui só fica o glue de ciclo de vida WS → reduceRoom → broadcast/alarm.
// Build/deploy: wrangler (ver wrangler.jsonc). Typecheck: tsconfig.server.json.
import {
  Server,
  routePartykitRequest,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from 'partyserver';
import { mulberry32 } from '../rng';
import { quiplashNet } from '../adapters/quiplash';
import type { QuiplashNetState } from '../adapters/quiplash';
import type { ClientMsg } from '../protocol';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomEvent, RoomState } from './roomEngine';

type ConnState = { playerId: string; nickname: string };

const CONFIG = {
  mode: 'duel' as const,
  rounds: 2,
  deckId: 'quiplash-padrao',
  answerSeconds: 90,
  voteSeconds: 45,
};
const MIN_PLAYERS = 3;

function freshRng(): () => number {
  return mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}

export class Main extends Server<Env> {
  // Estado da sala em memória (sem persistência durável — limitação de PoC; a
  // sala fica viva enquanto há conexões). Inicializado de forma preguiçosa no
  // 1º evento, pois `this.name` só existe após o construtor.
  private state: RoomState<QuiplashNetState> | null = null;
  private rng: () => number = freshRng();

  private ensureRoom(): RoomState<QuiplashNetState> {
    if (this.state === null) this.state = createRoom(this.name);
    return this.state;
  }

  private deps(now: number): EngineDeps<QuiplashNetState, any, any, any> {
    return { game: quiplashNet, config: CONFIG, minPlayers: MIN_PLAYERS, now, rng: this.rng };
  }

  private async apply(event: RoomEvent, now = Date.now()): Promise<void> {
    const result = reduceRoom(this.ensureRoom(), event, this.deps(now));
    this.state = result.state as RoomState<QuiplashNetState>;
    for (const o of result.outbound) {
      const data = JSON.stringify(o.msg);
      if (o.to === 'all') {
        this.broadcast(data);
      } else {
        for (const conn of this.getConnections<ConnState>()) {
          if (conn.state?.playerId === o.to) conn.send(data);
        }
      }
    }
    if (result.deadline) await this.ctx.storage.setAlarm(result.deadline);
  }

  onConnect(conn: Connection<ConnState>, ctx: ConnectionContext): Promise<void> {
    const url = new URL(ctx.request.url);
    const playerId = url.searchParams.get('playerId') ?? conn.id;
    const nickname = (url.searchParams.get('nickname') ?? 'Anônimo').slice(0, 20);
    conn.setState({ playerId, nickname });
    return this.apply({ kind: 'join', playerId, nickname });
  }

  onMessage(conn: Connection<ConnState>, message: WSMessage): Promise<void> | void {
    const playerId = conn.state?.playerId;
    if (!playerId || typeof message !== 'string') return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(message) as ClientMsg;
    } catch {
      return;
    }
    if (msg.t === 'start') return this.apply({ kind: 'start', playerId });
    if (msg.t === 'action') return this.apply({ kind: 'action', playerId, action: msg.action });
  }

  onClose(conn: Connection<ConnState>): Promise<void> | void {
    const playerId = conn.state?.playerId;
    if (playerId) return this.apply({ kind: 'disconnect', playerId });
  }

  onAlarm(): Promise<void> {
    return this.apply({ kind: 'timeout' });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) ?? new Response('Not Found', { status: 404 });
  },
};
