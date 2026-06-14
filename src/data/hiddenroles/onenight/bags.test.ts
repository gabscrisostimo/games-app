// src/data/hiddenroles/onenight/bags.test.ts
import { describe, it, expect } from 'vitest';
import { recommendedBag, BOX_LIMITS } from './bags';
import { ROLES } from '../../../games/hiddenroles/onenight/roles';
import type { RoleId } from '../../../games/hiddenroles/onenight/types';

function counts(bag: RoleId[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of bag) c[r] = (c[r] ?? 0) + 1;
  return c;
}

describe('recommendedBag', () => {
  it('returns exactly n+3 cards for every player count 3..10', () => {
    for (let n = 3; n <= 10; n++) {
      expect(recommendedBag(n)).toHaveLength(n + 3);
    }
  });

  it('always includes the canonical core (2 wolves + seer + robber + troublemaker)', () => {
    for (let n = 3; n <= 10; n++) {
      const c = counts(recommendedBag(n));
      expect(c.werewolf).toBe(2);
      expect(c.seer).toBe(1);
      expect(c.robber).toBe(1);
      expect(c.troublemaker).toBe(1);
    }
  });

  it('never exceeds box limits for any player count', () => {
    for (let n = 3; n <= 10; n++) {
      const c = counts(recommendedBag(n));
      for (const [role, count] of Object.entries(c)) {
        expect(count).toBeLessThanOrEqual(ROLES[role as RoleId].max);
      }
    }
  });
});

describe('BOX_LIMITS', () => {
  it('mirrors each role max from the registry', () => {
    for (const id of Object.keys(ROLES) as RoleId[]) {
      expect(BOX_LIMITS[id]).toBe(ROLES[id].max);
    }
  });
});
