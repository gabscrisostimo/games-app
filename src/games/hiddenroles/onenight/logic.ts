// src/games/hiddenroles/onenight/logic.ts
import { nightOrderOf, teamOf } from './roles';
import type {
  Config,
  NightAction,
  NightView,
  Player,
  RoleId,
  RoundState,
  SessionState,
  WinResult,
} from './types';

export function dealRoles(bag: RoleId[], rng: () => number = Math.random): RoleId[] {
  const deal = [...bag];
  for (let i = deal.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deal[i], deal[j]] = [deal[j], deal[i]];
  }
  return deal;
}
