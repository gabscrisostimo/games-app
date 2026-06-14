// src/games/hiddenroles/onenight/playerStore.ts
import type { Player } from './types';

const KEY = 'games-app:onenight:players';

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Player[]) : [];
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(players));
  } catch {
    /* ignora */
  }
}
