import { describe, expect, it } from 'vitest';
import { initialClientState, reduceClientState } from './useRoom';
import type { RoomView } from '../protocol';

const room: RoomView = {
  code: 'WXYZ',
  phase: 'lobby',
  hostId: 'a',
  minPlayers: 3,
  players: [{ id: 'a', nickname: 'Ana', present: true }],
};

describe('reduceClientState', () => {
  it('aplica room snapshot', () => {
    const s = reduceClientState(initialClientState, { t: 'room', room });
    expect(s.room).toEqual(room);
  });

  it('aplica projeção e limpa erro', () => {
    let s = reduceClientState(initialClientState, { t: 'error', message: 'x' });
    expect(s.error).toBe('x');
    s = reduceClientState(s, { t: 'projection', projection: { phase: 'answering' } });
    expect(s.projection).toEqual({ phase: 'answering' });
    expect(s.error).toBeNull();
  });

  it('guarda mensagem de erro', () => {
    const s = reduceClientState(initialClientState, { t: 'error', message: 'Ação inválida.' });
    expect(s.error).toBe('Ação inválida.');
  });
});
