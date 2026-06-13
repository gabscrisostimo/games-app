import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession } from './persistence';
import { createSession } from './logic';
import type { InsiderConfig } from './types';

const config: InsiderConfig = {
  deckId: 'insider-padrao',
  guessSeconds: 300,
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
    { id: 'd', name: 'Duda' },
  ],
  masterMode: 'rotate',
};

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('salva e recarrega o mesmo estado', () => {
    const s = createSession(config);
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('loadSession retorna null quando vazio', () => {
    expect(loadSession()).toBeNull();
  });

  it('loadSession retorna null para JSON corrompido', () => {
    localStorage.setItem('games-app:insider:current', '{not json');
    expect(loadSession()).toBeNull();
  });

  it('clearSession remove o estado salvo', () => {
    saveSession(createSession(config));
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
