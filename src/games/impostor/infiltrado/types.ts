// src/games/impostor/infiltrado/types.ts
import type { PlayerId } from '../../../net/contract';

export type Phase = 'answering' | 'reveal' | 'voting' | 'escape' | 'roundEnd' | 'matchEnd';

export interface QuestionPair { id: string; tema: string; normal: string; impostor: string; }

export interface InfiltradoConfig {
  impostorCount: 1 | 2;
  rounds: number;
  answerSeconds: number;
  voteSeconds: number;
}

export interface Seat { id: PlayerId; nickname: string; }

export interface InfiltradoState {
  phase: Phase;
  config: InfiltradoConfig;
  players: Seat[];
  totalRounds: number;
  roundIndex: number;
  impostorSchedule: PlayerId[][];
  currentImpostors: PlayerId[];
  pairs: QuestionPair[];
  pair: QuestionPair;
  endsAt: number | null;
  answers: Record<PlayerId, string>;
  revealOrder: PlayerId[];
  votes: Record<PlayerId, PlayerId>;
  accusedId: PlayerId | null;
  escapeGuess: string | null;
  escapeVotes: Record<PlayerId, boolean>;
  roundOutcome: 'group' | 'impostor' | null;
  scores: Record<PlayerId, number>;
}

export type InfiltradoAction =
  | { type: 'SUBMIT_ANSWER'; text: string }
  | { type: 'ADVANCE' }
  | { type: 'SUBMIT_VOTE'; suspectId: PlayerId }
  | { type: 'SUBMIT_ESCAPE_GUESS'; text: string }
  | { type: 'SUBMIT_ESCAPE_VOTE'; ok: boolean };

export type InfiltradoProjection =
  | { phase: 'answering'; tema: string; yourQuestion: string; yourAnswer: string | null;
      submitted: number; total: number; endsAt: number; round: number; totalRounds: number }
  | { phase: 'reveal'; answers: { id: PlayerId; nickname: string; answer: string }[] }
  | { phase: 'voting'; candidates: Seat[]; yourVote: PlayerId | null;
      voted: number; total: number; endsAt: number }
  | { phase: 'escape'; role: 'guessing'; accusedNickname: string }
  | { phase: 'escape'; role: 'judging'; accusedNickname: string; originalQuestion: string;
      guess: string | null; youVoted: boolean; votes: number; total: number }
  | { phase: 'roundEnd'; impostors: string[]; accusedNickname: string | null;
      escapeGuess: string | null; outcome: 'group' | 'impostor';
      scores: { nickname: string; score: number }[]; hasNextRound: boolean }
  | { phase: 'matchEnd'; finalScores: { nickname: string; score: number }[] };
