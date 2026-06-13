import type { Accusation, InsiderConfig, Outcome, Player, Role, SessionState, WordDeck } from './types';

export function nextMaster(
  rotation: string[],
  players: Player[],
  rng: () => number = Math.random,
): { masterId: string; rotation: string[] } {
  let current = rotation;
  let eligible = players.filter((p) => !current.includes(p.id));
  if (eligible.length === 0) {
    current = [];
    eligible = players;
  }
  const masterId = eligible[Math.floor(rng() * eligible.length)].id;
  return { masterId, rotation: [...current, masterId] };
}

function freshRound() {
  return {
    word: '',
    insiderId: '',
    revealIndex: 0,
    endsAt: null as number | null,
    accusation: null,
    outcome: null,
  };
}

export function createSession(
  config: InsiderConfig,
  rng: () => number = Math.random,
): SessionState {
  if (config.masterMode === 'rotate') {
    const { masterId, rotation } = nextMaster([], config.players, rng);
    return {
      config,
      masterRotation: rotation,
      round: { ...freshRound(), masterId, phase: 'master-announce' },
    };
  }
  return {
    config,
    masterRotation: [],
    round: { ...freshRound(), masterId: '', phase: 'master-select' },
  };
}

export function selectMaster(state: SessionState, playerId: string): SessionState {
  if (state.round.phase !== 'master-select') return state;
  return {
    ...state,
    round: { ...state.round, masterId: playerId, phase: 'master-announce' },
  };
}

export function roleOf(state: SessionState, playerId: string): Role {
  if (playerId === state.round.masterId) return 'master';
  if (playerId === state.round.insiderId) return 'insider';
  return 'commoner';
}

export function dealRoles(
  state: SessionState,
  deck: WordDeck,
  rng: () => number = Math.random,
): SessionState {
  if (state.round.phase !== 'master-announce') return state;
  const candidates = state.config.players.filter((p) => p.id !== state.round.masterId);
  const insiderId = candidates[Math.floor(rng() * candidates.length)].id;
  const word = deck.cards[Math.floor(rng() * deck.cards.length)].word;
  return {
    ...state,
    round: { ...state.round, word, insiderId, revealIndex: 0, phase: 'role-reveal' },
  };
}

export function advanceReveal(state: SessionState): SessionState {
  if (state.round.phase !== 'role-reveal') return state;
  const next = state.round.revealIndex + 1;
  if (next >= state.config.players.length) {
    return {
      ...state,
      round: { ...state.round, revealIndex: next, phase: 'guessing', endsAt: null },
    };
  }
  return { ...state, round: { ...state.round, revealIndex: next } };
}

export function startGuessing(state: SessionState, now: number): SessionState {
  if (state.round.phase !== 'guessing') return state;
  return {
    ...state,
    round: { ...state.round, endsAt: now + state.config.guessSeconds * 1000 },
  };
}

export function markGuessed(state: SessionState): SessionState {
  if (state.round.phase !== 'guessing') return state;
  return { ...state, round: { ...state.round, phase: 'insider-hunt' } };
}

export function timeUp(state: SessionState): SessionState {
  if (state.round.phase !== 'guessing') return state;
  return { ...state, round: { ...state.round, phase: 'result', outcome: 'not-guessed' } };
}

export function accuse(state: SessionState, accusation: Accusation): SessionState {
  if (state.round.phase !== 'insider-hunt') return state;
  const caught = accusation.kind === 'player' && accusation.id === state.round.insiderId;
  const outcome: Outcome = caught ? 'insider-caught' : 'insider-escaped';
  return { ...state, round: { ...state.round, accusation, outcome, phase: 'result' } };
}
