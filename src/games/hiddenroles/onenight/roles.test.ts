// src/games/hiddenroles/onenight/roles.test.ts
import { describe, it, expect } from 'vitest';
import { ROLES, roleDef, teamOf, nightOrderOf } from './roles';
import type { RoleId } from './types';

const ALL: RoleId[] = [
  'werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker',
  'drunk', 'insomniac', 'hunter', 'tanner', 'villager',
];

describe('ROLES registry', () => {
  it('has an entry for every RoleId, keyed by its own id', () => {
    for (const id of ALL) {
      expect(ROLES[id]).toBeDefined();
      expect(ROLES[id].id).toBe(id);
      expect(ROLES[id].name.length).toBeGreaterThan(0);
      expect(ROLES[id].blurb.length).toBeGreaterThan(0);
    }
  });

  it('teamOf maps roles to the correct team', () => {
    expect(teamOf('werewolf')).toBe('werewolf');
    expect(teamOf('minion')).toBe('werewolf');
    expect(teamOf('tanner')).toBe('tanner');
    expect(teamOf('seer')).toBe('village');
    expect(teamOf('villager')).toBe('village');
    expect(teamOf('hunter')).toBe('village');
  });

  it('encodes the canonical night order werewolf<minion<mason<seer<robber<troublemaker<drunk<insomniac', () => {
    const order = ['werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'] as const;
    const values = order.map((id) => nightOrderOf(id)!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('roles with no night action have null nightOrder', () => {
    expect(nightOrderOf('villager')).toBeNull();
    expect(nightOrderOf('hunter')).toBeNull();
    expect(nightOrderOf('tanner')).toBeNull();
  });

  it('encodes box limits: werewolf x2, mason x2, villager x3, rest x1', () => {
    expect(ROLES.werewolf.max).toBe(2);
    expect(ROLES.mason.max).toBe(2);
    expect(ROLES.villager.max).toBe(3);
    expect(ROLES.seer.max).toBe(1);
    expect(ROLES.minion.max).toBe(1);
  });

  it('roleDef returns the full definition', () => {
    expect(roleDef('robber').action).toBe('rob');
    expect(roleDef('seer').action).toBe('seer-peek');
  });
});
