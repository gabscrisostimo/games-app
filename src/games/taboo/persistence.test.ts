// src/games/taboo/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, clearGame } from './persistence';
import { createGame } from './logic';
import type { Deck, MatchConfig } from './types';

const deck: Deck = { id: 'd', name: 'D', cards: [{ id: 'c1', target: 'X', taboo: ['Y'] }] };
const config: MatchConfig = {
  deckId: 'd', turnSeconds: 60, skipLimit: 3, skipCostsPoint: false,
  endMode: 'rounds', endValue: 2, teamNames: ['A', 'B'],
};

describe('persistência', () => {
  beforeEach(() => localStorage.clear());

  it('salva e recarrega o estado', () => {
    const s = createGame(config, deck, () => 0);
    saveGame(s);
    expect(loadGame()).toEqual(s);
  });

  it('loadGame retorna null quando não há nada salvo', () => {
    expect(loadGame()).toBeNull();
  });

  it('clearGame remove o estado salvo', () => {
    saveGame(createGame(config, deck, () => 0));
    clearGame();
    expect(loadGame()).toBeNull();
  });
});
