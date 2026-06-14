// src/net/adapters/quiplash.ts
// Adaptador NetGame do Quiplash real (engine promptvote). Embrulha o domínio
// pass-and-play de src/games/promptvote/quiplash/** SEM editá-lo: reusa o
// logic.ts puro e só traduz o que o modelo multi-device exige (votação
// concorrente por ator, projeção secreta, deadlines autoritativos).
import type { ActionCtx, InitCtx, NetGame, PlayerId, TimerCtx } from '../contract';
import {
  createSession,
  matchupResults,
  nextRound,
  playAgain,
  promptsForPlayer,
  ranking,
  scoreRound,
  submitAnswers,
} from '../../games/promptvote/quiplash/logic';
import { getQuiplashDeck } from '../../data/promptvote';
import type { MatchupResult, Mode, PromptDeck, SessionState } from '../../games/promptvote/quiplash/types';

export interface QuiplashNetConfig {
  mode: Mode;
  rounds: number;
  deckId: string;
  answerSeconds: number;
  voteSeconds: number;
}

export interface QuiplashNetState {
  session: SessionState;
  answered: PlayerId[]; // quem já submeteu respostas nesta rodada
  endsAt: number; // deadline autoritativo da fase atual (answering/voting)
  answerSeconds: number; // durações guardadas no estado p/ recarimbar deadlines
  voteSeconds: number;
}

export type QuiplashNetAction =
  | { type: 'SUBMIT_ANSWERS'; texts: string[] }
  | { type: 'CAST_VOTE'; matchupIndex: number; choice: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'PLAY_AGAIN' };

export type QuiplashProjection =
  | {
      phase: 'answering';
      prompts: { matchupIndex: number; promptText: string; yourText: string }[];
      submitted: boolean;
      answeredCount: number;
      total: number;
      endsAt: number;
    }
  | {
      phase: 'voting';
      ballots: {
        matchupIndex: number;
        promptText: string;
        options: { choice: number; text: string }[];
        yourChoice: number | null;
      }[];
      votedCount: number;
      totalBallots: number;
      endsAt: number;
    }
  | {
      phase: 'round-result';
      multiplier: number;
      isLastLash: boolean;
      results: MatchupResult[];
      ranking: { id: PlayerId; name: string; score: number }[];
    }
  | {
      phase: 'final-result';
      ranking: { id: PlayerId; name: string; score: number }[];
    };

function deckOrThrow(deckId: string): PromptDeck {
  const deck = getQuiplashDeck(deckId);
  if (!deck) throw new Error(`deck não encontrado: ${deckId}`);
  return deck;
}

function rankView(session: SessionState): { id: PlayerId; name: string; score: number }[] {
  return ranking(session).map((r) => ({ id: r.player.id, name: r.player.name, score: r.score }));
}

