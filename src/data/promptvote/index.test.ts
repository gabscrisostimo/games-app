import { describe, it, expect } from 'vitest';
import { QUIPLASH_DECKS, getQuiplashDeck, validatePromptDeck } from './index';

describe('promptvote decks', () => {
  it('carrega o deck padrão com cards válidos', () => {
    expect(QUIPLASH_DECKS.length).toBeGreaterThanOrEqual(1);
    const d = QUIPLASH_DECKS[0];
    expect(d.id).toBe('quiplash-padrao');
    expect(d.cards.length).toBeGreaterThanOrEqual(40);
    d.cards.forEach((c) => {
      expect(typeof c.id).toBe('string');
      expect(c.text.length).toBeGreaterThan(0);
    });
  });

  it('getQuiplashDeck acha por id e devolve undefined pra id inexistente', () => {
    expect(getQuiplashDeck('quiplash-padrao')?.id).toBe('quiplash-padrao');
    expect(getQuiplashDeck('nao-existe')).toBeUndefined();
  });

  it('validatePromptDeck rejeita shape inválido', () => {
    expect(() => validatePromptDeck(null)).toThrow();
    expect(() => validatePromptDeck({ id: 'x' })).toThrow();
    expect(() => validatePromptDeck({ id: 'x', name: 'y', cards: [{ id: 1 }] })).toThrow();
    expect(() => validatePromptDeck({ id: 'x', name: 'y', cards: [{ id: 'a' }] })).toThrow(); // text ausente
  });
});
