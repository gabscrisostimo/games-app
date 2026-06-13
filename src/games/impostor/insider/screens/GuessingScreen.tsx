import { useCallback, useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { useCountdown } from '../../../../shell/useCountdown';
import type { SessionState } from '../types';
import { ui } from '../ui';

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
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead200}>
          {master?.name ?? 'O Mestre'} responde sim/não às perguntas do grupo.
        </p>
        <ActionButton variant="positive" onClick={onStart}>
          Começar contagem
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenFull}>
      <span className={ui.timer}>{remaining}s</span>

      <div className={ui.buttonCol}>
        <ActionButton variant="positive" onClick={onGuessed}>
          Adivinharam!
        </ActionButton>
        <button
          className={ui.peekBtn}
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
