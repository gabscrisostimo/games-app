import { describe, it, expect } from 'vitest';
import { buildRound, promptsForPlayer } from './logic';
import type { PromptDeck, QuiplashConfig, Player } from './types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

const deck: PromptDeck = {
  id: 'd', name: 'Teste',
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, text: `Prompt ${i}` })),
};

const cfg = (over: Partial<QuiplashConfig> = {}): QuiplashConfig => ({
  players, mode: 'duel', rounds: 3, deckId: 'd', ...over,
});

const rng0 = () => 0;

describe('buildRound — duelo (anel)', () => {
  it('gera N confrontos; cada jogador é autor em exatamente 2; votam os não-autores', () => {
    const { round } = buildRound(cfg(), 0, deck, [], rng0);
    expect(round.phase).toBe('answering');
    expect(round.multiplier).toBe(1);
    expect(round.isLastLash).toBe(false);
    expect(round.matchups).toHaveLength(players.length);

    // cada jogador autor em 2 confrontos
    for (const p of players) {
      const asAuthor = round.matchups.filter((m) => m.answers.some((a) => a.authorId === p.id));
      expect(asAuthor).toHaveLength(2);
    }
    // cada confronto: 2 autores distintos, voterIds = os outros
    for (const m of round.matchups) {
      expect(m.answers).toHaveLength(2);
      const authors = m.answers.map((a) => a.authorId);
      expect(new Set(authors).size).toBe(2);
      expect(m.voterIds.sort()).toEqual(players.map((p) => p.id).filter((id) => !authors.includes(id)).sort());
      expect(m.answers.every((a) => a.text === '')).toBe(true);
    }
  });

  it('última rodada vira Last Lash (grupo), mesmo no modo duelo', () => {
    const { round } = buildRound(cfg({ rounds: 3 }), 2, deck, [], rng0);
    expect(round.isLastLash).toBe(true);
    expect(round.multiplier).toBe(3);
    expect(round.matchups).toHaveLength(1);
    expect(round.matchups[0].answers).toHaveLength(players.length); // todos respondem
    expect(round.matchups[0].voterIds.sort()).toEqual(players.map((p) => p.id).sort());
  });

  it('não repete prompts já usados (retorna used atualizado)', () => {
    const { round, used } = buildRound(cfg(), 0, deck, [], rng0);
    const ids = round.matchups.map((m) => m.promptId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(used).toEqual(expect.arrayContaining(ids));
    const r2 = buildRound(cfg(), 1, deck, used, rng0);
    const ids2 = r2.round.matchups.map((m) => m.promptId);
    expect(ids2.some((id) => ids.includes(id))).toBe(false);
  });
});

describe('buildRound — grupo', () => {
  it('modo grupo: 1 confronto por rodada, todos respondem e votam', () => {
    const { round } = buildRound(cfg({ mode: 'group' }), 0, deck, [], rng0);
    expect(round.matchups).toHaveLength(1);
    expect(round.matchups[0].answers).toHaveLength(players.length);
    expect(round.matchups[0].voterIds.sort()).toEqual(players.map((p) => p.id).sort());
  });
});

describe('promptsForPlayer', () => {
  it('duelo: 2 índices por jogador; grupo: 1 índice', () => {
    const duel = buildRound(cfg(), 0, deck, [], rng0).round;
    expect(promptsForPlayer(duel, 'a')).toHaveLength(2);
    const group = buildRound(cfg({ mode: 'group' }), 0, deck, [], rng0).round;
    expect(promptsForPlayer(group, 'a')).toEqual([0]);
  });
});
