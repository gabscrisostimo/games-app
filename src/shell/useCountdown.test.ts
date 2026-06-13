// src/shell/useCountdown.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calcula segundos restantes a partir do timestamp', () => {
    const now = Date.now();
    const { result } = renderHook(() => useCountdown(now + 60_000, () => {}));
    expect(result.current).toBe(60);
  });

  it('chama onExpire quando o tempo chega a zero', () => {
    const now = Date.now();
    const onExpire = vi.fn();
    renderHook(() => useCountdown(now + 1_000, onExpire));
    vi.advanceTimersByTime(1_200);
    expect(onExpire).toHaveBeenCalled();
  });
});
