import {
  selectMaster, dealRoles, advanceReveal, startGuessing,
  markGuessed, timeUp, accuse, playAgain,
} from './logic';
import { getInsiderDeck } from './data/decks';
import type { Accusation, SessionState } from './types';

export type InsiderAction =
  | { type: 'SELECT_MASTER'; playerId: string }
  | { type: 'BEGIN_REVEAL' }
  | { type: 'ADVANCE_REVEAL' }
  | { type: 'START_GUESSING'; now: number }
  | { type: 'MARK_GUESSED' }
  | { type: 'TIME_UP' }
  | { type: 'ACCUSE'; accusation: Accusation }
  | { type: 'PLAY_AGAIN' }
  | { type: 'LOAD'; state: SessionState };

export function insiderReducer(state: SessionState, action: InsiderAction): SessionState {
  switch (action.type) {
    case 'SELECT_MASTER':
      return selectMaster(state, action.playerId);
    case 'BEGIN_REVEAL': {
      const deck = getInsiderDeck(state.config.deckId);
      return deck ? dealRoles(state, deck) : state;
    }
    case 'ADVANCE_REVEAL':
      return advanceReveal(state);
    case 'START_GUESSING':
      return startGuessing(state, action.now);
    case 'MARK_GUESSED':
      return markGuessed(state);
    case 'TIME_UP':
      return timeUp(state);
    case 'ACCUSE':
      return accuse(state, action.accusation);
    case 'PLAY_AGAIN':
      return playAgain(state);
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
