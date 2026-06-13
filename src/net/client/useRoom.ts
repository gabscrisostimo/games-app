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
      return { ...state, room: msg.room };
    case 'projection':
      return { ...state, projection: msg.projection, error: null };
    case 'error':
      return { ...state, error: msg.message };
    default:
      return state;
  }
}

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

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
