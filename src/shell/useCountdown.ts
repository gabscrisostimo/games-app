// src/shell/useCountdown.ts
import { useEffect, useRef, useState } from 'react';

export function useCountdown(endsAt: number | null, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() =>
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    expiredRef.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setRemaining(Math.ceil(ms / 1000));
      if (ms <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
        return;
      }
      timer = setTimeout(tick, 200);
    };
    tick();
    return () => clearTimeout(timer);
  }, [endsAt, onExpire]);

  return remaining;
}
