import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './rng';

describe('mulberry32', () => {
  it('é determinístico pro mesmo seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('difere entre seeds diferentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('gera valores em [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('não muta o array original e mantém os mesmos elementos', () => {
    const orig = [1, 2, 3, 4, 5];
    const out = shuffle(orig, mulberry32(7));
    expect(orig).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('é determinístico pro mesmo seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9))).toEqual(
      shuffle([1, 2, 3, 4, 5], mulberry32(9)),
    );
  });
});
