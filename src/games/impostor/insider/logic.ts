import type { Player } from './types';

export function nextMaster(
  rotation: string[],
  players: Player[],
  rng: () => number = Math.random,
): { masterId: string; rotation: string[] } {
  let current = rotation;
  let eligible = players.filter((p) => !current.includes(p.id));
  if (eligible.length === 0) {
    current = [];
    eligible = players;
  }
  const masterId = eligible[Math.floor(rng() * eligible.length)].id;
  return { masterId, rotation: [...current, masterId] };
}
