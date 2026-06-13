import type { Deck, GameState, MatchConfig, Outcome, TeamState, TurnState } from './types';

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createGame(
  config: MatchConfig,
  deck: Deck,
  rng: () => number = Math.random,
): GameState {
  const drawPile = shuffle(
    deck.cards.map((c) => c.id),
    rng,
  );
  const teams: [TeamState, TeamState] = [
    { name: config.teamNames[0], score: 0 },
    { name: config.teamNames[1], score: 0 },
  ];
  return {
    config,
    teams,
    currentTeam: 0,
    turnsTaken: 0,
    drawPile,
    discardPile: [],
    turn: null,
    phase: 'pre-turn',
  };
}

export function drawNext(
  drawPile: string[],
  discardPile: string[],
  rng: () => number = Math.random,
): { cardId: string | null; drawPile: string[]; discardPile: string[] } {
  let draw = [...drawPile];
  let discard = [...discardPile];
  if (draw.length === 0) {
    draw = shuffle(discard, rng);
    discard = [];
  }
  if (draw.length === 0) {
    return { cardId: null, drawPile: draw, discardPile: discard };
  }
  const [cardId, ...rest] = draw;
  return { cardId, drawPile: rest, discardPile: discard };
}

export function startTurn(
  state: GameState,
  now: number,
  rng: () => number = Math.random,
): GameState {
  if (state.phase !== 'pre-turn') return state;
  const { cardId, drawPile, discardPile } = drawNext(state.drawPile, state.discardPile, rng);
  const turn: TurnState = {
    endsAt: now + state.config.turnSeconds * 1000,
    skipsUsed: 0,
    currentCardId: cardId,
    results: [],
  };
  return { ...state, drawPile, discardPile, turn, phase: 'in-turn' };
}

function scoreDelta(outcome: Outcome, skipCostsPoint: boolean): number {
  if (outcome === 'correct') return 1;
  if (outcome === 'taboo') return -1;
  return skipCostsPoint ? -1 : 0; // skip
}

export function canSkip(state: GameState): boolean {
  if (!state.turn) return false;
  const { skipLimit } = state.config;
  if (skipLimit === null) return true;
  return state.turn.skipsUsed < skipLimit;
}

export function applyAction(
  state: GameState,
  outcome: Outcome,
  rng: () => number = Math.random,
): GameState {
  if (state.phase !== 'in-turn') return state;
  if (!state.turn || state.turn.currentCardId === null) return state;
  if (outcome === 'skip' && !canSkip(state)) return state;

  const playedCardId = state.turn.currentCardId;
  const delta = scoreDelta(outcome, state.config.skipCostsPoint);

  const teams = state.teams.map((t, i) =>
    i === state.currentTeam ? { ...t, score: t.score + delta } : t,
  ) as [GameState['teams'][0], GameState['teams'][1]];

  const discardWithPlayed = [...state.discardPile, playedCardId];
  const { cardId, drawPile, discardPile } = drawNext(state.drawPile, discardWithPlayed, rng);

  const turn: TurnState = {
    ...state.turn,
    skipsUsed: state.turn.skipsUsed + (outcome === 'skip' ? 1 : 0),
    currentCardId: cardId,
    results: [...state.turn.results, { cardId: playedCardId, outcome }],
  };

  return { ...state, teams, drawPile, discardPile, turn };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'in-turn') return state;
  return { ...state, phase: 'turn-summary' };
}

export function isGameOver(state: GameState): boolean {
  if (state.turnsTaken === 0 || state.turnsTaken % 2 !== 0) return false;
  if (state.config.endMode === 'rounds') {
    return state.turnsTaken >= state.config.endValue * 2;
  }
  return Math.max(state.teams[0].score, state.teams[1].score) >= state.config.endValue;
}

export function nextTurn(state: GameState): GameState {
  if (state.phase !== 'turn-summary') return state;
  const advanced: GameState = { ...state, turnsTaken: state.turnsTaken + 1, turn: null };
  if (isGameOver(advanced)) {
    return { ...advanced, phase: 'game-over' };
  }
  return {
    ...advanced,
    currentTeam: advanced.currentTeam === 0 ? 1 : 0,
    phase: 'pre-turn',
  };
}

export function getWinner(state: GameState): 0 | 1 | 'tie' {
  const [a, b] = state.teams;
  if (a.score > b.score) return 0;
  if (b.score > a.score) return 1;
  return 'tie';
}
