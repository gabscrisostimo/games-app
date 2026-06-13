// src/games/judging/snakeoil/reducer.ts
import { judge, nextRound, selectCards, startRound, toJudging } from './logic';
import type { GameState } from './types';

export type GameAction =
  | { type: 'START_ROUND' }
  | { type: 'SELECT_CARDS'; picks: string[] }
  | { type: 'TO_JUDGING' }
  | { type: 'JUDGE'; winnerIndex: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'LOAD'; state: GameState };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state);
    case 'SELECT_CARDS':
      return selectCards(state, action.picks);
    case 'TO_JUDGING':
      return toJudging(state);
    case 'JUDGE':
      return judge(state, action.winnerIndex);
    case 'NEXT_ROUND':
      return nextRound(state);
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
