import padrao from './infiltrado-padrao.json';
import type { QuestionPair } from '../../types';

export interface InfiltradoDeck { id: string; name: string; pairs: QuestionPair[]; }

export function validateDeck(data: unknown): InfiltradoDeck {
  if (typeof data !== 'object' || data === null) throw new Error('deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.pairs)) {
    throw new Error('deck: campos id/name/pairs ausentes');
  }
  d.pairs.forEach((p, i) => {
    const pair = p as Record<string, unknown>;
    if (typeof pair.id !== 'string' || typeof pair.tema !== 'string' ||
        typeof pair.normal !== 'string' || typeof pair.impostor !== 'string') {
      throw new Error(`par ${i} inválido`);
    }
  });
  return data as InfiltradoDeck;
}

export const INFILTRADO_DECKS: InfiltradoDeck[] = [validateDeck(padrao)];

export function getInfiltradoDeck(id: string): InfiltradoDeck | undefined {
  return INFILTRADO_DECKS.find((d) => d.id === id);
}
