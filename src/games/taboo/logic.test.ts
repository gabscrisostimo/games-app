// src/games/taboo/logic.test.ts
import { describe, it, expect } from 'vitest';
import { shuffle, createGame, drawNext, startTurn, applyAction, canSkip, endTurn, nextTurn, isGameOver, getWinner } from './logic';
import type { Deck, MatchConfig } from './types';

const deck: Deck = {
  id: 'd1',
  name: 'Teste',
  cards: [
    { id: 'c1', target: 'FRIO', taboo: ['QUENTE'] },
    { id: 'c2', target: 'GATO', taboo: ['MIAU'] },
    { id: 'c3', target: 'SOL', taboo: ['LUZ'] },
  ],
};

const config: MatchConfig = {
  deckId: 'd1',
  turnSeconds: 60,
  skipLimit: 3,
  skipCostsPoint: false,
  endMode: 'rounds',
  endValue: 2,
  teamNames: ['Time A', 'Time B'],
};

describe('shuffle', () => {
  it('preserva todos os elementos (permutação)', () => {
    const out = shuffle([1, 2, 3, 4, 5], () => 0);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('não muta o array original', () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0.5);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('createGame', () => {
  it('cria estado inicial com pilha embaralhada e fase pre-turn', () => {
    const s = createGame(config, deck, () => 0);
    expect(s.drawPile.length).toBe(3);
    expect([...s.drawPile].sort()).toEqual(['c1', 'c2', 'c3']);
    expect(s.discardPile).toEqual([]);
    expect(s.teams.map((t) => t.score)).toEqual([0, 0]);
    expect(s.teams.map((t) => t.name)).toEqual(['Time A', 'Time B']);
    expect(s.currentTeam).toBe(0);
    expect(s.turnsTaken).toBe(0);
    expect(s.turn).toBeNull();
    expect(s.phase).toBe('pre-turn');
  });
});

describe('drawNext', () => {
  it('compra a primeira carta da pilha', () => {
    const r = drawNext(['c1', 'c2'], []);
    expect(r.cardId).toBe('c1');
    expect(r.drawPile).toEqual(['c2']);
    expect(r.discardPile).toEqual([]);
  });
  it('re-embaralha o descarte quando a pilha está vazia', () => {
    const r = drawNext([], ['c1', 'c2'], () => 0);
    expect(r.cardId).not.toBeNull();
    expect([r.cardId, ...r.drawPile].sort()).toEqual(['c1', 'c2']);
    expect(r.discardPile).toEqual([]);
  });
  it('retorna null quando não há cartas em lugar nenhum', () => {
    const r = drawNext([], []);
    expect(r.cardId).toBeNull();
  });
});

describe('startTurn', () => {
  it('inicia o turno, compra carta e seta endsAt pelo timestamp', () => {
    const s0 = createGame(config, deck, () => 0);
    const now = 1_000_000;
    const s = startTurn(s0, now, () => 0);
    expect(s.phase).toBe('in-turn');
    expect(s.turn).not.toBeNull();
    expect(s.turn!.endsAt).toBe(now + config.turnSeconds * 1000);
    expect(s.turn!.skipsUsed).toBe(0);
    expect(s.turn!.currentCardId).not.toBeNull();
    expect(s.drawPile.length).toBe(2);
  });
});

function inTurn(overrides: Partial<MatchConfig> = {}) {
  const cfg = { ...config, ...overrides };
  let s = createGame(cfg, deck, () => 0);
  s = startTurn(s, 1_000_000, () => 0);
  return s;
}

describe('applyAction', () => {
  it('acerto soma +1 ao time atual e registra o resultado', () => {
    const s0 = inTurn();
    const played = s0.turn!.currentCardId!;
    const s = applyAction(s0, 'correct', () => 0);
    expect(s.teams[0].score).toBe(1);
    expect(s.teams[1].score).toBe(0);
    expect(s.turn!.results.at(-1)).toEqual({ cardId: played, outcome: 'correct' });
    expect(s.discardPile).toContain(played);
    expect(s.turn!.currentCardId).not.toBe(played);
  });

  it('proibida tira -1 e avança a carta', () => {
    const s = applyAction(inTurn(), 'taboo', () => 0);
    expect(s.teams[0].score).toBe(-1);
    expect(s.turn!.results.at(-1)!.outcome).toBe('taboo');
  });

  it('pular com skipCostsPoint=false não muda placar mas conta no limite', () => {
    const s = applyAction(inTurn({ skipCostsPoint: false }), 'skip', () => 0);
    expect(s.teams[0].score).toBe(0);
    expect(s.turn!.skipsUsed).toBe(1);
  });

  it('pular com skipCostsPoint=true tira -1', () => {
    const s = applyAction(inTurn({ skipCostsPoint: true }), 'skip', () => 0);
    expect(s.teams[0].score).toBe(-1);
    expect(s.turn!.skipsUsed).toBe(1);
  });

  it('respeita o limite de pulos (canSkip e no-op ao exceder)', () => {
    let s = inTurn({ skipLimit: 1, skipCostsPoint: false });
    s = applyAction(s, 'skip', () => 0);
    expect(canSkip(s)).toBe(false);
    const before = s;
    s = applyAction(s, 'skip', () => 0); // deve ser ignorado
    expect(s).toBe(before);
  });

  it('skipLimit null = pulos ilimitados', () => {
    const s = inTurn({ skipLimit: null });
    expect(canSkip(s)).toBe(true);
  });
});

describe('fim de turno e de jogo', () => {
  it('endTurn move a fase para turn-summary', () => {
    const s = endTurn(inTurn());
    expect(s.phase).toBe('turn-summary');
  });

  it('nextTurn alterna o time e volta pra pre-turn quando o jogo não acabou', () => {
    let s = endTurn(inTurn()); // turnsTaken=0, currentTeam=0
    s = nextTurn(s);
    expect(s.turnsTaken).toBe(1);
    expect(s.currentTeam).toBe(1);
    expect(s.phase).toBe('pre-turn');
    expect(s.turn).toBeNull();
  });

  it('modo rodadas: termina após cada time jogar endValue turnos', () => {
    // endValue=2 => 4 turnos no total
    let s = createGame({ ...config, endMode: 'rounds', endValue: 2 }, deck, () => 0);
    for (let i = 0; i < 4; i++) {
      s = startTurn(s, 1_000_000, () => 0);
      s = endTurn(s);
      s = nextTurn(s);
    }
    expect(s.turnsTaken).toBe(4);
    expect(s.phase).toBe('game-over');
  });

  it('modo rodadas: NÃO termina no meio de uma rodada (turnos ímpares)', () => {
    let s = createGame({ ...config, endMode: 'rounds', endValue: 1 }, deck, () => 0);
    s = startTurn(s, 1_000_000, () => 0);
    s = nextTurn(endTurn(s)); // 1 turno: ímpar, rodada incompleta
    expect(s.phase).toBe('pre-turn');
    s = startTurn(s, 1_000_000, () => 0);
    s = nextTurn(endTurn(s)); // 2 turnos: rodada completa => fim
    expect(s.phase).toBe('game-over');
  });

  it('modo pontos: termina quando um time atinge a meta, no fim de uma rodada', () => {
    let s = createGame({ ...config, endMode: 'points', endValue: 2 }, deck, () => 0);
    s = startTurn(s, 1_000_000, () => 0);
    s = applyAction(s, 'correct', () => 0);
    s = applyAction(s, 'correct', () => 0);
    s = nextTurn(endTurn(s)); // turnsTaken=1, ímpar => continua
    expect(s.phase).toBe('pre-turn');
    s = startTurn(s, 1_000_000, () => 0);
    s = nextTurn(endTurn(s)); // turnsTaken=2 => avalia meta => fim
    expect(s.phase).toBe('game-over');
  });

  it('getWinner retorna o time de maior placar ou empate', () => {
    const base = createGame(config, deck, () => 0);
    expect(getWinner({ ...base, teams: [{ name: 'A', score: 3 }, { name: 'B', score: 1 }] })).toBe(0);
    expect(getWinner({ ...base, teams: [{ name: 'A', score: 1 }, { name: 'B', score: 4 }] })).toBe(1);
    expect(getWinner({ ...base, teams: [{ name: 'A', score: 2 }, { name: 'B', score: 2 }] })).toBe('tie');
  });

  it('isGameOver é falso fora de um limite de rodada', () => {
    const s = createGame({ ...config, endMode: 'rounds', endValue: 1 }, deck, () => 0);
    expect(isGameOver({ ...s, turnsTaken: 1 })).toBe(false); // ímpar
    expect(isGameOver({ ...s, turnsTaken: 0 })).toBe(false); // jogo não começou
  });
});
