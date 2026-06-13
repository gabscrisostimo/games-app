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

  it('validateDeck rejeita estrutura inválida', () => {
    expect(() => validateDeck({ id: 'x' })).toThrow();
    expect(() => validateDeck({ id: 'x', name: 'y', cards: [{ id: 'a' }] })).toThrow();
  });
});
