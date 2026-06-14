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

function startRound(base: InfiltradoState, roundIndex: number, now: number, _rng: () => number): InfiltradoState {
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

function toVoting(s: InfiltradoState, now: number): InfiltradoState {
  return { ...s, phase: 'voting', endsAt: now + s.config.voteSeconds * 1000, votes: {} };
}

function allVoted(s: InfiltradoState): boolean {
  return s.players.every((p) => s.votes[p.id] !== undefined);
}

function topVoted(s: InfiltradoState): PlayerId | null {
  const counts: Record<PlayerId, number> = {};
  for (const target of Object.values(s.votes)) counts[target] = (counts[target] ?? 0) + 1;
  let best: PlayerId | null = null, bestN = 0, tie = false;
  for (const [id, n] of Object.entries(counts)) {
    if (n > bestN) { best = id; bestN = n; tie = false; }
    else if (n === bestN) tie = true;
  }
  return tie ? null : best;
}

function applyScores(s: InfiltradoState, outcome: 'group' | 'impostor'): Record<PlayerId, number> {
  const scores = { ...s.scores };
  if (outcome === 'impostor') {
    for (const id of s.currentImpostors) scores[id] = (scores[id] ?? 0) + 2;
  } else {
    for (const p of s.players) if (!s.currentImpostors.includes(p.id)) scores[p.id] = (scores[p.id] ?? 0) + 1;
  }
  return scores;
}

function toRoundEnd(s: InfiltradoState, outcome: 'group' | 'impostor'): InfiltradoState {
  return { ...s, phase: 'roundEnd', roundOutcome: outcome, scores: applyScores(s, outcome), endsAt: null };
}

function resolveVotes(s: InfiltradoState): InfiltradoState {
  const accused = topVoted(s);
  if (accused !== null && s.currentImpostors.includes(accused)) {
    return { ...s, phase: 'escape', accusedId: accused, escapeGuess: null, escapeVotes: {}, endsAt: null };
  }
  return toRoundEnd({ ...s, accusedId: accused }, 'impostor');
}

function escapeVoters(s: InfiltradoState): PlayerId[] {
  return s.players.filter((p) => p.id !== s.accusedId).map((p) => p.id);
}

function allEscapeVoted(s: InfiltradoState): boolean {
  return escapeVoters(s).every((id) => (s.escapeVotes as Record<PlayerId, boolean | undefined>)[id] !== undefined);
}

function resolveEscape(s: InfiltradoState): InfiltradoState {
  const vals = Object.values(s.escapeVotes);
  const yes = vals.filter((v) => v).length;
  const no = vals.length - yes;
  const escaped = yes > no; // empate = falhou (grupo vence)
  return toRoundEnd(s, escaped ? 'impostor' : 'group');
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
      case 'ADVANCE': {
        if (state.phase === 'reveal') return toVoting(state, ctx.now);
        return state;
      }
      case 'SUBMIT_VOTE': {
        if (state.phase !== 'voting') return state;
        if ((state.votes as Record<PlayerId, PlayerId | undefined>)[ctx.actorId] !== undefined) return state;
        if (action.suspectId === ctx.actorId) return state;
        if (!state.players.some((p) => p.id === action.suspectId)) return state;
        const next = { ...state, votes: { ...state.votes, [ctx.actorId]: action.suspectId } };
        return allVoted(next) ? resolveVotes(next) : next;
      }
      case 'SUBMIT_ESCAPE_GUESS': {
        if (state.phase !== 'escape' || ctx.actorId !== state.accusedId) return state;
        if (state.escapeGuess !== null) return state;
        const text = action.text.trim();
        if (!text) return state;
        return { ...state, escapeGuess: text };
      }
      case 'SUBMIT_ESCAPE_VOTE': {
        if (state.phase !== 'escape' || state.escapeGuess === null) return state;
        if (ctx.actorId === state.accusedId) return state;
        if ((state.escapeVotes as Record<PlayerId, boolean | undefined>)[ctx.actorId] !== undefined) return state;
        const next = { ...state, escapeVotes: { ...state.escapeVotes, [ctx.actorId]: action.ok } };
        return allEscapeVoted(next) ? resolveEscape(next) : next;
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
    if (state.phase === 'reveal') {
      return {
        phase: 'reveal',
        answers: state.revealOrder.map((id) => ({ id, nickname: nick(state, id), answer: state.answers[id] ?? '—' })),
      };
    }
    if (state.phase === 'voting') {
      return {
        phase: 'voting',
        candidates: state.players.filter((p) => p.id !== playerId),
        yourVote: (state.votes[playerId] as PlayerId | undefined) ?? null,
        voted: Object.keys(state.votes).length,
        total: state.players.length,
        endsAt: state.endsAt ?? 0,
      };
    }
    if (state.phase === 'escape') {
      const accusedNickname = nick(state, state.accusedId!);
      if (playerId === state.accusedId) return { phase: 'escape', role: 'guessing', accusedNickname };
      return {
        phase: 'escape', role: 'judging', accusedNickname,
        originalQuestion: state.pair.normal,
        guess: state.escapeGuess,
        youVoted: (state.escapeVotes as Record<PlayerId, boolean | undefined>)[playerId] !== undefined,
        votes: Object.keys(state.escapeVotes).length,
        total: escapeVoters(state).length,
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

export { startRound, nick };
