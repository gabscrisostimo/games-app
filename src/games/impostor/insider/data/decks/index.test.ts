import { describe, it, expect } from 'vitest';
import { INSIDER_DECKS, getInsiderDeck, validateWordDeck } from './index';

describe('INSIDER_DECKS', () => {
  it('carrega ao menos um deck válido com cartas', () => {
    expect(INSIDER_DECKS.length).toBeGreaterThan(0);
    expect(INSIDER_DECKS[0].cards.length).toBeGreaterThan(0);
  });
});

describe('getInsiderDeck', () => {
  it('encontra o deck padrão pelo id', () => {
    expect(getInsiderDeck('insider-padrao')?.name).toBe('Padrão');
  });
  it('retorna undefined para id desconhecido', () => {
    expect(getInsiderDeck('nope')).toBeUndefined();
  });
});

describe('validateWordDeck', () => {
  it('rejeita objeto sem cards', () => {
    expect(() => validateWordDeck({ id: 'x', name: 'y' })).toThrow();
  });
  it('rejeita carta sem word', () => {
    expect(() => validateWordDeck({ id: 'x', name: 'y', cards: [{ id: 'a' }] })).toThrow();
  });
});
