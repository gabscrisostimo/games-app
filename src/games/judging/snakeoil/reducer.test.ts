// src/games/judging/snakeoil/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import { createGame } from './logic';
import type { MatchConfig, PersonaDeck, WordDeck } from './types';

const config: MatchConfig = {
  playerNames: ['Ana', 'Beto', 'Caio'],
  handSize: 4,
  cardsPerPitch: 2,
  pitchSeconds: null,
  endMode: 'rotations',
  endValue: 1,
};
const wordDeck: WordDeck = {
  id: 'wd',
  name: 'wd',
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, word: `word${i}` })),
};
const personaDeck: PersonaDeck = {
  id: 'pd',
  name: 'pd',
  cards: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, persona: `persona${i}` })),
};

function fresh() {
  return createGame(config, wordDeck, personaDeck, () => 0);
}

describe('gameReducer', () => {
  it('START_ROUND vai para selecting', () => {
    expect(gameReducer(fresh(), { type: 'START_ROUND' }).phase).toBe('selecting');
  });
  it('SELECT_CARDS grava picks', () => {
    let g = gameReducer(fresh(), { type: 'START_ROUND' });
    const pitcher = g.round!.order[0];
    const picks = g.players[pitcher].hand.slice(0, 2);
    g = gameReducer(g, { type: 'SELECT_CARDS', picks });
    expect(g.round!.picks[pitcher]).toEqual(picks);
  });
  it('fluxo completo até round-summary', () => {
    let g = gameReducer(fresh(), { type: 'START_ROUND' });
    g = gameReducer(g, { type: 'SELECT_CARDS', picks: g.players[g.round!.order[0]].hand.slice(0, 2) });
    g = gameReducer(g, { type: 'SELECT_CARDS', picks: g.players[g.round!.order[1]].hand.slice(0, 2) });
    g = gameReducer(g, { type: 'TO_JUDGING' });
    g = gameReducer(g, { type: 'JUDGE', winnerIndex: g.round!.order[0] });
    expect(g.phase).toBe('round-summary');
  });
  it('LOAD substitui o estado', () => {
    const g = fresh();
    expect(gameReducer({} as never, { type: 'LOAD', state: g })).toBe(g);
  });
  it('ação desconhecida é no-op', () => {
    const g = fresh();
    expect(gameReducer(g, { type: 'XXX' } as never)).toBe(g);
  });
});
