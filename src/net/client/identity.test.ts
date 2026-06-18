import { beforeEach, describe, expect, it } from 'vitest';
import { getPlayerId } from './identity';

describe('identity', () => {
  beforeEach(() => localStorage.clear());

  it('gera e persiste um playerId estável', () => {
    const first = getPlayerId();
    const second = getPlayerId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(8);
  });

  it('reusa o valor já salvo no localStorage', () => {
    localStorage.setItem('net.playerId', 'fixo-123');
    expect(getPlayerId()).toBe('fixo-123');
  });
});
