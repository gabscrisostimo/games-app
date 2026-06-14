// src/games/hiddenroles/onenight/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { oneNightReducer } from './reducer';
import { createSession } from './logic';
import type { Config, SessionState } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};

describe('oneNightReducer', () => {
  it('runs the happy path night -> discussion -> vote -> result', () => {
    let s = createSession(config, () => 0); // players [werewolf, seer, robber]
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    expect(s.round.phase).toBe('discussion'); // no insomniac in bag

    s = oneNightReducer(s, { type: 'START_DISCUSSION', now: 1000 });
    expect(s.round.endsAt).toBe(1000 + 300 * 1000);

    s = oneNightReducer(s, { type: 'BEGIN_VOTE' });
    expect(s.round.phase).toBe('vote');

    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 0 });
    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 0 });
    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 1 });
    expect(s.round.phase).toBe('result');
    expect(s.round.winners).not.toBeNull();
  });

  it('PLAY_AGAIN starts a new night preserving scores', () => {
    let s = createSession(config, () => 0);
    s = { ...s, scores: { a: 3 } };
    s = oneNightReducer(s, { type: 'PLAY_AGAIN' });
    expect(s.round.phase).toBe('night');
    expect(s.scores).toEqual({ a: 3 });
  });

  it('LOAD replaces the state', () => {
    const s = createSession(config, () => 0);
    const loaded: SessionState = { ...s, scores: { z: 9 } };
    expect(oneNightReducer(s, { type: 'LOAD', state: loaded })).toBe(loaded);
  });
});
