import { describe, expect, it } from 'vitest';
import { INFILTRADO_DECKS, getInfiltradoDeck, validateDeck } from './index';

describe('infiltrado decks', () => {
  it('o deck padrão carrega e tem pares bem-formados', () => {
    const deck = getInfiltradoDeck('infiltrado-padrao');
    expect(deck).toBeDefined();
    expect(deck!.pairs.length).toBeGreaterThanOrEqual(8);
    for (const p of deck!.pairs) {
      expect(p.id).toBeTruthy();
      expect(p.normal).toBeTruthy();
      expect(p.impostor).toBeTruthy();
      expect(p.normal).not.toBe(p.impostor);
    }
  });

  it('validateDeck rejeita estrutura inválida', () => {
    expect(() => validateDeck({ id: 'x', name: 'x', pairs: [{ id: '1' }] })).toThrow();
    expect(() => validateDeck(null)).toThrow();
  });

  it('expõe ao menos um deck', () => {
    expect(INFILTRADO_DECKS.length).toBeGreaterThanOrEqual(1);
  });
});
