// src/games/judging/snakeoil/logic.test.ts
import { describe, it, expect } from 'vitest';
import { shuffle, drawWords, drawPersona } from './logic';

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
