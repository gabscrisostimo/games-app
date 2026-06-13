import { describe, it, expect, beforeEach } from 'vitest';
import { loadPlayers, savePlayers } from './playerStore';

beforeEach(() => localStorage.clear());

describe('playerStore', () => {
  it('retorna lista vazia quando não há nada salvo', () => {
    expect(loadPlayers()).toEqual([]);
  });

  it('salva e recarrega a lista de jogadores', () => {
    const players = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ];
    savePlayers(players);
    expect(loadPlayers()).toEqual(players);
  });

  it('retorna lista vazia para JSON corrompido', () => {
    localStorage.setItem('games-app:insider:players', 'oops');
    expect(loadPlayers()).toEqual([]);
  });
});
