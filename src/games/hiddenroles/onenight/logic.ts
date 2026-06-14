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

export function computeNightView(
  deal: RoleId[],
  playerIndex: number,
  playerCount: number,
  action: NightAction | null,
): NightView {
  const role = deal[playerIndex];
  const playerIdxs = (pred: (r: RoleId, i: number) => boolean): number[] => {
    const out: number[] = [];
    for (let i = 0; i < playerCount; i++) if (pred(deal[i], i)) out.push(i);
    return out;
  };

  switch (role) {
    case 'werewolf': {
      if (action && action.kind === 'lone-wolf') {
        return { kind: 'lone-wolf', center: action.center, role: deal[action.center] };
      }
      const partners = playerIdxs((r, i) => r === 'werewolf' && i !== playerIndex);
      return { kind: 'wolves', partners };
    }
    case 'minion':
      return { kind: 'minion', wolves: playerIdxs((r) => r === 'werewolf') };
    case 'mason':
      return { kind: 'masons', partners: playerIdxs((r, i) => r === 'mason' && i !== playerIndex) };
    case 'seer':
      if (!action || action.kind !== 'seer') return null;
      return action.peek.kind === 'player'
        ? { kind: 'seer-player', target: action.peek.target, role: deal[action.peek.target] }
        : {
            kind: 'seer-center',
            cards: action.peek.cards,
            roles: [deal[action.peek.cards[0]], deal[action.peek.cards[1]]],
          };
    case 'robber':
      if (!action || action.kind !== 'robber') return null;
      return { kind: 'robber', target: action.target, role: deal[action.target] };
    case 'troublemaker':
      return action && action.kind === 'troublemaker' ? { kind: 'troublemaker' } : null;
    case 'drunk':
      return action && action.kind === 'drunk' ? { kind: 'drunk' } : null;
    default:
      return null; // insomniac (dawn), villager, hunter, tanner
  }
}
