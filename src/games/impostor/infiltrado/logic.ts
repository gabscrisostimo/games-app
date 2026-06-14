import type { ActionCtx, InitCtx, NetGame, PlayerId, TimerCtx } from '../../../net/contract';
import { shuffle } from '../../../net/rng';
import { INFILTRADO_DECKS } from './data/decks';
import type { InfiltradoAction, InfiltradoConfig, InfiltradoProjection, InfiltradoState, Seat } from './types';

function buildSchedule(ids: PlayerId[], rounds: number, impostorCount: number, rng: () => number): PlayerId[][] {
  const order = shuffle(ids, rng);
  const schedule: PlayerId[][] = [];
  let idx = 0;
  for (let r = 0; r < rounds; r++) {
    const picks: PlayerId[] = [];
    while (picks.length < impostorCount && picks.length < ids.length) {
      const cand = order[idx % order.length];
      idx++;
      if (!picks.includes(cand)) picks.push(cand);
    }
    schedule.push(picks);
  }
  return schedule;
}

function startRound(base: InfiltradoState, roundIndex: number, now: number, rng: () => number): InfiltradoState {
  return {
    ...base,
    phase: 'answering',
    roundIndex,
    currentImpostors: base.impostorSchedule[roundIndex],
    pair: base.pairs[roundIndex % base.pairs.length],
    endsAt: now + base.config.answerSeconds * 1000,
    answers: {},
    revealOrder: [],
    votes: {},
    accusedId: null,
    escapeGuess: null,
    escapeVotes: {},
    roundOutcome: null,
  };
}

function allAnswered(s: InfiltradoState): boolean {
  return s.players.every((p) => s.answers[p.id] !== undefined);
}

function toReveal(s: InfiltradoState, rng: () => number): InfiltradoState {
  return { ...s, phase: 'reveal', endsAt: null, revealOrder: shuffle(s.players.map((p) => p.id), rng) };
}

function nick(s: InfiltradoState, id: PlayerId): string {
  return s.players.find((p) => p.id === id)?.nickname ?? '???';
}

export const infiltrado: NetGame<InfiltradoState, InfiltradoAction, InfiltradoProjection, InfiltradoConfig> = {
  createInitial({ config, players, now, rng }: InitCtx<InfiltradoConfig>): InfiltradoState {
    const ids = players.map((p) => p.id);
    const totalRounds = config.rounds > 0 ? config.rounds : players.length;
    const impostorSchedule = buildSchedule(ids, totalRounds, config.impostorCount, rng);
    const pairs = shuffle(INFILTRADO_DECKS[0].pairs, rng);
    const base: InfiltradoState = {
      phase: 'answering', config, players: players as Seat[], totalRounds, roundIndex: 0,
      impostorSchedule, currentImpostors: [], pairs, pair: pairs[0], endsAt: null,
      answers: {}, revealOrder: [], votes: {}, accusedId: null, escapeGuess: null,
      escapeVotes: {}, roundOutcome: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
    };
    return startRound(base, 0, now, rng);
  },

  reducer(state: InfiltradoState, action: InfiltradoAction, ctx: ActionCtx): InfiltradoState {
    switch (action.type) {
      case 'SUBMIT_ANSWER': {
        if (state.phase !== 'answering') return state;
        if (state.answers[ctx.actorId] !== undefined) return state;
        const text = action.text.trim();
        if (!text) return state;
        const next = { ...state, answers: { ...state.answers, [ctx.actorId]: text } };
        return allAnswered(next) ? toReveal(next, ctx.rng) : next;
      }
      default:
        return state;
    }
  },

  project(state: InfiltradoState, playerId: PlayerId): InfiltradoProjection {
    if (state.phase === 'answering') {
      const isImp = state.currentImpostors.includes(playerId);
      return {
        phase: 'answering',
        tema: state.pair.tema,
        yourQuestion: isImp ? state.pair.impostor : state.pair.normal,
        yourAnswer: state.answers[playerId] ?? null,
        submitted: Object.keys(state.answers).length,
        total: state.players.length,
        endsAt: state.endsAt ?? 0,
        round: state.roundIndex + 1,
        totalRounds: state.totalRounds,
      };
    }
    return { phase: 'matchEnd', finalScores: [] } as InfiltradoProjection;
  },

  legalActions(_state: InfiltradoState, _playerId: PlayerId): InfiltradoAction['type'][] {
    return [];
  },

  deadline(state: InfiltradoState): number | null {
    return state.phase === 'answering' || state.phase === 'voting' ? state.endsAt : null;
  },

  onTimeout(state: InfiltradoState, _ctx: TimerCtx): InfiltradoState {
    return state;
  },
};

export { startRound };
