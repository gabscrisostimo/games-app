import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../net/rng';
import { infiltrado as G } from './logic';
import type { InfiltradoConfig, InfiltradoState } from './types';

const players = [
  { id: 'a', nickname: 'Ana' }, { id: 'b', nickname: 'Bia' }, { id: 'c', nickname: 'Cau' },
  { id: 'd', nickname: 'Dan' },
];

const cfg = (over: Partial<InfiltradoConfig> = {}): InfiltradoConfig =>
  ({ impostorCount: 1, rounds: 0, answerSeconds: 90, voteSeconds: 60, ...over });

function init(over: Partial<InfiltradoConfig> = {}, now = 1000, seed = 1): InfiltradoState {
  return G.createInitial({ config: cfg(over), players, now, rng: mulberry32(seed) });
}
const ctx = (actorId: string, now = 2000, seed = 7) => ({ now, rng: mulberry32(seed), actorId });

describe('createInitial', () => {
  it('começa em answering, scores zerados, endsAt carimbado', () => {
    const s = init({}, 1000);
    expect(s.phase).toBe('answering');
    expect(s.endsAt).toBe(1000 + 90 * 1000);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(s.roundIndex).toBe(0);
  });

  it('totalRounds = nº de jogadores quando rounds=0', () => {
    expect(init({ rounds: 0 }).totalRounds).toBe(4);
    expect(init({ rounds: 2 }).totalRounds).toBe(2);
  });

  it('escolhe 1 impostor por padrão, dentro dos jogadores', () => {
    const s = init();
    expect(s.currentImpostors).toHaveLength(1);
    expect(players.map((p) => p.id)).toContain(s.currentImpostors[0]);
  });

  it('impostorSchedule tem totalRounds entradas', () => {
    const s = init({ rounds: 0 });
    expect(s.impostorSchedule).toHaveLength(4);
    s.impostorSchedule.forEach((r) => expect(r).toHaveLength(1));
  });
});
