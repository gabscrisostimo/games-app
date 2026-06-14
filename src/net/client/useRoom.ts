// src/net/client/useRoom.ts
import { useCallback, useReducer } from 'react';
import usePartySocket from 'partysocket/react';
import type { ClientMsg, RoomView, ServerMsg } from '../protocol';

export interface ClientState {
  connected: boolean;
  room: RoomView | null;
  projection: unknown | null;
  error: string | null;
}

export const initialClientState: ClientState = {
  connected: false,
  room: null,
  projection: null,
  error: null,
};

export function reduceClientState(state: ClientState, msg: ServerMsg): ClientState {
  switch (msg.t) {
    case 'room':
      return { ...state, room: msg.room, error: null };
    case 'projection':
      return { ...state, projection: msg.projection, error: null };
    case 'error':
      return { ...state, error: msg.message };
    default:
      return state;
  }
}

// Vite injeta `import.meta.env` em runtime. Tipado localmente (sem referência
// global a `vite/client`) pra não alterar o ambiente de tipos do projeto inteiro
// — este é o único arquivo do `src/net/` que lê env var.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
// 1) VITE_PARTYKIT_HOST explícito (dev/túnel) vence. 2) Em prod same-origin
// (app + room server no mesmo deploy workers.dev), usa a origem da página. 3)
// fallback local.
const PARTYKIT_HOST =
  env.VITE_PARTYKIT_HOST ||
  (typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:1999');

export function useRoom(code: string, playerId: string, nickname: string) {
  const [state, dispatch] = useReducer(
    (s: ClientState, a: { type: 'msg'; msg: ServerMsg } | { type: 'open' } | { type: 'close' }) => {
      if (a.type === 'open') return { ...s, connected: true };
      if (a.type === 'close') return { ...s, connected: false };
      return reduceClientState(s, a.msg);
    },
    initialClientState,
  );

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    query: { playerId, nickname },
    onOpen() {
      dispatch({ type: 'open' });
    },
    onMessage(e: MessageEvent) {
      try {
        dispatch({ type: 'msg', msg: JSON.parse(e.data) as ServerMsg });
      } catch {
        /* ignora frame inválido */
      }
    },
    onClose() {
      dispatch({ type: 'close' });
    },
  });

  const send = useCallback(
    (msg: ClientMsg) => socket.send(JSON.stringify(msg)),
    [socket],
  );

  return { state, send };
}
