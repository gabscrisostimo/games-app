// src/net/protocol.ts
import type { PlayerId } from './contract';

export type RoomPhase = 'lobby' | 'playing';

export interface PlayerView {
  id: PlayerId;
  nickname: string;
  present: boolean;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  players: PlayerView[];
  hostId: PlayerId | null;
  minPlayers: number;
}

// cliente -> servidor (join é implícito na conexão, via query string)
export type ClientMsg =
  | { t: 'start' }
  | { t: 'action'; action: unknown }; // ação específica do jogo, validada no server

// servidor -> cliente
export type ServerMsg =
  | { t: 'room'; room: RoomView }
  | { t: 'projection'; projection: unknown }
  | { t: 'error'; message: string };
