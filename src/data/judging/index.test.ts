import { describe, it, expect } from 'vitest';
import { WORD_DECKS, PERSONA_DECKS, getWordDeck, getPersonaDeck } from './index';

describe('judging decks', () => {
  it('carrega ao menos 1 word deck e 1 persona deck', () => {
    expect(WORD_DECKS.length).toBeGreaterThanOrEqual(1);
    expect(PERSONA_DECKS.length).toBeGreaterThanOrEqual(1);
  });

  it('word deck tem ids únicos e quantidade mínima', () => {
    const deck = WORD_DECKS[0];
    const ids = deck.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(deck.cards.length).toBeGreaterThanOrEqual(24);
  });

  it('persona deck tem ids únicos e quantidade mínima', () => {
    const deck = PERSONA_DECKS[0];
    const ids = deck.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(deck.cards.length).toBeGreaterThanOrEqual(10);
  });

  it('getWordDeck / getPersonaDeck encontram por id', () => {
    expect(getWordDeck('snakeoil-words')?.id).toBe('snakeoil-words');
    expect(getPersonaDeck('snakeoil-personas')?.id).toBe('snakeoil-personas');
    expect(getWordDeck('nao-existe')).toBeUndefined();
  });
});
