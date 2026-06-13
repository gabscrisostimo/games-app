// src/net/server/index.ts
import type * as Party from 'partykit/server';
import { mulberry32 } from '../rng';
import { promptvoteDemo } from '../__demo__/promptvoteDemo';
import type { DemoState } from '../__demo__/promptvoteDemo';
import type { ClientMsg } from '../protocol';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomState } from './roomEngine';

type ConnState = { playerId: string; nickname: string };

const CONFIG = { promptSeconds: 75, voteSeconds: 60 };
const MIN_PLAYERS = 3;

export default class NetRoom implements Party.Server {
  state: RoomState<DemoState>;
  rng: () => number;

  constructor(readonly room: Party.Room) {
    this.state = createRoom(room.id);
    this.rng = mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  }

  private deps(now: number): EngineDeps<DemoState, any, any, any> {
    return { game: promptvoteDemo, config: CONFIG, minPlayers: MIN_PLAYERS, now, rng: this.rng };
  }

  private async apply(event: Parameters<typeof reduceRoom>[1], now = Date.now()) {
    const result = reduceRoom(this.state, event as any, this.deps(now));
    this.state = result.state as RoomState<DemoState>;
    for (const o of result.outbound) {
      const data = JSON.stringify(o.msg);
      if (o.to === 'all') {
        this.room.broadcast(data);
      } else {
        for (const conn of this.room.getConnections<ConnState>()) {
          if (conn.state?.playerId === o.to) conn.send(data);
        }
      }
    }
    if (result.deadline) await this.room.storage.setAlarm(result.deadline);
  }

  onConnect(conn: Party.Connection<ConnState>, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const playerId = url.searchParams.get('playerId') ?? conn.id;
    const nickname = (url.searchParams.get('nickname') ?? 'Anônimo').slice(0, 20);
    conn.setState({ playerId, nickname });
    return this.apply({ kind: 'join', playerId, nickname });
  }

  onMessage(raw: string, sender: Party.Connection<ConnState>) {
    const playerId = sender.state?.playerId;
    if (!playerId) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }
    if (msg.t === 'start') return this.apply({ kind: 'start', playerId });
    if (msg.t === 'action') return this.apply({ kind: 'action', playerId, action: msg.action });
  }

  onClose(conn: Party.Connection<ConnState>) {
    const playerId = conn.state?.playerId;
    if (playerId) return this.apply({ kind: 'disconnect', playerId });
  }

  onAlarm() {
    return this.apply({ kind: 'timeout' });
  }
}

NetRoom satisfies Party.Worker;
