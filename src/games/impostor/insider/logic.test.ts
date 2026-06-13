import { describe, it, expect } from 'vitest';
import { nextMaster } from './logic';
import type { Player } from './types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
  { id: 'e', name: 'Edu' },
];

const rng0 = () => 0; // sempre escolhe o primeiro elegível

describe('nextMaster', () => {
  it('com rotação vazia escolhe o primeiro elegível e o registra', () => {
    const r = nextMaster([], players, rng0);
    expect(r.masterId).toBe('a');
    expect(r.rotation).toEqual(['a']);
  });

  it('não repete até todos terem sido Mestre, depois reseta', () => {
    let rotation: string[] = [];
    const picked: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = nextMaster(rotation, players, rng0);
      picked.push(r.masterId);
      rotation = r.rotation;
    }
    // 5 primeiros cobrem todos sem repetir; o 6º reinicia o ciclo
    expect(new Set(picked.slice(0, 5)).size).toBe(5);
    expect(picked[5]).toBe('a');
    expect(rotation).toEqual(['a']);
  });

  it('é determinístico com rng fixo', () => {
    const last = () => 0.999;
    const r = nextMaster([], players, last);
    expect(r.masterId).toBe('e'); // floor(0.999 * 5) = 4
  });
});
