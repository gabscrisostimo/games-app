// src/data/hiddenroles/onenight/bags.ts
import { ROLES } from '../../../games/hiddenroles/onenight/roles';
import type { RoleId } from '../../../games/hiddenroles/onenight/types';

// Progression sliced to n+3. Order chosen so every prefix is a sensible, box-legal bag.
// n=3 -> first 6 cards; n=10 -> all 13 cards.
const PROGRESSION: RoleId[] = [
  'werewolf', 'werewolf', 'seer', 'robber', 'troublemaker',
  'villager', 'villager', 'villager',
  'minion', 'drunk', 'insomniac', 'tanner', 'hunter',
];

export function recommendedBag(playerCount: number): RoleId[] {
  return PROGRESSION.slice(0, playerCount + 3);
}

export const BOX_LIMITS: Record<RoleId, number> = Object.fromEntries(
  (Object.keys(ROLES) as RoleId[]).map((id) => [id, ROLES[id].max]),
) as Record<RoleId, number>;
