import padrao from './quiplash-padrao.json';
import type { PromptDeck } from '../../games/promptvote/quiplash/types';

export function validatePromptDeck(data: unknown): PromptDeck {
  if (typeof data !== 'object' || data === null) throw new Error('deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.cards)) {
    throw new Error('deck: campos id/name/cards ausentes');
  }
  d.cards.forEach((c, i) => {
    const card = c as Record<string, unknown>;
    if (typeof card.id !== 'string' || typeof card.text !== 'string') {
      throw new Error(`carta ${i} inválida`);
    }
  });
  return data as PromptDeck;
}

export const QUIPLASH_DECKS: PromptDeck[] = [validatePromptDeck(padrao)];

export function getQuiplashDeck(id: string): PromptDeck | undefined {
  return QUIPLASH_DECKS.find((d) => d.id === id);
}
