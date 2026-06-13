// src/games/judging/snakeoil/logic.ts
import type { GameState, MatchConfig, Player, PersonaDeck, RoundState, WordDeck } from './types';

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawWords(
  draw: string[],
  discard: string[],
  n: number,
  rng: () => number = Math.random,
): { cards: string[]; draw: string[]; discard: string[] } {
  let d = [...draw];
  let disc = [...discard];
  const cards: string[] = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      d = shuffle(disc, rng);
      disc = [];
    }
    if (d.length === 0) break;
    cards.push(d.shift() as string);
  }
  return { cards, draw: d, discard: disc };
}

export function drawPersona(
  draw: string[],
  discard: string[],
  rng: () => number = Math.random,
): { personaId: string | null; draw: string[]; discard: string[] } {
  let d = [...draw];
  let disc = [...discard];
  if (d.length === 0) {
    d = shuffle(disc, rng);
    disc = [];
  }
  if (d.length === 0) return { personaId: null, draw: d, discard: disc };
  const [personaId, ...rest] = d;
  return { personaId, draw: rest, discard: disc };
}

function buildRound(
  players: Player[],
  customerIndex: number,
  personaId: string | null,
): RoundState {
  const order = players.map((_, i) => i).filter((i) => i !== customerIndex);
  return { customerIndex, personaId, order, selIndex: 0, picks: {}, winnerIndex: null };
}

export function createGame(
  config: MatchConfig,
  wordDeck: WordDeck,
  personaDeck: PersonaDeck,
  rng: () => number = Math.random,
): GameState {
  let wordDraw = shuffle(wordDeck.cards.map((c) => c.id), rng);
  let wordDiscard: string[] = [];
  const players: Player[] = config.playerNames.map((name, i) => {
    const res = drawWords(wordDraw, wordDiscard, config.handSize, rng);
    wordDraw = res.draw;
    wordDiscard = res.discard;
    return { id: `p${i}`, name, score: 0, hand: res.cards };
  });

  let personaDraw = shuffle(personaDeck.cards.map((c) => c.id), rng);
  const personaDiscard: string[] = [];
  const pres = drawPersona(personaDraw, personaDiscard, rng);
  personaDraw = pres.draw;

  const round = buildRound(players, 0, pres.personaId);

  return {
    config,
    players,
    wordDraw,
    wordDiscard,
    personaDraw,
    personaDiscard: pres.discard,
    roundsPlayed: 0,
    round,
    phase: 'pre-round',
  };
}

export function startRound(state: GameState): GameState {
  if (state.phase !== 'pre-round' || !state.round) return state;
  return { ...state, phase: 'selecting' };
}

export function toJudging(state: GameState): GameState {
  if (state.phase !== 'pitching') return state;
  return { ...state, phase: 'judging' };
}

export function judge(state: GameState, winnerIndex: number): GameState {
  if (state.phase !== 'judging' || !state.round) return state;
  const r = state.round;
  if (!r.order.includes(winnerIndex)) return state;

  const used = Object.values(r.picks).flat();
  const players = state.players.map((p, i) => {
    const usedByP = r.picks[i];
    const hand = usedByP ? p.hand.filter((id) => !usedByP.includes(id)) : p.hand;
    const score = i === winnerIndex ? p.score + 1 : p.score;
    return { ...p, hand, score };
  });

  const personaDiscard = r.personaId
    ? [...state.personaDiscard, r.personaId]
    : state.personaDiscard;

  return {
    ...state,
    players,
    wordDiscard: [...state.wordDiscard, ...used],
    personaDiscard,
    round: { ...r, winnerIndex },
    phase: 'round-summary',
  };
}

export function isGameOver(state: GameState): boolean {
  if (state.config.endMode === 'rotations') {
    return state.roundsPlayed >= state.config.endValue * state.players.length;
  }
  return Math.max(...state.players.map((p) => p.score)) >= state.config.endValue;
}

export function nextRound(state: GameState, rng: () => number = Math.random): GameState {
  if (state.phase !== 'round-summary' || !state.round) return state;

  let wordDraw = [...state.wordDraw];
  let wordDiscard = [...state.wordDiscard];
  const players = state.players.map((p) => {
    const need = state.config.handSize - p.hand.length;
    if (need <= 0) return p;
    const res = drawWords(wordDraw, wordDiscard, need, rng);
    wordDraw = res.draw;
    wordDiscard = res.discard;
    return { ...p, hand: [...p.hand, ...res.cards] };
  });

  const advanced: GameState = {
    ...state,
    players,
    wordDraw,
    wordDiscard,
    roundsPlayed: state.roundsPlayed + 1,
  };

  if (isGameOver(advanced)) {
    return { ...advanced, round: null, phase: 'game-over' };
  }

  const customerIndex = (state.round.customerIndex + 1) % state.players.length;
  const pres = drawPersona(advanced.personaDraw, advanced.personaDiscard, rng);
  const round = buildRound(players, customerIndex, pres.personaId);
  return {
    ...advanced,
    personaDraw: pres.draw,
    personaDiscard: pres.discard,
    round,
    phase: 'pre-round',
  };
}

export function getRanking(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.score - a.score);
}

export function maxPlayers(wordDeckSize: number, handSize: number): number {
  return Math.floor(wordDeckSize / handSize);
}

export function selectCards(state: GameState, picks: string[]): GameState {
  if (state.phase !== 'selecting' || !state.round) return state;
  const r = state.round;
  // Mãos são disjuntas (cada carta é comprada uma única vez do deck), então não há
  // risco de dois pitchers escolherem a mesma carta — só validamos a mão do pitcher atual.
  if (r.selIndex >= r.order.length) return state;
  const pitcherIndex = r.order[r.selIndex];
  if (picks.length !== state.config.cardsPerPitch) return state;
  if (new Set(picks).size !== picks.length) return state;
  const hand = state.players[pitcherIndex].hand;
  if (!picks.every((id) => hand.includes(id))) return state;

  const nextSel = r.selIndex + 1;
  const done = nextSel >= r.order.length;
  return {
    ...state,
    round: { ...r, picks: { ...r.picks, [pitcherIndex]: picks }, selIndex: nextSel },
    phase: done ? 'pitching' : 'selecting',
  };
}
