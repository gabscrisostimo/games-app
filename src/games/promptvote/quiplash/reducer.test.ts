import { describe, it, expect } from 'vitest';
import { quiplashReducer } from './reducer';
import { createSession, promptsForPlayer } from './logic';
import { getQuiplashDeck } from '../../../data/promptvote';
import type { QuiplashConfig } from './types';

const config: QuiplashConfig = {
  players: [
    { id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' }, { id: 'd', name: 'Duda' },
  ],
  mode: 'duel', rounds: 2, deckId: 'quiplash-padrao',
};

const deck = getQuiplashDeck('quiplash-padrao')!;

describe('quiplashReducer', () => {
  it('SUBMIT_ANSWERS avança o jogador atual', () => {
    const s0 = createSession(config, deck, () => 0);
    const idxs = promptsForPlayer(s0.round, 'a');
    const s1 = quiplashReducer(s0, { type: 'SUBMIT_ANSWERS', playerId: 'a', texts: idxs.map(() => 'x') });
    expect(s1.round.answerIndex).toBe(1);
  });

  it('NEXT_ROUND usa o deck injetado e avança a rodada', () => {
    // leva uma rodada inteira até round-result, depois NEXT_ROUND
    let s = createSession(config, deck, () => 0);
    for (const p of config.players) {
      const idxs = promptsForPlayer(s.round, p.id);
      s = quiplashReducer(s, { type: 'SUBMIT_ANSWERS', playerId: p.id, texts: idxs.map(() => 'x') });
    }
    while (s.round.phase === 'voting') {
      const b = s.round.ballots[s.round.voteCursor];
      const author = s.round.matchups[b.matchupIndex].answers[b.order[0]].authorId;
      s = quiplashReducer(s, { type: 'CAST_VOTE', authorId: author });
    }
    expect(s.round.phase).toBe('round-result');
    const next = quiplashReducer(s, { type: 'NEXT_ROUND' });
    expect(next.round.index).toBe(1);
  });

  it('LOAD substitui o estado', () => {
    const s0 = createSession(config, deck, () => 0);
    expect(quiplashReducer({} as never, { type: 'LOAD', state: s0 })).toBe(s0);
  });
});
