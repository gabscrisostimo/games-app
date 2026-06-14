// src/games/hiddenroles/onenight/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession } from './persistence';
import { createSession } from './logic';
import type { Config } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('saves and reloads the same state', () => {
    const s = createSession(config, () => 0);
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('loadSession returns null when empty', () => {
    expect(loadSession()).toBeNull();
  });

  it('loadSession returns null for corrupt JSON', () => {
    localStorage.setItem('games-app:onenight:current', '{nope');
    expect(loadSession()).toBeNull();
  });

  it('clearSession removes the saved state', () => {
    saveSession(createSession(config, () => 0));
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
