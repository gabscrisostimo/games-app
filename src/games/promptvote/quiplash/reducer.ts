import { submitAnswers, castVote, nextRound, playAgain } from './logic';
import { getQuiplashDeck } from '../../../data/promptvote';
import type { SessionState } from './types';

export type QuiplashAction =
  | { type: 'SUBMIT_ANSWERS'; playerId: string; texts: string[] }
  | { type: 'CAST_VOTE'; authorId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'LOAD'; state: SessionState };

export function quiplashReducer(state: SessionState, action: QuiplashAction): SessionState {
  switch (action.type) {
    case 'SUBMIT_ANSWERS':
      return submitAnswers(state, action.playerId, action.texts);
    case 'CAST_VOTE':
      return castVote(state, action.authorId);
    case 'NEXT_ROUND': {
      const deck = getQuiplashDeck(state.config.deckId);
      return deck ? nextRound(state, deck) : state;
    }
    case 'PLAY_AGAIN': {
      const deck = getQuiplashDeck(state.config.deckId);
      return deck ? playAgain(state, deck) : state;
    }
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
