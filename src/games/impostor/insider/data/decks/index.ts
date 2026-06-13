import padrao from './insider-padrao.json';
import type { WordDeck } from '../../types';

export function validateWordDeck(data: unknown): WordDeck {
  if (typeof data !== 'object' || data === null) throw new Error('deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.cards)) {
    throw new Error('deck: campos id/name/cards ausentes');
  }
  d.cards.forEach((c, i) => {
    const card = c as Record<string, unknown>;
    if (typeof card.id !== 'string' || typeof card.word !== 'string') {
      throw new Error(`carta ${i} inválida`);
    }
  });
  return data as WordDeck;
}

export const INSIDER_DECKS: WordDeck[] = [validateWordDeck(padrao)];

export function getInsiderDeck(id: string): WordDeck | undefined {
  return INSIDER_DECKS.find((d) => d.id === id);
}
