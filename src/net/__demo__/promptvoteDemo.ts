// src/net/__demo__/promptvoteDemo.ts
import type { ActionCtx, InitCtx, NetGame, PlayerId, TimerCtx } from '../contract';
import { shuffle } from '../rng';
import { PROMPTS } from './prompts';

export type DemoPhase = 'answering' | 'voting' | 'reveal';
export interface DemoConfig {
  promptSeconds: number;
  voteSeconds: number;
}

export interface DemoState {
  phase: DemoPhase;
  config: DemoConfig;
  prompt: string;
  endsAt: number;
  players: { id: PlayerId; nickname: string }[];
  answers: Record<PlayerId, string>;
  options: { optionId: string; authorId: PlayerId; text: string }[];
  votes: Record<PlayerId, string>; // voterId -> optionId
  scores: Record<PlayerId, number>;
}

export type DemoAction =
  | { type: 'SUBMIT_ANSWER'; text: string }
  | { type: 'SUBMIT_VOTE'; optionId: string };

export type DemoProjection =
  | {
      phase: 'answering';
      prompt: string;
      yourAnswer: string | null;
      submitted: number;
      total: number;
      endsAt: number;
    }
  | {
      phase: 'voting';
      prompt: string;
      options: { optionId: string; text: string }[];
      yourVote: string | null;
      voted: number;
      total: number;
      endsAt: number;
    }
  | {
      phase: 'reveal';
      prompt: string;
      results: { nickname: string; text: string; votes: number }[];
      scores: { nickname: string; score: number }[];
    };

function allAnswered(s: DemoState): boolean {
  return s.players.every((p) => s.answers[p.id] !== undefined);
}

function eligibleVoters(s: DemoState): { id: PlayerId }[] {
  return s.players.filter((p) => s.options.some((o) => o.authorId !== p.id));
}

function allVoted(s: DemoState): boolean {
  return eligibleVoters(s).every((p) => s.votes[p.id] !== undefined);
}

function toVoting(s: DemoState, now: number, rng: () => number): DemoState {
  const entries = s.players
    .filter((p) => s.answers[p.id] !== undefined)
    .map((p) => ({ authorId: p.id, text: s.answers[p.id] }));
  const options = shuffle(entries, rng).map((e, i) => ({
    optionId: `o${i}`,
    authorId: e.authorId,
    text: e.text,
  }));
  return { ...s, phase: 'voting', options, endsAt: now + s.config.voteSeconds * 1000 };
}

function toReveal(s: DemoState): DemoState {
  const votesByOption: Record<string, number> = {};
  for (const optId of Object.values(s.votes)) {
    votesByOption[optId] = (votesByOption[optId] ?? 0) + 1;
  }
  const scores = { ...s.scores };
  for (const o of s.options) {
    scores[o.authorId] = (scores[o.authorId] ?? 0) + (votesByOption[o.optionId] ?? 0);
  }
  return { ...s, phase: 'reveal', scores };
}

export const promptvoteDemo: NetGame<DemoState, DemoAction, DemoProjection, DemoConfig> = {
  createInitial({ config, players, now, rng }: InitCtx<DemoConfig>): DemoState {
    const prompt = PROMPTS[Math.floor(rng() * PROMPTS.length)];
    return {
      phase: 'answering',
      config,
      prompt,
      endsAt: now + config.promptSeconds * 1000,
      players,
      answers: {},
      options: [],
      votes: {},
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    };
  },

  reducer(state: DemoState, action: DemoAction, ctx: ActionCtx): DemoState {
    switch (action.type) {
      case 'SUBMIT_ANSWER': {
        if (state.phase !== 'answering') return state;
        if (state.answers[ctx.actorId] !== undefined) return state;
        const text = action.text.trim();
        if (!text) return state;
        const next: DemoState = { ...state, answers: { ...state.answers, [ctx.actorId]: text } };
        return allAnswered(next) ? toVoting(next, ctx.now, ctx.rng) : next;
      }
      case 'SUBMIT_VOTE': {
        if (state.phase !== 'voting') return state;
        if (state.votes[ctx.actorId] !== undefined) return state;
        const opt = state.options.find((o) => o.optionId === action.optionId);
        if (!opt || opt.authorId === ctx.actorId) return state;
        const next: DemoState = { ...state, votes: { ...state.votes, [ctx.actorId]: action.optionId } };
        return allVoted(next) ? toReveal(next) : next;
      }
      default:
        return state;
    }
  },

  project(state: DemoState, playerId: PlayerId): DemoProjection {
    if (state.phase === 'answering') {
      return {
        phase: 'answering',
        prompt: state.prompt,
        yourAnswer: state.answers[playerId] ?? null,
        submitted: Object.keys(state.answers).length,
        total: state.players.length,
        endsAt: state.endsAt,
      };
    }
    if (state.phase === 'voting') {
      return {
        phase: 'voting',
        prompt: state.prompt,
        options: state.options
          .filter((o) => o.authorId !== playerId)
          .map((o) => ({ optionId: o.optionId, text: o.text })),
        yourVote: state.votes[playerId] ?? null,
        voted: Object.keys(state.votes).length,
        total: eligibleVoters(state).length,
        endsAt: state.endsAt,
      };
    }
    const nick = (id: PlayerId) => state.players.find((p) => p.id === id)?.nickname ?? '???';
    const votesByOption: Record<string, number> = {};
    for (const optId of Object.values(state.votes)) {
      votesByOption[optId] = (votesByOption[optId] ?? 0) + 1;
    }
    return {
      phase: 'reveal',
      prompt: state.prompt,
      results: state.options
        .map((o) => ({ nickname: nick(o.authorId), text: o.text, votes: votesByOption[o.optionId] ?? 0 }))
        .sort((x, y) => y.votes - x.votes),
      scores: state.players
        .map((p) => ({ nickname: p.nickname, score: state.scores[p.id] ?? 0 }))
        .sort((x, y) => y.score - x.score),
    };
  },

  legalActions(state: DemoState, playerId: PlayerId): DemoAction['type'][] {
    if (state.phase === 'answering') {
      return state.answers[playerId] === undefined ? ['SUBMIT_ANSWER'] : [];
    }
    if (state.phase === 'voting') {
      const canVote =
        state.votes[playerId] === undefined && state.options.some((o) => o.authorId !== playerId);
      return canVote ? ['SUBMIT_VOTE'] : [];
    }
    return [];
  },

  deadline(state: DemoState): number | null {
    return state.phase === 'answering' || state.phase === 'voting' ? state.endsAt : null;
  },

  onTimeout(state: DemoState, ctx: TimerCtx): DemoState {
    if (state.phase === 'answering') return toVoting(state, ctx.now, ctx.rng);
    if (state.phase === 'voting') return toReveal(state);
    return state;
  },
};
