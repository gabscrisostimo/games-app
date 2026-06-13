import { describe, it, expect } from 'vitest';
import { insiderReducer } from './reducer';
import { createSession } from './logic';
import type { InsiderConfig, Player, SessionState } from './types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

// deckId real para o reducer resolver via getInsiderDeck
const config = (masterMode: 'rotate' | 'choose'): InsiderConfig => ({
  deckId: 'insider-padrao',
  guessSeconds: 300,
  players,
  masterMode,
});

describe('insiderReducer', () => {
  it('percorre o fluxo feliz até o resultado', () => {
    let s = createSession(config('rotate')); // master-announce
    s = insiderReducer(s, { type: 'BEGIN_REVEAL' });
    expect(s.round.phase).toBe('role-reveal');
    expect(s.round.word).not.toBe('');
    expect(s.round.insiderId).not.toBe('');
    expect(s.round.insiderId).not.toBe(s.round.masterId);

    for (let i = 0; i < players.length; i++) {
      s = insiderReducer(s, { type: 'ADVANCE_REVEAL' });
    }
    expect(s.round.phase).toBe('guessing');

    s = insiderReducer(s, { type: 'START_GUESSING', now: 1000 });
    expect(s.round.endsAt).toBe(1000 + 300 * 1000);

    s = insiderReducer(s, { type: 'MARK_GUESSED' });
    expect(s.round.phase).toBe('insider-hunt');

    s = insiderReducer(s, { type: 'ACCUSE', accusation: { kind: 'player', id: s.round.insiderId } });
    expect(s.round.phase).toBe('result');
    expect(s.round.outcome).toBe('insider-caught');
  });

  it('SELECT_MASTER no modo choose', () => {
    let s = createSession(config('choose')); // master-select
    s = insiderReducer(s, { type: 'SELECT_MASTER', playerId: 'c' });
    expect(s.round.masterId).toBe('c');
    expect(s.round.phase).toBe('master-announce');
  });

  it('TIME_UP encerra como not-guessed', () => {
    let s = createSession(config('rotate'));
    s = insiderReducer(s, { type: 'BEGIN_REVEAL' });
    for (let i = 0; i < players.length; i++) s = insiderReducer(s, { type: 'ADVANCE_REVEAL' });
    s = insiderReducer(s, { type: 'START_GUESSING', now: 1000 });
    s = insiderReducer(s, { type: 'TIME_UP' });
    expect(s.round.outcome).toBe('not-guessed');
    expect(s.round.phase).toBe('result');
  });

  it('LOAD substitui o estado', () => {
    const s = createSession(config('rotate'));
    const loaded: SessionState = { ...s, masterRotation: ['z'] };
    expect(insiderReducer(s, { type: 'LOAD', state: loaded })).toBe(loaded);
  });
});
