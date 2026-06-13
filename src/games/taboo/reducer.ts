// src/games/taboo/reducer.ts
import { applyAction, endTurn, nextTurn, startTurn } from './logic';
import type { GameState, Outcome } from './types';

export type GameAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'ACTION'; outcome: Outcome }
  | { type: 'END_TURN' }
  | { type: 'NEXT_TURN' }
  | { type: 'LOAD'; state: GameState };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_TURN':
      return startTurn(state, action.now);
    case 'ACTION':
      return applyAction(state, action.outcome);
    case 'END_TURN':
      return endTurn(state);
    case 'NEXT_TURN':
      return nextTurn(state);
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
