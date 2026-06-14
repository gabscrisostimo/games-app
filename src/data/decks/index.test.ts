import { describe, it, expect } from 'vitest';
import { DECKS, getDeck, validateDeck } from './index';

describe('decks', () => {
  it('o deck padrão carrega e tem cartas válidas', () => {
    const padrao = getDeck('padrao');
    expect(padrao).toBeDefined();
    expect(padrao!.cards.length).toBeGreaterThanOrEqual(20);
    for (const c of padrao!.cards) {
      expect(typeof c.target).toBe('string');
      expect(c.taboo.length).toBeGreaterThan(0);
    }
  });

  it('DECKS expõe ao menos o padrão', () => {
    expect(DECKS.some((d) => d.id === 'padrao')).toBe(true);
  });

  it('o deck de champions do LoL carrega com cartas válidas e únicas', () => {
    const lol = getDeck('lol-champions');
    expect(lol).toBeDefined();
    expect(lol!.cards.length).toBeGreaterThanOrEqual(150);

    const ids = lol!.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // ids únicos

    for (const c of lol!.cards) {
      expect(c.target).toBe(c.target.toUpperCase());
      expect(c.taboo.length).toBeGreaterThanOrEqual(4);
      // nenhuma palavra-taboo pode entregar o próprio alvo
      for (const t of c.taboo) {
        expect(c.target.includes(t)).toBe(false);
      }
    }
  });

  it('validateDeck rejeita estrutura inválida', () => {
    expect(() => validateDeck({ id: 'x' })).toThrow();
    expect(() => validateDeck({ id: 'x', name: 'y', cards: [{ id: 'a' }] })).toThrow();
  });
});
