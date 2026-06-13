import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { generateRoomCode, isValidRoomCode } from './roomCode';

describe('roomCode', () => {
  it('gera 4 letras maiúsculas válidas', () => {
    const code = generateRoomCode(mulberry32(1));
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it('nunca inclui I ou O', () => {
    for (let s = 0; s < 200; s++) {
      const code = generateRoomCode(mulberry32(s));
      expect(code.includes('I')).toBe(false);
      expect(code.includes('O')).toBe(false);
    }
  });

  it('valida formato', () => {
    expect(isValidRoomCode('WXYZ')).toBe(true);
    expect(isValidRoomCode('wxyz')).toBe(false); // minúsculas
    expect(isValidRoomCode('ABC')).toBe(false); // curto
    expect(isValidRoomCode('ABIO')).toBe(false); // contém I/O
    expect(isValidRoomCode('A1B2')).toBe(false); // dígitos
  });
});
