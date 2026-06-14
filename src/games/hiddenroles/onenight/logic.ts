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

function swap(arr: RoleId[], i: number, j: number): void {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

export function resolveNight(
  deal: RoleId[],
  actions: NightAction[],
  playerCount: number,
): RoleId[] {
  const working = [...deal];
  // Order by the canonical nightOrder of the actor's ORIGINAL role.
  const ordered = [...actions].sort(
    (x, y) => (nightOrderOf(deal[x.actor]) ?? 0) - (nightOrderOf(deal[y.actor]) ?? 0),
  );
  for (const a of ordered) {
    if (a.kind === 'robber') swap(working, a.actor, a.target);
    else if (a.kind === 'troublemaker') swap(working, a.a, a.b);
    else if (a.kind === 'drunk') swap(working, a.actor, a.center);
    // 'seer' and 'lone-wolf' gather info only — no swap.
  }
  return working.slice(0, playerCount);
}
