// src/games/hiddenroles/onenight/playerStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPlayers, savePlayers } from './playerStore';

beforeEach(() => localStorage.clear());

describe('playerStore', () => {
  it('returns an empty list when nothing is saved', () => {
    expect(loadPlayers()).toEqual([]);
  });

  it('saves and reloads the player list', () => {
    const players = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ];
    savePlayers(players);
    expect(loadPlayers()).toEqual(players);
  });

  it('returns an empty list for corrupt JSON', () => {
    localStorage.setItem('games-app:onenight:players', 'oops');
    expect(loadPlayers()).toEqual([]);
  });
});
