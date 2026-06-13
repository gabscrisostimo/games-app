// src/net/server/roomEngine.ts
import type { NetGame, PlayerId } from '../contract';
import type { RoomPhase, RoomView, ServerMsg } from '../protocol';

export interface RoomPlayer {
  id: PlayerId;
  nickname: string;
  present: boolean;
}

export interface RoomState<GS> {
  code: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: RoomPlayer[];
  game: GS | null;
}

export type RoomEvent =
  | { kind: 'join'; playerId: PlayerId; nickname: string }
  | { kind: 'disconnect'; playerId: PlayerId }
  | { kind: 'start'; playerId: PlayerId }
  | { kind: 'action'; playerId: PlayerId; action: unknown }
  | { kind: 'timeout' };

export interface EngineDeps<GS, A extends { type: string }, P, C> {
  game: NetGame<GS, A, P, C>;
  config: C;
  minPlayers: number;
  now: number;
  rng: () => number;
}

export interface Outbound {
  to: 'all' | PlayerId;
  msg: ServerMsg;
}

export interface EngineResult<GS> {
  state: RoomState<GS>;
  outbound: Outbound[];
  deadline: number | null;
}

export function createRoom(code: string): RoomState<never> {
  return { code, phase: 'lobby', hostId: null, players: [], game: null };
}

function roomView<GS>(state: RoomState<GS>, minPlayers: number): RoomView {
  return {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    minPlayers,
    players: state.players.map((p) => ({ id: p.id, nickname: p.nickname, present: p.present })),
  };
}

function projections<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  deps: EngineDeps<GS, A, P, C>,
): Outbound[] {
  if (state.phase !== 'playing' || state.game === null) return [];
  return state.players.map((p) => ({
    to: p.id,
    msg: { t: 'projection', projection: deps.game.project(state.game as GS, p.id) } as ServerMsg,
  }));
}

function deadlineOf<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  deps: EngineDeps<GS, A, P, C>,
): number | null {
  if (state.phase !== 'playing' || state.game === null || !deps.game.deadline) return null;
  return deps.game.deadline(state.game as GS);
}

export function reduceRoom<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  event: RoomEvent,
  deps: EngineDeps<GS, A, P, C>,
): EngineResult<GS> {
  switch (event.kind) {
    case 'join': {
      const existing = state.players.find((p) => p.id === event.playerId);
      let players: RoomPlayer[];
      if (existing) {
        players = state.players.map((p) =>
          p.id === event.playerId ? { ...p, present: true, nickname: event.nickname } : p,
        );
      } else if (state.phase !== 'lobby') {
        // entrar tarde = rejeitado
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Partida em andamento.' } }], deadline: deadlineOf(state, deps) };
      } else {
        players = [...state.players, { id: event.playerId, nickname: event.nickname, present: true }];
      }
      const hostId = state.hostId ?? event.playerId;
      const next: RoomState<GS> = { ...state, players, hostId };
      const out: Outbound[] = [{ to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } }];
      // reconectado durante a partida recebe sua projeção atual
      if (next.phase === 'playing' && next.game !== null) {
        out.push({ to: event.playerId, msg: { t: 'projection', projection: deps.game.project(next.game, event.playerId) } });
      }
      return { state: next, outbound: out, deadline: deadlineOf(next, deps) };
    }

    case 'disconnect': {
      const players = state.players.map((p) =>
        p.id === event.playerId ? { ...p, present: false } : p,
      );
      const next: RoomState<GS> = { ...state, players };
      return {
        state: next,
        outbound: [{ to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } }],
        deadline: deadlineOf(next, deps),
      };
    }

    case 'start': {
      const err = (message: string): EngineResult<GS> => ({
        state,
        outbound: [{ to: event.playerId, msg: { t: 'error', message } }],
        deadline: deadlineOf(state, deps),
      });
      if (state.phase !== 'lobby') return err('Já começou.');
      if (event.playerId !== state.hostId) return err('Só o host pode começar.');
      const present = state.players.filter((p) => p.present);
      if (present.length < deps.minPlayers) return err(`Precisa de ${deps.minPlayers} jogadores.`);
      const game = deps.game.createInitial({
        config: deps.config,
        players: present.map((p) => ({ id: p.id, nickname: p.nickname })),
        now: deps.now,
        rng: deps.rng,
      });
      const next: RoomState<GS> = { ...state, phase: 'playing', game };
      const out: Outbound[] = [
        { to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } },
        ...projections(next, deps),
      ];
      return { state: next, outbound: out, deadline: deadlineOf(next, deps) };
    }

    case 'action': {
      if (state.phase !== 'playing' || state.game === null) {
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Sem partida em curso.' } }], deadline: null };
      }
      const action = event.action as A;
      const legal = deps.game.legalActions(state.game, event.playerId);
      if (!action || typeof action.type !== 'string' || !legal.includes(action.type)) {
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Ação inválida.' } }], deadline: deadlineOf(state, deps) };
      }
      const game = deps.game.reducer(state.game, action, { now: deps.now, rng: deps.rng, actorId: event.playerId });
      const next: RoomState<GS> = { ...state, game };
      return { state: next, outbound: projections(next, deps), deadline: deadlineOf(next, deps) };
    }

    case 'timeout': {
      if (state.phase !== 'playing' || state.game === null || !deps.game.onTimeout) {
        return { state, outbound: [], deadline: deadlineOf(state, deps) };
      }
      const game = deps.game.onTimeout(state.game, { now: deps.now, rng: deps.rng });
      const next: RoomState<GS> = { ...state, game };
      return { state: next, outbound: projections(next, deps), deadline: deadlineOf(next, deps) };
    }

    default:
      return { state, outbound: [], deadline: deadlineOf(state, deps) };
  }
}
