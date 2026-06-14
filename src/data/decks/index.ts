import padrao from './padrao.json';
import lolChampions from './lol-champions.json';
import type { Deck } from '../../games/taboo/types';

export function validateDeck(data: unknown): Deck {
  if (typeof data !== 'object' || data === null) throw new Error('deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.cards)) {
    throw new Error('deck: campos id/name/cards ausentes');
  }
  d.cards.forEach((c, i) => {
    const card = c as Record<string, unknown>;
    if (typeof card.id !== 'string' || typeof card.target !== 'string' || !Array.isArray(card.taboo)) {
      throw new Error(`carta ${i} inválida`);
    }
  });
  return data as Deck;
}

export const DECKS: Deck[] = [validateDeck(padrao), validateDeck(lolChampions)];

export function getDeck(id: string): Deck | undefined {
  return DECKS.find((d) => d.id === id);
}
