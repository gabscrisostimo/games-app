// src/games/hiddenroles/onenight/reducer.ts
import {
  submitPass, submitDawn, startDiscussion, beginVote, submitVote, playAgain,
} from './logic';
import type { NightAction, SessionState } from './types';

export type OneNightAction =
  | { type: 'SUBMIT_PASS'; action: NightAction | null }
  | { type: 'SUBMIT_DAWN' }
  | { type: 'START_DISCUSSION'; now: number }
  | { type: 'BEGIN_VOTE' }
  | { type: 'SUBMIT_VOTE'; target: number }
  | { type: 'PLAY_AGAIN' }
  | { type: 'LOAD'; state: SessionState };

export function oneNightReducer(state: SessionState, action: OneNightAction): SessionState {
  switch (action.type) {
    case 'SUBMIT_PASS':
      return submitPass(state, action.action);
    case 'SUBMIT_DAWN':
      return submitDawn(state);
    case 'START_DISCUSSION':
      return startDiscussion(state, action.now);
    case 'BEGIN_VOTE':
      return beginVote(state);
    case 'SUBMIT_VOTE':
      return submitVote(state, action.target);
    case 'PLAY_AGAIN':
      return playAgain(state);
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
