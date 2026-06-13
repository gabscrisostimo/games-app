// src/games/judging/snakeoil/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, clearGame } from './persistence';
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
const personaDeck: PersonaDeck = { id: 'pd', name: 'pd', cards: [{ id: 'p0', persona: 'x' }] };

describe('persistence', () => {
  beforeEach(() => clearGame());
  it('save → load devolve o mesmo estado', () => {
    const g = createGame(config, wordDeck, personaDeck, () => 0);
    saveGame(g);
    expect(loadGame()).toEqual(g);
  });
  it('load devolve null quando não há nada', () => {
    expect(loadGame()).toBeNull();
  });
  it('clear remove o estado', () => {
    saveGame(createGame(config, wordDeck, personaDeck, () => 0));
    clearGame();
    expect(loadGame()).toBeNull();
  });
});
