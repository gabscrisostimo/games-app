// src/games/judging/snakeoil/logic.ts

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawWords(
  draw: string[],
  discard: string[],
  n: number,
  rng: () => number = Math.random,
): { cards: string[]; draw: string[]; discard: string[] } {
  let d = [...draw];
  let disc = [...discard];
  const cards: string[] = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      d = shuffle(disc, rng);
      disc = [];
    }
    if (d.length === 0) break;
    cards.push(d.shift() as string);
  }
  return { cards, draw: d, discard: disc };
}

export function drawPersona(
  draw: string[],
  discard: string[],
  rng: () => number = Math.random,
): { personaId: string | null; draw: string[]; discard: string[] } {
  let d = [...draw];
  let disc = [...discard];
  if (d.length === 0) {
    d = shuffle(disc, rng);
    disc = [];
  }
  if (d.length === 0) return { personaId: null, draw: d, discard: disc };
  const [personaId, ...rest] = d;
  return { personaId, draw: rest, discard: disc };
}