export const quiplashNet: NetGame<QuiplashNetState, QuiplashNetAction, QuiplashProjection, QuiplashNetConfig> = {
  createInitial({ config, players, now, rng }: InitCtx<QuiplashNetConfig>): QuiplashNetState {
    const deck = deckOrThrow(config.deckId);
    const session = createSession(
      {
        players: players.map((p) => ({ id: p.id, name: p.nickname })),
        mode: config.mode,
        rounds: config.rounds,
        deckId: config.deckId,
      },
      deck,
      rng,
    );
    return {
      session,
      answered: [],
      endsAt: now + config.answerSeconds * 1000,
      answerSeconds: config.answerSeconds,
      voteSeconds: config.voteSeconds,
    };
  },

  reducer(state: QuiplashNetState, action: QuiplashNetAction, ctx: ActionCtx): QuiplashNetState {
    const { round } = state.session;
    switch (action.type) {
      case 'SUBMIT_ANSWERS': {
        if (round.phase !== 'answering') return state;
        if (state.answered.includes(ctx.actorId)) return state;
        if (promptsForPlayer(round, ctx.actorId).length === 0) return state;
        const session = submitAnswers(state.session, ctx.actorId, action.texts, ctx.rng);
        const movedToVoting = session.round.phase === 'voting';
        return {
          ...state,
          session,
          answered: [...state.answered, ctx.actorId],
          endsAt: movedToVoting ? ctx.now + state.voteSeconds * 1000 : state.endsAt,
        };
      }
      case 'CAST_VOTE': {
        if (round.phase !== 'voting') return state;
        const ballot = round.ballots.find(
          (b) => b.voterId === ctx.actorId && b.matchupIndex === action.matchupIndex,
        );
        if (!ballot) return state;
        const m = round.matchups[action.matchupIndex];
        if (m.votes[ctx.actorId] !== undefined) return state; // já votou nessa cédula
        if (action.choice < 0 || action.choice >= ballot.order.length) return state;
        const authorId = m.answers[ballot.order[action.choice]].authorId;
        const matchups = round.matchups.map((mm, i) =>
          i === action.matchupIndex ? { ...mm, votes: { ...mm.votes, [ctx.actorId]: authorId } } : mm,
        );
        const allVoted = round.ballots.every(
          (b) => matchups[b.matchupIndex].votes[b.voterId] !== undefined,
        );
        const session = allVoted
          ? scoreRound({ ...state.session, round: { ...round, matchups, phase: 'round-result' } })
          : { ...state.session, round: { ...round, matchups } };
        return { ...state, session };
      }
      case 'NEXT_ROUND': {
        if (round.phase !== 'round-result') return state;
        const session = nextRound(state.session, deckOrThrow(state.session.config.deckId), ctx.rng);
        const startedAnswering = session.round.phase === 'answering';
        return {
          ...state,
          session,
          answered: [],
          endsAt: startedAnswering ? ctx.now + state.answerSeconds * 1000 : state.endsAt,
        };
      }
      case 'PLAY_AGAIN': {
        if (round.phase !== 'final-result') return state;
        const session = playAgain(state.session, deckOrThrow(state.session.config.deckId), ctx.rng);
        return { ...state, session, answered: [], endsAt: ctx.now + state.answerSeconds * 1000 };
      }
      default:
        return state;
    }
  },

  project(state: QuiplashNetState, playerId: PlayerId): QuiplashProjection {
    const { round, config } = state.session;
    if (round.phase === 'answering') {
      const prompts = promptsForPlayer(round, playerId).map((mi) => {
        const m = round.matchups[mi];
        const mine = m.answers.find((a) => a.authorId === playerId);
        return { matchupIndex: mi, promptText: m.promptText, yourText: mine?.text ?? '' };
      });
      return {
        phase: 'answering',
        prompts,
        submitted: state.answered.includes(playerId),
        answeredCount: state.answered.length,
        total: config.players.length,
        endsAt: state.endsAt,
      };
    }
    if (round.phase === 'voting') {
      const myBallots = round.ballots.filter((b) => b.voterId === playerId);
      const ballots = myBallots.map((b) => {
        const m = round.matchups[b.matchupIndex];
        const votedAuthor = m.votes[playerId];
        const choiceIfVoted =
          votedAuthor === undefined
            ? -1
            : b.order.findIndex((ai) => m.answers[ai].authorId === votedAuthor);
        return {
          matchupIndex: b.matchupIndex,
          promptText: m.promptText,
          options: b.order.map((ai, choice) => ({ choice, text: m.answers[ai].text })),
          yourChoice: choiceIfVoted === -1 ? null : choiceIfVoted,
        };
      });
      const votedCount = myBallots.filter(
        (b) => round.matchups[b.matchupIndex].votes[playerId] !== undefined,
      ).length;
      return {
        phase: 'voting',
        ballots,
        votedCount,
        totalBallots: myBallots.length,
        endsAt: state.endsAt,
      };
    }
    if (round.phase === 'round-result') {
      return {
        phase: 'round-result',
        multiplier: round.multiplier,
        isLastLash: round.isLastLash,
        results: matchupResults(round),
        ranking: rankView(state.session),
      };
    }
    return { phase: 'final-result', ranking: rankView(state.session) };
  },

  legalActions(state: QuiplashNetState, playerId: PlayerId): QuiplashNetAction['type'][] {
    const { round } = state.session;
    if (round.phase === 'answering') {
      const canAnswer = !state.answered.includes(playerId) && promptsForPlayer(round, playerId).length > 0;
      return canAnswer ? ['SUBMIT_ANSWERS'] : [];
    }
    if (round.phase === 'voting') {
      const hasPending = round.ballots.some(
        (b) => b.voterId === playerId && round.matchups[b.matchupIndex].votes[playerId] === undefined,
      );
      return hasPending ? ['CAST_VOTE'] : [];
    }
    if (round.phase === 'round-result') return ['NEXT_ROUND'];
    if (round.phase === 'final-result') return ['PLAY_AGAIN'];
    return [];
  },

  deadline(state: QuiplashNetState): number | null {
    const { phase } = state.session.round;
    return phase === 'answering' || phase === 'voting' ? state.endsAt : null;
  },

  onTimeout(state: QuiplashNetState, ctx: TimerCtx): QuiplashNetState {
    const { round } = state.session;
    if (round.phase === 'answering') {
      // quem não respondeu fica em branco; força a montagem das cédulas → voting
      let session = state.session;
      const answered = [...state.answered];
      for (const p of session.config.players) {
        if (answered.includes(p.id)) continue;
        if (promptsForPlayer(session.round, p.id).length === 0) continue;
        session = submitAnswers(session, p.id, [], ctx.rng);
        answered.push(p.id);
      }
      const movedToVoting = session.round.phase === 'voting';
      return {
        ...state,
        session,
        answered,
        endsAt: movedToVoting ? ctx.now + state.voteSeconds * 1000 : state.endsAt,
      };
    }
    if (round.phase === 'voting') {
      const session = scoreRound({ ...state.session, round: { ...round, phase: 'round-result' } });
      return { ...state, session };
    }
    return state;
  },
};
