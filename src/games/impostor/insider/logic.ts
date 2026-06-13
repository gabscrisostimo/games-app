import type { InsiderConfig, Player, Role, SessionState, WordDeck } from './types';

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
