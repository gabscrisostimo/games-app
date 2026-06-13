// src/games/taboo/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import { createGame } from './logic';
import type { Deck, MatchConfig } from './types';

const deck: Deck = {
  id: 'd', name: 'D',
  cards: [
    { id: 'c1', target: 'X', taboo: ['Y'] },
    { id: 'c2', target: 'Z', taboo: ['W'] },
  ],
};
const config: MatchConfig = {
  deckId: 'd', turnSeconds: 60, skipLimit: 3, skipCostsPoint: false,
  endMode: 'rounds', endValue: 1, teamNames: ['A', 'B'],
};

describe('gameReducer', () => {
  it('START_TURN inicia o turno', () => {
    const s = gameReducer(createGame(config, deck, () => 0), { type: 'START_TURN', now: 1000 });
    expect(s.phase).toBe('in-turn');
  });

  it('ACTION aplica o resultado', () => {
    let s = gameReducer(createGame(config, deck, () => 0), { type: 'START_TURN', now: 1000 });
    s = gameReducer(s, { type: 'ACTION', outcome: 'correct' });
    expect(s.teams[0].score).toBe(1);
  });

  it('END_TURN e NEXT_TURN avançam as fases', () => {
    let s = gameReducer(createGame(config, deck, () => 0), { type: 'START_TURN', now: 1000 });
    s = gameReducer(s, { type: 'END_TURN' });
    expect(s.phase).toBe('turn-summary');
    s = gameReducer(s, { type: 'NEXT_TURN' });
    expect(s.currentTeam).toBe(1);
  });
});
