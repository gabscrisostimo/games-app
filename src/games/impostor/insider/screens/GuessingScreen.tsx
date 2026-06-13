import { useCallback, useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { useCountdown } from '../../../../shell/useCountdown';
import type { SessionState } from '../types';

export function GuessingScreen({
  state,
  onStart,
  onGuessed,
  onExpire,
}: {
  state: SessionState;
  onStart: () => void;
  onGuessed: () => void;
  onExpire: () => void;
}) {
  const [peek, setPeek] = useState(false);
  const stableExpire = useCallback(onExpire, [onExpire]);
  const remaining = useCountdown(state.round.endsAt, stableExpire);
  const master = state.config.players.find((p) => p.id === state.round.masterId);

  if (state.round.endsAt === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 p-4 text-center">
        <p className="text-xl text-slate-200">
          {master?.name ?? 'O Mestre'} responde sim/não às perguntas do grupo.
        </p>
        <ActionButton variant="positive" onClick={onStart}>
          Começar contagem
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-between p-4">
      <span className="mt-8 text-7xl font-extrabold tabular-nums text-white">{remaining}s</span>

      <div className="flex w-full flex-col gap-3">
        <ActionButton variant="positive" onClick={onGuessed}>
          Adivinharam!
        </ActionButton>
        <button
          className="w-full rounded-2xl bg-slate-700 py-4 text-lg font-semibold text-white select-none"
          onPointerDown={() => setPeek(true)}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
        >
          {peek ? state.round.word : 'Segure para ver a palavra (Mestre)'}
        </button>
      </div>
    </div>
  );
}
