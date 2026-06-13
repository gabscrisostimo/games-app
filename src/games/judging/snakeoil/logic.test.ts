// src/games/judging/snakeoil/logic.test.ts
import { describe, it, expect } from 'vitest';
import { shuffle, drawWords, drawPersona, createGame, startRound } from './logic';
import type { MatchConfig, WordDeck, PersonaDeck } from './types';

// rng determinístico: sempre 0 → Math.floor(0 * (i+1)) = 0
const rng0 = () => 0;

describe('shuffle', () => {
  it('preserva os elementos', () => {
    const out = shuffle([1, 2, 3, 4], rng0);
    expect([...out].sort()).toEqual([1, 2, 3, 4]);
  });
  it('não muta o array original', () => {
    const orig = [1, 2, 3];
    shuffle(orig, rng0);
    expect(orig).toEqual([1, 2, 3]);
  });
});

describe('drawWords', () => {
  it('puxa n cartas do topo', () => {
    const r = drawWords(['a', 'b', 'c', 'd'], [], 2, rng0);
    expect(r.cards).toEqual(['a', 'b']);
    expect(r.draw).toEqual(['c', 'd']);
    expect(r.discard).toEqual([]);
  });
  it('reembaralha o discard quando o draw esvazia', () => {
    const r = drawWords(['a'], ['b', 'c'], 3, rng0);
    expect(r.cards.length).toBe(3);
    expect([...r.cards].sort()).toEqual(['a', 'b', 'c']);
    expect(r.draw).toEqual([]);
    expect(r.discard).toEqual([]);
  });
  it('para quando não há cartas suficientes em lugar nenhum', () => {
    const r = drawWords(['a'], [], 5, rng0);
    expect(r.cards).toEqual(['a']);
  });
});

describe('drawPersona', () => {
  it('puxa a persona do topo', () => {
    const r = drawPersona(['p1', 'p2'], [], rng0);
    expect(r.personaId).toBe('p1');
    expect(r.draw).toEqual(['p2']);
  });
  it('reembaralha o discard quando o draw esvazia', () => {
    const r = drawPersona([], ['p3'], rng0);
    expect(r.personaId).toBe('p3');
  });
  it('retorna null quando não há personas', () => {
    const r = drawPersona([], [], rng0);
    expect(r.personaId).toBeNull();
  });
});

const config: MatchConfig = {
  playerNames: ['Ana', 'Beto', 'Caio'],
  handSize: 4,
  cardsPerPitch: 2,
  pitchSeconds: null,
  endMode: 'rotations',
  endValue: 1,
};
const wordDeck: WordDeck = {
  id: 'wd',
  name: 'wd',
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, word: `word${i}` })),
};
const personaDeck: PersonaDeck = {
  id: 'pd',
  name: 'pd',
  cards: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, persona: `persona${i}` })),
};

describe('createGame', () => {
  it('cria jogadores zerados com mão de handSize', () => {
    const g = createGame(config, wordDeck, personaDeck, () => 0);
    expect(g.players).toHaveLength(3);
    expect(g.players.every((p) => p.score === 0)).toBe(true);
    expect(g.players.every((p) => p.hand.length === config.handSize)).toBe(true);
  });
  it('começa em pre-round com round montado (cliente = 0)', () => {
    const g = createGame(config, wordDeck, personaDeck, () => 0);
    expect(g.phase).toBe('pre-round');
    expect(g.round?.customerIndex).toBe(0);
    expect(g.round?.order).toEqual([1, 2]);
    expect(g.round?.personaId).not.toBeNull();
    expect(g.round?.selIndex).toBe(0);
  });
  it('é determinístico com rng fixo', () => {
    const a = createGame(config, wordDeck, personaDeck, () => 0.42);
    const b = createGame(config, wordDeck, personaDeck, () => 0.42);
    expect(a).toEqual(b);
  });
});

describe('startRound', () => {
  it('vai de pre-round para selecting', () => {
    const g = createGame(config, wordDeck, personaDeck, () => 0);
    expect(startRound(g).phase).toBe('selecting');
  });
  it('é no-op fora de pre-round', () => {
    const g = { ...createGame(config, wordDeck, personaDeck, () => 0), phase: 'judging' as const };
    expect(startRound(g)).toBe(g);
  });
});
