// src/games/hiddenroles/onenight/logic.test.ts
import { describe, it, expect } from 'vitest';
import { dealRoles } from './logic';
import type { RoleId } from './types';

const bag: RoleId[] = ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'];

describe('dealRoles', () => {
  it('returns a deal the same length as the bag', () => {
    const deal = dealRoles(bag, () => 0);
    expect(deal).toHaveLength(bag.length);
  });

  it('is a permutation of the bag (same multiset of cards)', () => {
    const deal = dealRoles(bag, () => 0.42);
    expect([...deal].sort()).toEqual([...bag].sort());
  });

  it('is deterministic given a fixed rng', () => {
    const a = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    const b = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    expect(a).toEqual(b);
  });

  it('does not mutate the input bag', () => {
    const copy = [...bag];
    dealRoles(bag, () => 0.5);
    expect(bag).toEqual(copy);
  });
});

// rng that yields a fixed sequence then 0
function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}
