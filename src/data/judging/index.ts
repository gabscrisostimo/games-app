// src/data/judging/index.ts
import words from './snakeoil-words.json';
import personas from './snakeoil-personas.json';
import type { WordDeck, PersonaDeck } from '../../games/judging/snakeoil/types';

export function validateWordDeck(data: unknown): WordDeck {
  if (typeof data !== 'object' || data === null) throw new Error('word deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.cards)) {
    throw new Error('word deck: campos id/name/cards ausentes');
  }
  d.cards.forEach((c, i) => {
    const card = c as Record<string, unknown>;
    if (typeof card.id !== 'string' || typeof card.word !== 'string') {
      throw new Error(`word card ${i} inválida`);
    }
  });
  return data as WordDeck;
}

export function validatePersonaDeck(data: unknown): PersonaDeck {
  if (typeof data !== 'object' || data === null) throw new Error('persona deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.cards)) {
    throw new Error('persona deck: campos id/name/cards ausentes');
  }
  d.cards.forEach((c, i) => {
    const card = c as Record<string, unknown>;
    if (typeof card.id !== 'string' || typeof card.persona !== 'string') {
      throw new Error(`persona card ${i} inválida`);
    }
  });
  return data as PersonaDeck;
}

export const WORD_DECKS: WordDeck[] = [validateWordDeck(words)];
export const PERSONA_DECKS: PersonaDeck[] = [validatePersonaDeck(personas)];

export function getWordDeck(id: string): WordDeck | undefined {
  return WORD_DECKS.find((d) => d.id === id);
}

export function getPersonaDeck(id: string): PersonaDeck | undefined {
  return PERSONA_DECKS.find((d) => d.id === id);
}
