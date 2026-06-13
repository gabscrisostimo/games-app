// src/net/roomCode.ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 letras, sem I e O

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z]{4}$/.test(code);
}
